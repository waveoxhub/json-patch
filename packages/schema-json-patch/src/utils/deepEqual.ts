import { isObject } from './isObject';

/**
 * Deep comparison of two values for equality
 *
 * @param a - First value
 * @param b - Second value
 * @returns Whether values are equal
 */
export const deepEqual = (a: unknown, b: unknown): boolean => {
    // Basic types or reference equality
    if (a === b) return true;
    if (typeof a !== typeof b) return false;

    // Handle null
    if (a === null || b === null) return false;

    // Array comparison
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;

        return a.every((item, index) => deepEqual(item, b[index]));
    }

    // Object comparison
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
