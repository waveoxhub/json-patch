/**
 * Check if value is a non-null object and not an array
 */
export const isObject = (value: unknown): boolean => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};
