import { Patch } from './types/patch.js';
import { parseJsonPath } from './utils/pathUtils.js';
import { Schema, ArraySchema } from './types/schema.js';
import {
    getSchemaForPath,
    isObject,
    hasObjectItemsWithPk,
    getPrimaryKeyField,
} from './utils/schemaUtils.js';
import { deepClone } from './utils/deepClone.js';

/**
 * 主键索引缓存，用于加速数组元素查找
 * 键为数组的引用标识，值为主键到索引的 Map
 */
type PkIndexCache = WeakMap<unknown[], Map<string, number>>;

/**
 * 为数组建立主键索引
 */
const buildPkIndex = (array: unknown[], pkField: string): Map<string, number> => {
    const index = new Map<string, number>();
    for (let i = 0; i < array.length; i++) {
        const item = array[i];
        if (isObject(item) && pkField in item) {
            index.set(String(item[pkField]), i);
        }
    }
    return index;
};

/**
 * 获取或创建数组的主键索引
 */
const getPkIndex = (
    cache: PkIndexCache,
    array: unknown[],
    pkField: string
): Map<string, number> => {
    let index = cache.get(array);
    if (!index) {
        index = buildPkIndex(array, pkField);
        cache.set(array, index);
    }
    return index;
};

/**
 * 使索引缓存失效（当数组结构变化时调用）
 */
const invalidatePkIndex = (cache: PkIndexCache, array: unknown[]): void => {
    cache.delete(array);
};

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
        // 优化：只在开始时克隆一次，后续就地修改
        let state: unknown = deepClone(JSON.parse(sourceJson));
        // 创建主键索引缓存
        const pkIndexCache: PkIndexCache = new WeakMap();

        for (const patch of patches) {
            const newState = applyPatchInPlace(state, patch, schema, pkIndexCache);
            // 如果返回了新状态（根节点替换），则更新 state
            if (newState !== undefined) {
                state = newState;
            }
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
 * 将单个补丁就地应用到状态对象（不克隆）
 *
 * @param state - 当前状态（会被修改）
 * @param patch - 补丁对象
 * @param schema - 数据结构模式
 * @param pkIndexCache - 主键索引缓存
 * @returns 仅在根节点替换时返回新状态，其他情况返回 undefined
 */
const applyPatchInPlace = (
    state: unknown,
    patch: Patch,
    schema: Schema,
    pkIndexCache: PkIndexCache
): unknown | undefined => {
    const { op, path, value } = patch;
    const pathComponents = parseJsonPath(path);

    // 处理空路径的情况（整个文档替换）
    if (pathComponents.length === 0) {
        return op === 'remove' ? null : value;
    }

    switch (op) {
        case 'add':
            modifyAtPath(state, pathComponents, schema, pkIndexCache, (parent, key) => {
                if (Array.isArray(parent)) {
                    const arraySchema = getSchemaForPath(schema, pathComponents.slice(0, -1));
                    if (!arraySchema || arraySchema.$type !== 'array') {
                        throw new Error(
                            `Schema mismatch: expected array schema for path '${path}'`
                        );
                    }

                    if (isObject(value) && hasObjectItemsWithPk(arraySchema)) {
                        const pkField = getPrimaryKeyField(arraySchema);
                        if (pkField && pkField in value) {
                            const index = getOrCreateArrayIndexWithCache(
                                parent,
                                String(value[pkField]),
                                arraySchema,
                                pkIndexCache
                            );
                            parent[index] = value;
                            // 更新索引缓存
                            const pkIndex = pkIndexCache.get(parent);
                            if (pkIndex) {
                                pkIndex.set(String(value[pkField]), index);
                            }
                        } else {
                            parent.push(value);
                            invalidatePkIndex(pkIndexCache, parent);
                        }
                    } else {
                        parent[
                            findInsertionIndexWithCache(parent, key, arraySchema, pkIndexCache)
                        ] = value;
                    }
                } else if (isObject(parent)) {
                    const fieldSchema = getSchemaForPath(schema, pathComponents);

                    if (fieldSchema && fieldSchema.$type === 'array') {
                        if (!parent[key] || !Array.isArray(parent[key])) {
                            parent[key] = [];
                        }

                        if (isObject(value) && hasObjectItemsWithPk(fieldSchema)) {
                            const array = parent[key] as unknown[];
                            const pkField = getPrimaryKeyField(fieldSchema);
                            let index;
                            if (pkField && pkField in value) {
                                index = getOrCreateArrayIndexWithCache(
                                    array,
                                    String(value[pkField]),
                                    fieldSchema,
                                    pkIndexCache
                                );
                            } else {
                                array.push(value);
                                index = array.length - 1;
                            }
                            array[index] = value;
                            // 更新索引缓存
                            if (pkField && pkField in value) {
                                const pkIndex = pkIndexCache.get(array);
                                if (pkIndex) {
                                    pkIndex.set(String(value[pkField]), index);
                                }
                            }
                        } else {
                            (parent[key] as unknown[]).push(value);
                        }
                    } else {
                        parent[key] = value;
                    }
                }
            });
            break;

        case 'remove':
            modifyAtPath(state, pathComponents, schema, pkIndexCache, (parent, key) => {
                if (Array.isArray(parent)) {
                    const arraySchema = getSchemaForPath(schema, pathComponents.slice(0, -1));
                    if (!arraySchema || arraySchema.$type !== 'array') {
                        throw new Error(
                            `Schema mismatch: expected array schema for path '${path}'`
                        );
                    }
                    const index = findArrayIndexWithCache(parent, key, arraySchema, pkIndexCache);
                    if (index !== -1) {
                        parent.splice(index, 1);
                        // 删除后索引失效，需要重建
                        invalidatePkIndex(pkIndexCache, parent);
                    }
                } else if (isObject(parent)) {
                    delete parent[key];
                }
            });
            break;

        case 'replace':
            modifyAtPath(state, pathComponents, schema, pkIndexCache, (parent, key) => {
                if (Array.isArray(parent)) {
                    const arraySchema = getSchemaForPath(schema, pathComponents.slice(0, -1));
                    if (!arraySchema || arraySchema.$type !== 'array') {
                        throw new Error(
                            `Schema mismatch: expected array schema for path '${path}'`
                        );
                    }
                    const index = getOrCreateArrayIndexWithCache(
                        parent,
                        key,
                        arraySchema,
                        pkIndexCache
                    );
                    parent[index] = value;
                } else if (isObject(parent)) {
                    parent[key] = value;
                }
            });
            break;

        case 'move': {
            const { from } = patch;
            if (!from) {
                throw new Error('Move operation requires a "from" field');
            }

            const fromComponents = parseJsonPath(from);
            let movedValue: unknown;

            // 1. 从源路径提取并移除值
            modifyAtPath(state, fromComponents, schema, pkIndexCache, (parent, key) => {
                if (Array.isArray(parent)) {
                    const arraySchema = getSchemaForPath(schema, fromComponents.slice(0, -1));
                    if (!arraySchema || arraySchema.$type !== 'array') {
                        throw new Error(
                            `Schema mismatch: expected array schema for from path '${from}'`
                        );
                    }
                    const index = findArrayIndexWithCache(parent, key, arraySchema, pkIndexCache);
                    if (index === -1) {
                        throw new Error(`Source path '${from}' does not exist for move operation`);
                    }
                    movedValue = parent[index];
                    parent.splice(index, 1);
                    invalidatePkIndex(pkIndexCache, parent);
                } else if (isObject(parent)) {
                    if (!(key in parent)) {
                        throw new Error(`Source path '${from}' does not exist for move operation`);
                    }
                    movedValue = parent[key];
                    delete parent[key];
                }
            });

            // 2. 将值添加到目标路径
            if (path.endsWith('/-')) {
                const parentPath = path.slice(0, -2);
                const parentComponents = parentPath ? parseJsonPath(parentPath) : [];
                modifyAtPath(state, [...parentComponents, '-'], schema, pkIndexCache, parent => {
                    if (Array.isArray(parent)) {
                        parent.push(movedValue);
                    }
                });
            } else {
                modifyAtPath(state, pathComponents, schema, pkIndexCache, (parent, key) => {
                    if (Array.isArray(parent)) {
                        const arraySchema = getSchemaForPath(schema, pathComponents.slice(0, -1));
                        if (!arraySchema || arraySchema.$type !== 'array') {
                            throw new Error(
                                `Schema mismatch: expected array schema for path '${path}'`
                            );
                        }

                        const numericIndex = parseInt(key, 10);
                        if (!isNaN(numericIndex) && numericIndex === 0) {
                            parent.unshift(movedValue);
                            invalidatePkIndex(pkIndexCache, parent);
                        } else {
                            const targetIndex = findArrayIndexWithCache(
                                parent,
                                key,
                                arraySchema,
                                pkIndexCache
                            );
                            if (targetIndex !== -1) {
                                parent.splice(targetIndex + 1, 0, movedValue);
                                invalidatePkIndex(pkIndexCache, parent);
                            } else {
                                parent.push(movedValue);
                            }
                        }
                    } else if (isObject(parent)) {
                        parent[key] = movedValue;
                    }
                });
            }
            break;
        }

        default:
            throw new Error(`Unsupported operation: ${op}`);
    }
};

/**
 * 在数组中查找适合插入的索引位置（使用缓存）
 */
const findInsertionIndexWithCache = (
    array: unknown[],
    key: string,
    schema: ArraySchema,
    cache: PkIndexCache
): number => {
    const index = findArrayIndexWithCache(array, key, schema, cache);
    return index !== -1 ? index : array.length;
};

/**
 * 在数组中查找项目的索引（使用主键索引缓存）
 */
const findArrayIndexWithCache = (
    array: unknown[],
    key: string,
    schema: ArraySchema,
    cache: PkIndexCache
): number => {
    const pkField = getPrimaryKeyField(schema);

    if (pkField) {
        // 使用主键索引缓存进行 O(1) 查找
        const pkIndex = getPkIndex(cache, array, pkField);
        const cachedIndex = pkIndex.get(key);
        if (cachedIndex !== undefined && cachedIndex < array.length) {
            // 验证缓存的索引是否仍然有效
            const item = array[cachedIndex];
            if (isObject(item) && String(item[pkField]) === key) {
                return cachedIndex;
            }
            // 缓存失效，重建索引
            cache.delete(array);
            return findArrayIndexWithCache(array, key, schema, cache);
        }
        return -1;
    }

    // 无主键，尝试直接使用索引
    const index = parseInt(key, 10);
    return isNaN(index) ? -1 : Math.min(Math.max(0, index), array.length - 1);
};

/**
 * 在数组中查找或创建项目，返回其索引（使用缓存）
 */
const getOrCreateArrayIndexWithCache = (
    array: unknown[],
    key: string,
    schema: ArraySchema,
    cache: PkIndexCache
): number => {
    const index = findArrayIndexWithCache(array, key, schema, cache);
    if (index !== -1) {
        return index;
    }

    const pkField = getPrimaryKeyField(schema);
    if (pkField) {
        const newItem = { [pkField]: key };
        array.push(newItem);
        // 更新缓存
        const pkIndex = cache.get(array);
        if (pkIndex) {
            pkIndex.set(key, array.length - 1);
        }
        return array.length - 1;
    }

    const numIndex = parseInt(key, 10);
    if (!isNaN(numIndex) && numIndex >= 0) {
        if (numIndex >= array.length) {
            for (let i = array.length; i < numIndex; i++) {
                array.push(null);
            }
            array.push(null);
        }
        return numIndex;
    }

    array.push(null);
    return array.length - 1;
};

/**
 * 在指定路径修改对象，使用迭代而非递归方式
 */
const modifyAtPath = (
    root: unknown,
    pathComponents: ReadonlyArray<string>,
    schema: Schema,
    pkIndexCache: PkIndexCache,
    modifierFn: (parent: Record<string, unknown> | unknown[], key: string) => void
): void => {
    if (pathComponents.length === 0) {
        return;
    }

    let current = root;
    let currentSchema: Schema | undefined = schema;
    const lastIndex = pathComponents.length - 1;

    for (let i = 0; i < lastIndex; i++) {
        const component = pathComponents[i];

        if (!currentSchema) {
            throw new Error(`Schema not found for path component: ${component}`);
        }

        if (currentSchema.$type === 'object') {
            if (!isObject(current)) {
                throw new Error(`Expected object at path component: ${component}`);
            }

            const fieldSchema = currentSchema.$fields[component];
            if (!fieldSchema) {
                throw new Error(`Schema field not found: ${component}`);
            }

            if (current[component] === undefined) {
                current[component] = fieldSchema.$type === 'array' ? [] : {};
            }

            current = current[component];
            currentSchema = fieldSchema as Schema;
        } else if (currentSchema.$type === 'array') {
            if (!Array.isArray(current)) {
                throw new Error(`Expected array at path component: ${component}`);
            }

            const arraySchema: ArraySchema = currentSchema;
            const index = getOrCreateArrayIndexWithCache(
                current,
                component,
                arraySchema,
                pkIndexCache
            );

            if (current[index] === undefined) {
                if (isObject(arraySchema.$item)) {
                    const itemType = arraySchema.$item.$type;
                    current[index] = itemType === 'object' ? {} : null;
                } else {
                    current[index] = null;
                }
            }

            current = current[index];
            if (isObject(arraySchema.$item) && arraySchema.$item.$type === 'object') {
                currentSchema = arraySchema.$item;
            } else {
                currentSchema = undefined;
            }
        } else {
            throw new Error(
                `Unexpected schema type: ${
                    currentSchema ? (currentSchema as any).$type : 'unknown'
                }`
            );
        }
    }

    const lastComponent = pathComponents[lastIndex];
    modifierFn(current as Record<string, unknown> | unknown[], lastComponent);
};

// ============ 保留原有的独立函数以支持其他可能的调用 ============

/**
 * 在数组中查找适合插入的索引位置
 */
const findInsertionIndex = (array: unknown[], key: string, schema: ArraySchema): number => {
    const index = findArrayIndex(array, key, schema);
    return index !== -1 ? index : array.length;
};

/**
 * 在数组中查找项目的索引
 */
const findArrayIndex = (array: unknown[], key: string, schema: ArraySchema): number => {
    const pkField = getPrimaryKeyField(schema);

    if (pkField) {
        return array.findIndex(
            item => isObject(item) && item[pkField] !== undefined && String(item[pkField]) === key
        );
    }

    const index = parseInt(key, 10);
    return isNaN(index) ? -1 : Math.min(Math.max(0, index), array.length - 1);
};

/**
 * 在数组中查找或创建项目，返回其索引
 */
const getOrCreateArrayIndex = (array: unknown[], key: string, schema: ArraySchema): number => {
    const index = findArrayIndex(array, key, schema);
    if (index !== -1) {
        return index;
    }

    const pkField = getPrimaryKeyField(schema);
    if (pkField) {
        const newItem = { [pkField]: key };
        array.push(newItem);
        return array.length - 1;
    }

    const numIndex = parseInt(key, 10);
    if (!isNaN(numIndex) && numIndex >= 0) {
        if (numIndex >= array.length) {
            for (let i = array.length; i < numIndex; i++) {
                array.push(null);
            }
            array.push(null);
        }
        return numIndex;
    }

    array.push(null);
    return array.length - 1;
};

// 导出用于测试的辅助函数（可选）
export { findArrayIndex, getOrCreateArrayIndex, findInsertionIndex };
