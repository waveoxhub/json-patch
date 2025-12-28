/**
 * 深度克隆一个对象
 *
 * @param obj - 要克隆的对象
 * @returns 克隆后的对象
 */
export const deepClone = <T>(obj: T): T => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(deepClone) as unknown as T;
    }

    const result = {} as Record<string, unknown>;
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        result[key] = deepClone(value);
    }

    return result as T;
};
