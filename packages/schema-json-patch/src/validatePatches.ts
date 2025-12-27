import {
    Patch,
    ConflictDetail,
    ConflictResolutions,
    CustomConflictResolution,
    ConflictOptionDetail,
} from './types/patch.js';
import { Schema } from './types/schema.js';
import { isObject, getSchemaForPath } from './utils/schemaUtils.js';
import { detectConflicts } from './detectConflicts.js';
import { parseJsonPath } from './utils/pathUtils.js';

/**
 * 验证结果类型
 */
export type ValidationResult = {
    readonly isValid: boolean;
    readonly errors: string[];
};

/**
 * 验证JSON字符串是否有效
 * @param jsonString JSON字符串
 * @returns 验证结果
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
 * 验证补丁数组是否有效
 * @param patches 补丁数组
 * @returns 验证结果
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

        // 验证补丁操作类型
        if (!patch.op || !['add', 'remove', 'replace'].includes(patch.op)) {
            errors.push(`Patch #${index} has invalid operation type: ${patch.op}`);
        }

        // 验证补丁路径
        if (!patch.path || typeof patch.path !== 'string') {
            errors.push(`Patch #${index} has invalid path`);
        } else if (!patch.path.startsWith('/') && patch.path !== '') {
            errors.push(`Patch #${index} path must start with / or be empty`);
        }

        // 验证补丁值
        if ((patch.op === 'add' || patch.op === 'replace') && patch.value === undefined) {
            errors.push(`Patch #${index} ${patch.op} operation must include a value`);
        }

        // 验证哈希值
        if (!patch.hash || typeof patch.hash !== 'string') {
            errors.push(`Patch #${index} must have a valid hash string`);
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
    };
};

/**
 * 验证补丁组数组是否有效
 * @param patchGroups 补丁组数组
 * @returns 验证结果
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
 * 验证解决方案是否有效
 * @param conflicts 冲突详情
 * @param resolutions 冲突解决方案数组
 * @returns 验证结果
 */
export const validateResolutions = (
    conflicts: ReadonlyArray<ConflictDetail>,
    resolutions: ConflictResolutions
): ValidationResult => {
    const errors: string[] = [];

    if (!Array.isArray(conflicts)) {
        errors.push('Conflicts must be an array');
        return { isValid: false, errors };
    }

    if (!Array.isArray(resolutions)) {
        errors.push('Resolutions must be an array');
        return { isValid: false, errors };
    }

    // 检查每个解决方案是否有合法的路径和选中的哈希值
    resolutions.forEach((resolution, index) => {
        if (!resolution.path || typeof resolution.path !== 'string') {
            errors.push(`Resolution #${index} has invalid path`);
            return;
        }

        if (!resolution.selectedHash || typeof resolution.selectedHash !== 'string') {
            errors.push(`Resolution #${index} has invalid selectedHash`);
            return;
        }

        // 查找对应的冲突
        const conflict = conflicts.find(c => c.path === resolution.path);
        if (!conflict) {
            errors.push(
                `Resolution #${index} references a path "${resolution.path}" that doesn't exist in conflicts`
            );
            return;
        }

        // 验证选中的哈希是否在冲突选项中
        if (
            !conflict.options.some(
                (opt: ConflictOptionDetail) => opt.hash === resolution.selectedHash
            )
        ) {
            errors.push(
                `Resolution #${index} selects a hash "${resolution.selectedHash}" ` +
                    `that is not an option for conflict at path "${resolution.path}"`
            );
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
    };
};

/**
 * 验证应用解决方案后是否仍存在冲突
 * @param patches 原始补丁组
 * @param conflicts 冲突详情
 * @param resolutions 解决方案
 * @param customResolutions 自定义解决方案
 * @returns 验证结果
 */
export const validateResolvedConflicts = (
    patches: ReadonlyArray<ReadonlyArray<Patch>>,
    conflicts: ReadonlyArray<ConflictDetail>,
    resolutions: ConflictResolutions,
    customResolutions: ReadonlyArray<CustomConflictResolution> = []
): ValidationResult => {
    const errors: string[] = [];

    // 首先验证解决方案是否有效
    const resolutionsValid = validateResolutions(conflicts, resolutions);
    if (!resolutionsValid.isValid) {
        return resolutionsValid;
    }

    // 创建已解决冲突的补丁集合
    const allPatches = patches.flat();
    const resolvedPatchSet = new Set<Patch>();
    const conflictPaths = new Set<string>();

    // 收集所有冲突路径
    conflicts.forEach(conflict => {
        conflictPaths.add(conflict.path);

        // 找出选中的哈希值
        let selectedHash = conflict.options[0]?.hash; // 默认选第一个

        // 查找是否有针对此路径的解决方案
        const resolution = resolutions.find(res => res.path === conflict.path);
        if (resolution && conflict.options.some(opt => opt.hash === resolution.selectedHash)) {
            selectedHash = resolution.selectedHash;
        }

        // 找到匹配哈希值的补丁
        const matchingPatch = allPatches.find(patch => patch.hash === selectedHash);

        if (matchingPatch) {
            resolvedPatchSet.add(matchingPatch);
        }
    });

    // 添加非冲突补丁
    const nonConflictPatches = allPatches.filter(patch => !conflictPaths.has(patch.path));
    const resolvedPatches = [
        ...nonConflictPatches,
        ...Array.from(resolvedPatchSet),
        ...(customResolutions?.map(cr => cr.patch) || []),
    ];

    // Check if there are still conflicts after resolution
    const remainingConflicts = detectConflicts([resolvedPatches]);

    if (remainingConflicts.length > 0) {
        errors.push(
            `There are still ${remainingConflicts.length} conflicts after applying resolutions`
        );

        remainingConflicts.forEach(conflict => {
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

                // For add, validate that the target path does NOT already exist
                // This enforces strict "add" semantics - add should only create new entries
                if (pathExists(state, pathComponents, schema)) {
                    errors.push(
                        `Path "${patch.path}" already exists, cannot perform add operation (use replace instead)`
                    );
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
