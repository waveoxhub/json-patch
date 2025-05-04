import { Patch } from './types/patch';
import { parseJsonPath } from './utils/pathUtils';
import { deepClone } from './utils/deepClone';
import { Schema } from './types/schema';

/**
 * 将补丁应用到JSON状态
 *
 * @param sourceJson - 源JSON字符串
 * @param patches - 补丁数组
 * @param schema - 数据结构模式
 * @returns 应用补丁后的JSON字符串
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
 * 将单个补丁应用到状态对象
 *
 * @param state - 当前状态
 * @param patch - 补丁对象
 * @param schema - 数据结构模式
 * @returns 更新后的状态
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
 * 检查值是否为非空对象
 */
const isObject = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * 获取数组成员的主键字段名
 *
 * @param schema - 可能是数组模式的结构
 * @returns 主键字段名
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
 * 获取特定路径的子模式
 *
 * @param schema - 当前模式
 * @param component - 当前路径组件
 * @returns 子模式或undefined
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
 * 在数组中查找或创建项目
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
 * 处理添加操作
 *
 * @param state - 当前状态
 * @param pathComponents - 路径组件
 * @param value - 要添加的值
 * @param schema - 数据结构模式
 * @returns 更新后的状态
 */
const handleAdd = (
    state: unknown,
    pathComponents: ReadonlyArray<string>,
    value: unknown,
    schema: Schema
): unknown => {
    if (pathComponents.length === 0) {
        // 替换整个文档
        return value;
    }
    const result = deepClone(state);
    addToPath(result, pathComponents, value, schema);
    return result;
};

/**
 * 递归地将值添加到路径
 *
 * @param current - 当前对象
 * @param pathComponents - 剩余路径组件
 * @param value - 要添加的值
 * @param schema - 当前路径的模式
 */
const addToPath = (
    current: unknown,
    pathComponents: ReadonlyArray<string>,
    value: unknown,
    schema: Schema
): void => {
    const [head, ...tail] = pathComponents;

    if (tail.length === 0) {
        // 到达目标路径，添加值
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
 * 处理删除操作
 *
 * @param state - 当前状态
 * @param pathComponents - 路径组件
 * @param schema - 数据结构模式
 * @returns 更新后的状态
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
 * 从路径中移除值
 *
 * @param current - 当前对象
 * @param pathComponents - 路径组件
 * @param schema - 当前路径的模式
 * @returns 是否成功移除
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
 * 处理替换操作
 *
 * @param state - 当前状态
 * @param pathComponents - 路径组件
 * @param value - 新值
 * @param schema - 数据结构模式
 * @returns 更新后的状态
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
 * 在路径处替换值
 *
 * @param current - 当前对象
 * @param pathComponents - 路径组件
 * @param value - 新值
 * @param schema - 当前路径的模式
 * @returns 是否成功替换
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
