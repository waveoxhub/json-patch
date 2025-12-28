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

    // 处理空路径的情况（整个文档）
    if (pathComponents.length === 0) {
        return op === 'remove' ? null : value;
    }

    const result = deepClone(state);

    switch (op) {
        case 'add':
            modifyAtPath(result, pathComponents, schema, (parent, key) => {
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
                            const index = getOrCreateArrayIndex(
                                parent,
                                String(value[pkField]),
                                arraySchema
                            );
                            parent[index] = value;
                        } else {
                            parent.push(value);
                        }
                    } else {
                        parent[findInsertionIndex(parent, key, arraySchema)] = value;
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
                                index = getOrCreateArrayIndex(
                                    array,
                                    String(value[pkField]),
                                    fieldSchema
                                );
                            } else {
                                array.push(value);
                                index = array.length - 1;
                            }
                            array[index] = value;
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
            modifyAtPath(result, pathComponents, schema, (parent, key) => {
                if (Array.isArray(parent)) {
                    const arraySchema = getSchemaForPath(schema, pathComponents.slice(0, -1));
                    if (!arraySchema || arraySchema.$type !== 'array') {
                        throw new Error(
                            `Schema mismatch: expected array schema for path '${path}'`
                        );
                    }
                    const index = findArrayIndex(parent, key, arraySchema);
                    if (index !== -1) {
                        parent.splice(index, 1);
                    }
                } else if (isObject(parent)) {
                    delete parent[key];
                }
            });
            break;

        case 'replace':
            modifyAtPath(result, pathComponents, schema, (parent, key) => {
                if (Array.isArray(parent)) {
                    const arraySchema = getSchemaForPath(schema, pathComponents.slice(0, -1));
                    if (!arraySchema || arraySchema.$type !== 'array') {
                        throw new Error(
                            `Schema mismatch: expected array schema for path '${path}'`
                        );
                    }
                    const index = getOrCreateArrayIndex(parent, key, arraySchema);
                    parent[index] = value;
                } else if (isObject(parent)) {
                    parent[key] = value;
                }
            });
            break;

        case 'move': {
            // move 操作：从 from 路径移除值，然后添加到 path 路径
            const { from } = patch;
            if (!from) {
                throw new Error('Move operation requires a "from" field');
            }

            const fromComponents = parseJsonPath(from);
            let movedValue: unknown;

            // 1. 从源路径提取并移除值
            modifyAtPath(result, fromComponents, schema, (parent, key) => {
                if (Array.isArray(parent)) {
                    const arraySchema = getSchemaForPath(schema, fromComponents.slice(0, -1));
                    if (!arraySchema || arraySchema.$type !== 'array') {
                        throw new Error(
                            `Schema mismatch: expected array schema for from path '${from}'`
                        );
                    }
                    const index = findArrayIndex(parent, key, arraySchema);
                    if (index === -1) {
                        throw new Error(`Source path '${from}' does not exist for move operation`);
                    }
                    movedValue = parent[index];
                    parent.splice(index, 1);
                } else if (isObject(parent)) {
                    if (!(key in parent)) {
                        throw new Error(`Source path '${from}' does not exist for move operation`);
                    }
                    movedValue = parent[key];
                    delete parent[key];
                }
            });

            // 2. 将值添加到目标路径
            // 语义说明：
            //   - /0 或 /fieldPath/0：移动到数组第一位
            //   - /{prevId} 或 /fieldPath/{prevId}：移动到 prevId 元素之后
            //   - /- 或 /fieldPath/-：移动到数组末尾
            if (path.endsWith('/-')) {
                // 添加到数组末尾
                const parentPath = path.slice(0, -2);
                const parentComponents = parentPath ? parseJsonPath(parentPath) : [];
                modifyAtPath(result, [...parentComponents, '-'], schema, parent => {
                    if (Array.isArray(parent)) {
                        parent.push(movedValue);
                    }
                });
            } else {
                modifyAtPath(result, pathComponents, schema, (parent, key) => {
                    if (Array.isArray(parent)) {
                        const arraySchema = getSchemaForPath(schema, pathComponents.slice(0, -1));
                        if (!arraySchema || arraySchema.$type !== 'array') {
                            throw new Error(
                                `Schema mismatch: expected array schema for path '${path}'`
                            );
                        }

                        // 检查是否是数字索引 (如 "0" 表示第一位)
                        const numericIndex = parseInt(key, 10);
                        if (!isNaN(numericIndex) && numericIndex === 0) {
                            // 移动到第一位
                            parent.unshift(movedValue);
                        } else {
                            // 在目标元素之后插入
                            const targetIndex = findArrayIndex(parent, key, arraySchema);
                            if (targetIndex !== -1) {
                                parent.splice(targetIndex + 1, 0, movedValue);
                            } else {
                                // 如果目标不存在，添加到末尾
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

    return result;
};

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

    // 如果有主键，使用主键查找
    if (pkField) {
        return array.findIndex(
            item => isObject(item) && item[pkField] !== undefined && String(item[pkField]) === key
        );
    }

    // 无主键，尝试直接使用索引
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

    // 如果有主键，需要创建一个新对象
    const pkField = getPrimaryKeyField(schema);
    if (pkField) {
        const newItem = { [pkField]: key };
        array.push(newItem);
        return array.length - 1;
    }

    // 对于非对象数组，使用键作为索引
    const numIndex = parseInt(key, 10);
    if (!isNaN(numIndex) && numIndex >= 0) {
        // 如果索引超出范围，填充数组
        if (numIndex >= array.length) {
            for (let i = array.length; i < numIndex; i++) {
                array.push(null);
            }
            array.push(null);
        }
        return numIndex;
    }

    // 如果无法使用键作为索引，添加到数组末尾
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
    modifierFn: (parent: Record<string, unknown> | unknown[], key: string) => void
): void => {
    if (pathComponents.length === 0) {
        return;
    }

    let current = root;
    let currentSchema: Schema | undefined = schema;
    const lastIndex = pathComponents.length - 1;

    // 遍历路径直到倒数第二个组件
    for (let i = 0; i < lastIndex; i++) {
        const component = pathComponents[i];

        if (!currentSchema) {
            throw new Error(`Schema not found for path component: ${component}`);
        }

        if (currentSchema.$type === 'object') {
            if (!isObject(current)) {
                throw new Error(`Expected object at path component: ${component}`);
            }

            // 获取字段模式
            const fieldSchema = currentSchema.$fields[component];
            if (!fieldSchema) {
                throw new Error(`Schema field not found: ${component}`);
            }

            // 如果字段不存在，创建它
            if (current[component] === undefined) {
                current[component] = fieldSchema.$type === 'array' ? [] : {};
            }

            current = current[component];
            currentSchema = fieldSchema as Schema;
        } else if (currentSchema.$type === 'array') {
            if (!Array.isArray(current)) {
                throw new Error(`Expected array at path component: ${component}`);
            }

            // 显式类型注释，确保完整的ArraySchema类型
            const arraySchema: ArraySchema = currentSchema;
            const index = getOrCreateArrayIndex(current, component, arraySchema);

            // 确保索引位置有值
            if (current[index] === undefined) {
                if (isObject(arraySchema.$item)) {
                    const itemType = arraySchema.$item.$type;
                    current[index] = itemType === 'object' ? {} : null;
                } else {
                    // 基本类型的数组项
                    current[index] = null;
                }
            }

            current = current[index];
            // 明确处理$item可能的两种类型
            if (isObject(arraySchema.$item) && arraySchema.$item.$type === 'object') {
                currentSchema = arraySchema.$item;
            } else {
                // 如果是基本类型，则没有进一步的schema
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

    // 对最后一个路径组件应用修改函数
    const lastComponent = pathComponents[lastIndex];
    modifierFn(current as Record<string, unknown> | unknown[], lastComponent);
};
