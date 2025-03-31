import { Patch } from './types/patch';
import { parseJsonPath } from './utils/pathUtils';
import { deepClone } from './utils/deepClone';
import { Schema } from './types/schema';

/**
 * Apply patches to JSON state
 *
 * @param sourceJson - Source JSON string
 * @param patches - Array of patches
 * @param schema - Data structure schema
 * @returns JSON string after applying patches
 */
export const applyPatches = (
    sourceJson: string,
    patches: ReadonlyArray<Patch>,
    schema: Schema
): string => {
    try {
        let state = JSON.parse(sourceJson);
        for (const patch of patches) {
            state = applyPatch(state, patch, schema);
        }
        return JSON.stringify(state);
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to apply patches: ${error.message}`);
        }
        throw error;
    }
};

/**
 * Apply a single patch to state object
 *
 * @param state - Current state
 * @param patch - Patch object
 * @param schema - Data structure schema
 * @returns Updated state
 */
const applyPatch = (state: unknown, patch: Patch, schema: Schema): unknown => {
    const { op, path, value } = patch;
    const pathComponents = parseJsonPath(path);

    switch (op) {
        case 'add':
            return handleAdd(state, pathComponents, value, schema);

        case 'remove':
            return handleRemove(state, pathComponents, schema);

        case 'replace':
            return handleReplace(state, pathComponents, value, schema);

        default:
            throw new Error(`Unsupported operation: ${op}`);
    }
};

/**
 * Check if value is a non-null object
 */
const isObject = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * Get primary key field name for array members
 *
 * @param schema - Structure that may be an array schema
 * @returns Primary key field name
 */
const getPrimaryKeyField = (schema: Schema): string => {
    if (!schema || !isObject(schema)) {
        throw new Error('Invalid schema: schema is not an object');
    }

    if (!('$type' in schema) || schema.$type !== 'array') {
        throw new Error('Invalid schema: not an array type');
    }

    if (!('$item' in schema) || !schema.$item || !isObject(schema.$item)) {
        throw new Error('Invalid schema: missing $item or $item is not an object');
    }

    if (!('$type' in schema.$item) || schema.$item.$type !== 'object') {
        throw new Error('Invalid schema: $item is not an object type');
    }

    if (!('$pk' in schema.$item)) {
        throw new Error('Invalid schema: missing primary key definition');
    }

    return schema.$item.$pk;
};

/**
 * Get sub-schema for a specific path
 *
 * @param schema - Current schema
 * @param component - Current path component
 * @returns Sub-schema or undefined
 */
const getSubSchema = (schema: Schema, component: string): Schema | undefined => {
    if (!schema || !isObject(schema)) return undefined;

    if ('$type' in schema) {
        const schemaType = schema.$type;

        if (
            schemaType === 'object' &&
            '$fields' in schema &&
            schema.$fields &&
            isObject(schema.$fields)
        ) {
            return component in schema.$fields ? (schema.$fields[component] as Schema) : undefined;
        } else if (schemaType === 'array' && '$item' in schema) {
            return schema.$item as Schema;
        }
    }

    return undefined;
};

/**
 * Find or create item in array
 */
const findOrCreateArrayItem = (
    array: unknown[],
    key: string,
    schema: Schema,
    shouldCreate = false
): [Record<string, unknown> | undefined, number] => {
    try {
        const primaryKey = getPrimaryKeyField(schema);

        const index = array.findIndex(
            item => isObject(item) && primaryKey in item && item[primaryKey] === key
        );

        if (index !== -1) {
            return [array[index] as Record<string, unknown>, index];
        }

        if (shouldCreate) {
            const newItem = { [primaryKey]: key } as Record<string, unknown>;
            array.push(newItem);
            return [newItem, array.length - 1];
        }

        return [undefined, -1];
    } catch (error) {
        throw new Error(
            `Failed to process array path ${key}: ${error instanceof Error ? error.message : String(error)}`
        );
    }
};

/**
 * Handle add operation
 *
 * @param state - Current state
 * @param pathComponents - Path components
 * @param value - Value to add
 * @param schema - Data structure schema
 * @returns Updated state
 */
const handleAdd = (
    state: unknown,
    pathComponents: ReadonlyArray<string>,
    value: unknown,
    schema: Schema
): unknown => {
    if (pathComponents.length === 0) {
        // Replace entire document
        return value;
    }
    const result = deepClone(state);
    addToPath(result, pathComponents, value, schema);
    return result;
};

/**
 * Recursively add value to path
 *
 * @param current - Current object
 * @param pathComponents - Remaining path components
 * @param value - Value to add
 * @param schema - Schema for current path
 */
const addToPath = (
    current: unknown,
    pathComponents: ReadonlyArray<string>,
    value: unknown,
    schema: Schema
): void => {
    const [head, ...tail] = pathComponents;

    if (tail.length === 0) {
        // Reached target path, add value
        if (Array.isArray(current)) {
            if (!schema) {
                throw new Error('Schema must be provided when processing array data');
            }

            const [, index] = findOrCreateArrayItem(current, head, schema, true);
            if (index !== -1) {
                current[index] = value;
            }
        } else if (isObject(current)) {
            current[head] = value;
        } else {
            throw new Error(`Cannot add to non-object or array: ${typeof current}`);
        }

        return;
    }

    // Get schema for next level
    const nextSchema = getSubSchema(schema, head);

    // Continue recursion to next level
    if (Array.isArray(current)) {
        if (!schema) {
            throw new Error('Schema must be provided when processing array data');
        }

        const [item] = findOrCreateArrayItem(current, head, schema, true);
        if (item) {
            addToPath(item, tail, value, nextSchema as Schema);
        }
    } else if (isObject(current)) {
        // Ensure child path exists
        if (!(head in current)) {
            current[head] = {};
        }

        addToPath(current[head], tail, value, nextSchema as Schema);
    } else {
        throw new Error(`Cannot navigate to non-object or array: ${typeof current}`);
    }
};

/**
 * Handle remove operation
 *
 * @param state - Current state
 * @param pathComponents - Path components
 * @param schema - Data structure schema
 * @returns Updated state
 */
const handleRemove = (
    state: unknown,
    pathComponents: ReadonlyArray<string>,
    schema: Schema
): unknown => {
    if (pathComponents.length === 0) {
        // Remove entire document
        return null;
    }
    const result = deepClone(state);
    removeFromPath(result, pathComponents, schema);

    return result;
};

/**
 * Recursively remove value from path
 *
 * @param current - Current object
 * @param pathComponents - Remaining path components
 * @param schema - Schema for current path
 * @returns Whether value is successfully removed
 */
const removeFromPath = (
    current: unknown,
    pathComponents: ReadonlyArray<string>,
    schema: Schema
): boolean => {
    const [head, ...tail] = pathComponents;

    if (tail.length === 0) {
        // Reached target path, remove value
        if (Array.isArray(current)) {
            if (!schema) {
                throw new Error('Schema must be provided when processing array data');
            }

            const [, index] = findOrCreateArrayItem(current, head, schema);
            if (index === -1) {
                return false;
            }

            // Remove matching array item
            current.splice(index, 1);
            return true;
        } else if (isObject(current)) {
            return delete current[head];
        } else {
            throw new Error(`Cannot remove from non-object or array: ${typeof current}`);
        }
    }

    // Get schema for next level
    const nextSchema = getSubSchema(schema, head);

    // Continue recursion to next level
    if (Array.isArray(current)) {
        if (!schema) {
            throw new Error('Schema must be provided when processing array data');
        }

        const [item] = findOrCreateArrayItem(current, head, schema);
        if (!item) {
            return false;
        }

        return removeFromPath(item, tail, nextSchema as Schema);
    } else if (isObject(current)) {
        if (!(head in current)) {
            return false;
        }

        return removeFromPath(current[head], tail, nextSchema as Schema);
    } else {
        throw new Error(`Cannot navigate to non-object or array: ${typeof current}`);
    }
};

/**
 * Handle replace operation
 *
 * @param state - Current state
 * @param pathComponents - Path components
 * @param value - Replacement value
 * @param schema - Data structure schema
 * @returns Updated state
 */
const handleReplace = (
    state: unknown,
    pathComponents: ReadonlyArray<string>,
    value: unknown,
    schema: Schema
): unknown => {
    if (pathComponents.length === 0) {
        // Replace entire document
        return value;
    }

    const result = deepClone(state);
    replaceAtPath(result, pathComponents, value, schema);
    return result;
};

/**
 * Recursively replace value at path
 *
 * @param current - Current object
 * @param pathComponents - Remaining path components
 * @param value - Replacement value
 * @param schema - Schema for current path
 * @returns Whether value is successfully replaced
 */
const replaceAtPath = (
    current: unknown,
    pathComponents: ReadonlyArray<string>,
    value: unknown,
    schema: Schema
): boolean => {
    const [head, ...tail] = pathComponents;

    if (tail.length === 0) {
        // Reached target path, replace value
        if (isObject(current)) {
            current[head] = value;
            return true;
        } else {
            throw new Error(`Cannot replace value in non-object: ${typeof current}`);
        }
    }

    // Get schema for next level
    const nextSchema = getSubSchema(schema, head);

    // Continue recursion to next level
    if (Array.isArray(current)) {
        if (!schema) {
            throw new Error('Schema must be provided when processing array data');
        }

        const [item] = findOrCreateArrayItem(current, head, schema, true);
        if (item) {
            return replaceAtPath(item, tail, value, nextSchema as Schema);
        }
        return false;
    } else if (isObject(current)) {
        if (!(head in current)) {
            current[head] = {};
        }

        return replaceAtPath(current[head], tail, value, nextSchema as Schema);
    } else {
        throw new Error(`Cannot navigate to non-object or array: ${typeof current}`);
    }
};
