import { isObject } from './isObject';

/**
 * 两个值的深度比较是否相等
 *
 * @param a - 第一个值
 * @param b - 第二个值
 * @returns 值是否相等
 */
export const deepEqual = (a: unknown, b: unknown): boolean => {
    // 基本类型或引用相等
    if (a === b) return true;
    if (typeof a !== typeof b) return false;

    // 处理null
    if (a === null || b === null) return false;

    // 数组比较
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;

        return a.every((item, index) => deepEqual(item, b[index]));
    }

    // 对象比较
    if (isObject(a) && isObject(b)) {
        const keysA = Object.keys(a as object);
        const keysB = Object.keys(b as object);

        if (keysA.length !== keysB.length) return false;

        const keySet = new Set(keysA);

        return keysB.every(
            key =>
                keySet.has(key) &&
                deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
        );
    }

    return false;
};
