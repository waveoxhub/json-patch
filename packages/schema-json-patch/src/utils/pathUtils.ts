import { Schema, ArrayItemObjectSchema } from '../types/schema';

/**
 * Path component type
 */
type PathComponents = ReadonlyArray<string>;

/**
 * Parse JSON Path string into array of path components
 *
 * @param path - JSON Path string, format like "/a/b/c"
 * @returns Parsed path components array, like ["a", "b", "c"]
 * @throws Error when path format is invalid
 */
export const parseJsonPath = (path: string): PathComponents => {
    if (path === '') return [];
    if (path[0] !== '/') throw new Error('Invalid path: must start with /');

    const components = path.split('/');
    // First element is empty string, remove it
    components.shift();

    return components.map(component => component.replace(/~1/g, '/').replace(/~0/g, '~'));
};

/**
 * Escape special characters in path components
 *
 * @param component - Path component
 * @returns Escaped component
 */
export const escapePathComponent = (component: string): string => {
    return component.replace(/~/g, '~0').replace(/\//g, '~1');
};

/**
 * Get primary key value based on schema and object value
 *
 * @param schema - Object schema
 * @param obj - Object value
 * @returns Primary key value
 */
export const getPrimaryKeyValue = (
    schema: ArrayItemObjectSchema,
    obj: Record<string, unknown>
): string => {
    const pkField = schema.$pk;
    if (!pkField || !obj[pkField]) {
        throw new Error(`Object missing primary key: ${pkField}`);
    }
    return String(obj[pkField]);
};

/**
 * Collect path prefixes
 *
 * @param path - Path
 * @param results - Set to store results
 */
export const collectPathPrefixes = (path: string, results: Set<string>): void => {
    const components = parseJsonPath(path);
    const pathParts: string[] = [];

    for (const component of components) {
        pathParts.push(escapePathComponent(component));
        results.add('/' + pathParts.join('/'));
    }
};

/**
 * Extract complete path mapping from object
 * Used to support indexing and lookup
 *
 * @param schema - Data model schema
 * @param data - Data object
 * @param basePath - Base path
 * @param result - Collected path mapping result
 */
export const extractPathMap = (
    schema: Schema,
    data: unknown,
    basePath: string = '',
    result: Map<string, { path: string; value: unknown }> = new Map()
): Map<string, { path: string; value: unknown }> => {
    if (schema.$type === 'array') {
        if (!Array.isArray(data)) {
            throw new Error(`Path ${basePath} expected to be array, but found ${typeof data}`);
        }

        // Process array elements
        data.forEach((item, index) => {
            const itemPath = `${basePath}/${index}`;

            if (schema.$item.$type === 'object') {
                // For object arrays, use primary key as index
                const pkValue = getPrimaryKeyValue(
                    schema.$item as ArrayItemObjectSchema,
                    item as Record<string, unknown>
                );
                const semanticPath = `${basePath}/${pkValue}`;

                // Store mapping from semantic path to index path
                result.set(semanticPath, { path: itemPath, value: item });

                // Recursively process object fields
                extractPathMap(schema.$item, item, semanticPath, result);
            } else {
                // Primitive type array
                result.set(itemPath, { path: itemPath, value: item });
            }
        });
    } else if (schema.$type === 'object') {
        // Process object fields
        for (const [key, fieldSchema] of Object.entries(schema.$fields)) {
            const fieldPath = basePath ? `${basePath}/${key}` : key;
            const fieldValue = (data as Record<string, unknown>)[key];

            if (fieldValue === undefined) continue;

            result.set(fieldPath, { path: fieldPath, value: fieldValue });

            if (fieldSchema.$type === 'object' || fieldSchema.$type === 'array') {
                extractPathMap(fieldSchema, fieldValue, fieldPath, result);
            }
        }
    }

    return result;
};
