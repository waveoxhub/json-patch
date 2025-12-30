/**
 * 两个值的深度比较是否相等
 *
 * @param a - 第一个值
 * @param b - 第二个值
 * @returns 值是否相等
 */
export const deepEqual = (a: unknown, b: unknown): boolean => {
    // 快速路径：引用相等或基本值相等
    if (a === b) return true;

    // 类型不同或有 null
    if (typeof a !== typeof b) return false;
    if (a === null || b === null) return false;

    // 对象类型检查
    if (typeof a !== 'object') return false;

    // 数组比较
    const aIsArray = Array.isArray(a);
    const bIsArray = Array.isArray(b);
    if (aIsArray !== bIsArray) return false;

    if (aIsArray) {
        const arrA = a as unknown[];
        const arrB = b as unknown[];
        const len = arrA.length;
        if (len !== arrB.length) return false;

        for (let i = 0; i < len; i++) {
            if (!deepEqual(arrA[i], arrB[i])) return false;
        }
        return true;
    }

    // 对象比较
    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    if (keysA.length !== keysB.length) return false;

    for (let i = 0, len = keysA.length; i < len; i++) {
        const key = keysA[i];
        if (!(key in objB)) return false;
        if (!deepEqual(objA[key], objB[key])) return false;
    }

    return true;
};
