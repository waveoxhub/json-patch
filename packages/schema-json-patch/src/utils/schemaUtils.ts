import { Schema, ArraySchema } from '../types/schema.js';
import { SchemaJsonPatchError } from '../errors.js';

/**
 * 检查值是否为非空对象（不包括数组）
 */
export const isObject = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * 检查数组模式是否包含对象项（无论是否有主键）
 */
export const hasObjectItems = (schema: ArraySchema): boolean => {
    return isObject(schema.$item) && schema.$item.$type === 'object';
};

/**
 * 检查数组模式是否包含带主键的对象项
 */
export const hasObjectItemsWithPk = (schema: ArraySchema): boolean => {
    return isObject(schema.$item) && schema.$item.$type === 'object' && '$pk' in schema.$item;
};

/**
 * 获取数组模式中的主键字段名
 * @throws {SchemaJsonPatchError} 如果不是有效的对象数组模式
 */
export const getPrimaryKeyField = (schema: ArraySchema): string | undefined => {
    if (schema.$type !== 'array') {
        throw SchemaJsonPatchError.invalidSchema('not an array type');
    }

    const item = schema.$item;
    if (!isObject(item) || item.$type !== 'object') {
        return undefined;
    }

    return item.$pk;
};

/**
 * 获取指定路径的 Schema
 * @param schema - 根 Schema
 * @param pathComponents - 路径组件数组
 * @returns 指定路径的 Schema 或 undefined
 */
export const getSchemaForPath = (
    schema: Schema,
    pathComponents: ReadonlyArray<string>
): Schema | undefined => {
    if (!pathComponents.length) {
        return schema;
    }

    let currentSchema: Schema | undefined = schema;

    for (const component of pathComponents) {
        if (!currentSchema) return undefined;

        if (currentSchema.$type === 'object' && '$fields' in currentSchema) {
            currentSchema = currentSchema.$fields[component] as Schema | undefined;
        } else if (currentSchema.$type === 'array' && '$item' in currentSchema) {
            currentSchema = currentSchema.$item as Schema;
        } else {
            return undefined;
        }
    }

    return currentSchema;
};
