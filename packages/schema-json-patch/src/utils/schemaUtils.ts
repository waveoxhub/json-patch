import { Schema, ArraySchema } from '../types/schema.js';

/**
 * 检查值是否为非空对象
 * @param value - 要检查的值
 * @returns 是否为非空对象
 */
export const isObject = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * 检查数组模式是否包含带主键的对象项
 * @param schema - 数组模式
 * @returns 是否包含对象项且有主键
 */
export const hasObjectItems = (schema: ArraySchema): boolean => {
    return isObject(schema.$item) && schema.$item.$type === 'object' && '$pk' in schema.$item;
};

/**
 * 获取数组子模式中的主键字段名
 * @param schema - 数组模式
 * @returns 主键字段名
 * @throws {Error} 如果不是有效的对象数组模式
 */
export const getPrimaryKeyField = (schema: ArraySchema): string => {
    if (schema.$type !== 'array') {
        throw new Error('Invalid schema: not an array type');
    }

    const item = schema.$item;
    if (!isObject(item) || item.$type !== 'object' || !('$pk' in item)) {
        throw new Error('Invalid schema: array item must be an object with $pk field');
    }

    return item.$pk;
};

/**
 * 如果是对象数组但缺少 $pk，抛出错误
 * @param schema - 数组模式
 * @throws {Error} 如果对象数组缺少 $pk 定义
 */
export const assertArrayObjectHasPkIfObjectArray = (schema: ArraySchema): void => {
    const item = schema.$item as unknown;
    if (isObject(item) && (item as Record<string, unknown>).$type === 'object') {
        if (!('$pk' in (item as Record<string, unknown>))) {
            throw new Error('Invalid schema: object arrays must define $pk');
        }
    }
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
