import { isObject } from './isObject.js';

/**
 * 两个值的深度比较是否相等
 *
 * @param a - 第一个值
 * @param b - 第二个值
 * @returns 值是否相等
 */
export const deepEqual = (a: unknown, b: unknown): boolean => {
    if (a === b) return true;
    if (typeof a !== typeof b || a === null || b === null) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
        return a.length === b.length && a.every((item, index) => deepEqual(item, b[index]));
    }

    if (isObject(a) && isObject(b)) {
        const keysA = Object.keys(a as object);
        const keysB = Object.keys(b as object);

        if (keysA.length !== keysB.length) return false;

        return keysA.every(
            key =>
                Object.prototype.hasOwnProperty.call(b, key) &&
                deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
        );
    }

    return false;
};
