import { Patch, ConflictDetail, ConflictResolutions, CustomResolution } from './types/patch';
import { Schema } from './types/schema';
import { isObject } from './utils/isObject';
import { detectConflicts } from './detectConflicts';
import { parseJsonPath } from './utils/pathUtils';

/**
 * Validation result type
 */
export type ValidationResult = {
    readonly isValid: boolean;
    readonly errors: string[];
};

/**
 * Validate if a JSON string is valid
 * @param jsonString JSON string
 * @returns Validation result
 */
export const validateJson = (jsonString: string): ValidationResult => {
    const errors: string[] = [];

    try {
        JSON.parse(jsonString);
    } catch (error) {
        if (error instanceof Error) {
            errors.push(`JSON parse error: ${error.message}`);
        } else {
            errors.push('JSON parse error');
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};

/**
 * Validate if a patch array is valid
 * @param patches Patch array
 * @returns Validation result
 */
export const validatePatches = (patches: ReadonlyArray<Patch>): ValidationResult => {
    const errors: string[] = [];

    if (!Array.isArray(patches)) {
        errors.push('Patches must be an array');
        return { isValid: false, errors };
    }

    patches.forEach((patch, index) => {
        if (!patch || typeof patch !== 'object') {
            errors.push(`Patch #${index} is not a valid object`);
            return;
        }

        // Validate patch operation type
        if (!patch.op || !['add', 'remove', 'replace'].includes(patch.op)) {
            errors.push(`Patch #${index} has invalid operation type: ${patch.op}`);
        }

        // Validate patch path
        if (!patch.path || typeof patch.path !== 'string') {
            errors.push(`Patch #${index} has invalid path`);
        } else if (!patch.path.startsWith('/') && patch.path !== '') {
            errors.push(`Patch #${index} path must start with / or be empty`);
        }

        // Validate patch value
        if ((patch.op === 'add' || patch.op === 'replace') && patch.value === undefined) {
            errors.push(`Patch #${index} ${patch.op} operation must include a value`);
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
    };
};

/**
 * Validate if a patch group array is valid
 * @param patchGroups Patch group array
 * @returns Validation result
 */
export const validatePatchGroups = (
    patchGroups: ReadonlyArray<ReadonlyArray<Patch>>
): ValidationResult => {
    const errors: string[] = [];

    if (!Array.isArray(patchGroups)) {
        errors.push('Patch groups must be an array');
        return { isValid: false, errors };
    }

    patchGroups.forEach((group, groupIndex) => {
        if (!Array.isArray(group)) {
            errors.push(`Patch group #${groupIndex} is not a valid array`);
            return;
        }

        const groupResult = validatePatches(group);
        if (!groupResult.isValid) {
            errors.push(`Patch group #${groupIndex} contains invalid patches:`);
            groupResult.errors.forEach(error => {
                errors.push(`  - ${error}`);
            });
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
    };
};

/**
 * Validate if resolutions are valid
 * @param conflicts Conflict details
 * @param resolutions Resolutions
 * @param customResolutions Custom resolutions
 * @returns Validation result
 */
export const validateResolutions = (
    conflicts: ReadonlyArray<ConflictDetail>,
    resolutions: ConflictResolutions,
    customResolutions: ReadonlyArray<CustomResolution> = []
): ValidationResult => {
    const errors: string[] = [];

    if (!Array.isArray(conflicts)) {
        errors.push('Conflicts must be an array');
        return { isValid: false, errors };
    }

    if (!isObject(resolutions)) {
        errors.push('Resolutions must be an object');
        return { isValid: false, errors };
    }

    // Validate that each conflict has a corresponding resolution
    conflicts.forEach((conflict, index) => {
        const resolutionKey = index.toString();

        if (!(resolutionKey in resolutions)) {
            errors.push(`Conflict #${index} is missing a resolution`);
        } else {
            const resolutionValue = resolutions[resolutionKey];

            if (
                typeof resolutionValue !== 'number' ||
                resolutionValue < 0 ||
                resolutionValue >= conflict.operations.length
            ) {
                errors.push(`Conflict #${index} has invalid resolution ${resolutionValue}`);
            }
        }
    });

    // Validate custom resolutions
    if (customResolutions && Array.isArray(customResolutions)) {
        customResolutions.forEach((resolution, index) => {
            if (!resolution || !isObject(resolution)) {
                errors.push(`Custom resolution #${index} is not a valid object`);
                return;
            }

            if (!resolution.path || typeof resolution.path !== 'string') {
                errors.push(`Custom resolution #${index} is missing a valid path`);
            }

            const patchResult = validatePatches([resolution.patch]);
            if (!patchResult.isValid) {
                errors.push(`Custom resolution #${index} contains invalid patch:`);
                patchResult.errors.forEach(error => {
                    errors.push(`  - ${error}`);
                });
            }
        });
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};

/**
 * Validate if there are still conflicts after applying resolutions
 * @param patches Original patch groups
 * @param conflicts Conflict details
 * @param resolutions Resolutions
 * @param customResolutions Custom resolutions
 * @returns Validation result
 */
export const validateResolvedConflicts = (
    patches: ReadonlyArray<ReadonlyArray<Patch>>,
    conflicts: ReadonlyArray<ConflictDetail>,
    resolutions: ConflictResolutions,
    customResolutions: ReadonlyArray<CustomResolution> = []
): ValidationResult => {
    const errors: string[] = [];

    // First validate that resolutions are valid
    const resolutionsValid = validateResolutions(conflicts, resolutions, customResolutions);
    if (!resolutionsValid.isValid) {
        return resolutionsValid;
    }

    // Create a new patch set with resolved patches
    const allPatches = patches.flat();
    const excludedPatchIndices = new Set<number>();

    // Mark patches to exclude
    conflicts.forEach((conflict, index) => {
        const selectedOperationIndex = resolutions[index.toString()] ?? 0;

        conflict.operations.forEach((op, opIndex) => {
            if (opIndex !== selectedOperationIndex) {
                excludedPatchIndices.add(op.index);
            }
        });
    });

    // Collect patches to apply
    const resolvedPatches = allPatches.filter((_, index) => !excludedPatchIndices.has(index));

    // Add custom resolutions
    const finalPatches = [...resolvedPatches, ...(customResolutions?.map(cr => cr.patch) || [])];

    // Check if there are still conflicts after resolution
    const remainingConflicts = detectConflicts([finalPatches]);

    if (remainingConflicts.length > 0) {
        errors.push(
            `There are still ${remainingConflicts.length} conflicts after applying resolutions`
        );

        remainingConflicts.forEach((conflict, _index) => {
            errors.push(`  - Path ${conflict.path} has unresolved conflicts`);
        });
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};

/**
 * Validate if JSON patch operations can be applied to a JSON
 * @param jsonString JSON string
 * @param patches Patch array
 * @param schema Data structure schema
 * @returns Validation result
 */
export const validatePatchApplication = (
    jsonString: string,
    patches: ReadonlyArray<Patch>,
    schema: Schema
): ValidationResult => {
    const errors: string[] = [];

    // First validate JSON and patches
    const jsonValid = validateJson(jsonString);
    if (!jsonValid.isValid) {
        return jsonValid;
    }

    const patchesValid = validatePatches(patches);
    if (!patchesValid.isValid) {
        return patchesValid;
    }

    // Validate Schema
    if (!schema || !isObject(schema)) {
        errors.push('Schema is not a valid object');
        return { isValid: false, errors };
    }

    if (!('$type' in schema) || (schema.$type !== 'object' && schema.$type !== 'array')) {
        errors.push('Schema must have a valid $type of either "object" or "array"');
        return { isValid: false, errors };
    }

    try {
        const state = JSON.parse(jsonString);

        // Validate each patch operation against the current state
        for (const patch of patches) {
            // Skip empty paths which target the root
            if (patch.path === '') {
                continue;
            }

            // Parse the path components
            const pathComponents = parseJsonPath(patch.path);

            // Validate operation-specific requirements
            if (patch.op === 'remove' || patch.op === 'replace') {
                // For remove and replace, the path must exist in the current state
                if (!pathExists(state, pathComponents, schema)) {
                    errors.push(`Path "${patch.path}" does not exist for ${patch.op} operation`);
                }
            } else if (patch.op === 'add') {
                // For add, validate that the parent path exists (except when adding to root)
                if (pathComponents.length > 1) {
                    const parentComponents = pathComponents.slice(0, -1);
                    if (!pathExists(state, parentComponents, schema)) {
                        errors.push(
                            `Parent path does not exist for add operation at "${patch.path}"`
                        );
                    }
                }

                // Validate value type according to schema
                const valueSchema = getSchemaForPath(schema, pathComponents);
                if (valueSchema && !validateValueAgainstSchema(patch.value, valueSchema)) {
                    errors.push(
                        `Value for add operation at "${patch.path}" does not match schema type`
                    );
                }
            }
        }
    } catch (error) {
        if (error instanceof Error) {
            errors.push(`Patch application validation error: ${error.message}`);
        } else {
            errors.push('Patch application validation error');
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};

/**
 * Check if a path exists in the given state
 * @param state Current state
 * @param pathComponents Path components
 * @param schema Schema
 * @returns Whether path exists
 */
const pathExists = (
    state: unknown,
    pathComponents: ReadonlyArray<string>,
    schema: Schema
): boolean => {
    if (!pathComponents.length) {
        return true;
    }

    let current: any = state;

    for (const component of pathComponents) {
        if (Array.isArray(current)) {
            // Handle array by index or by primary key
            if (component.match(/^\d+$/)) {
                // Numeric index
                const index = parseInt(component, 10);
                if (index >= current.length) {
                    return false;
                }
                current = current[index];
            } else {
                // Primary key lookup
                if (
                    !schema ||
                    schema.$type !== 'array' ||
                    !schema.$item ||
                    schema.$item.$type !== 'object'
                ) {
                    return false;
                }

                const pkField = schema.$item.$pk;
                const item = current.find((i: any) => isObject(i) && i[pkField] === component);
                if (!item) {
                    return false;
                }
                current = item;
            }
        } else if (isObject(current)) {
            // Handle object property
            if (!(component in current)) {
                return false;
            }
            current = current[component];
        } else {
            // Cannot navigate further
            return false;
        }
    }

    return true;
};

/**
 * Get schema for a specific path
 * @param schema Base schema
 * @param pathComponents Path components
 * @returns Schema for the path or undefined
 */
const getSchemaForPath = (
    schema: Schema,
    pathComponents: ReadonlyArray<string>
): Schema | undefined => {
    if (!pathComponents.length) {
        return schema;
    }

    let currentSchema = schema;

    for (const component of pathComponents) {
        if (!currentSchema) {
            return undefined;
        }

        if (currentSchema.$type === 'object' && '$fields' in currentSchema) {
            // Navigate object field
            currentSchema = currentSchema.$fields[component] as Schema;
        } else if (currentSchema.$type === 'array' && '$item' in currentSchema) {
            // For arrays, continue with the item schema
            currentSchema = currentSchema.$item as Schema;
        } else {
            // Cannot navigate further
            return undefined;
        }
    }

    return currentSchema;
};

/**
 * Validate a value against a schema
 * @param value Value to validate
 * @param schema Schema to validate against
 * @returns Whether the value is valid according to schema
 */
const validateValueAgainstSchema = (value: unknown, schema: Schema): boolean => {
    if (!schema) {
        return true; // No schema, assume valid
    }

    if (!('$type' in schema)) {
        return true; // Invalid schema, assume valid
    }

    const schemaType = schema.$type;

    if (schemaType === 'object') {
        return isObject(value);
    } else if (schemaType === 'array') {
        return Array.isArray(value);
    } else {
        // Handle primitive types
        switch (schemaType) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number';
            case 'boolean':
                return typeof value === 'boolean';
            case 'null':
                return value === null;
            default:
                return true; // Unknown type, assume valid
        }
    }
};
