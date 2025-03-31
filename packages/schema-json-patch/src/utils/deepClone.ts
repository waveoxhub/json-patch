/**
 * Deep clone an object
 *
 * @param obj - Object to clone
 * @returns Cloned object
 */
export const deepClone = <T>(obj: T): T => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item)) as unknown as T;
    }

    const result = {} as Record<string, unknown>;

    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            result[key] = deepClone((obj as Record<string, unknown>)[key]);
        }
    }

    return result as T;
};
