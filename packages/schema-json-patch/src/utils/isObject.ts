/**
 * 检查值是否为非空对象且不是数组
 */
export const isObject = (value: unknown): boolean => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};
