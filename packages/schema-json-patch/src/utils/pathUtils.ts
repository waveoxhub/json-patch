import { Schema, ArrayItemObjectSchema } from '../types/schema';

/**
 * 路径组件类型
 */
type PathComponents = ReadonlyArray<string>;

/**
 * 将JSON路径字符串解析为路径组件数组
 *
 * @param path - JSON路径字符串，格式如"/a/b/c"
 * @returns 解析后的路径组件数组，如["a", "b", "c"]
 * @throws 当路径格式无效时抛出错误
 */
export const parseJsonPath = (path: string): PathComponents => {
    if (path === '') return [];
    if (path[0] !== '/') throw new Error('Invalid path: must start with /');

    const components = path.split('/');
    components.shift(); // 移除第一个空字符串
    return components.map(component => component.replace(/~1/g, '/').replace(/~0/g, '~'));
};

/**
 * 规范化 JSON Pointer 路径
 * - 移除多余斜杠
 * - 统一转义
 * - 空路径表示根
 * - 非绝对路径返回 undefined
 */
export const normalizePointer = (path: string): string | undefined => {
    if (path === '') return '';
    if (!path.startsWith('/')) return undefined;
    const parts = parseJsonPath(path);
    return parts.length === 0 ? '' : '/' + parts.map(escapePathComponent).join('/');
};

/**
 * 转义路径组件中的特殊字符
 *
 * @param component - 路径组件
 * @returns 转义后的组件
 */
export const escapePathComponent = (component: string): string => {
    return component.replace(/~/g, '~0').replace(/\//g, '~1');
};

/**
 * 根据模式和对象值获取主键值，或返回 undefined 表示应使用索引
 *
 * @param schema - 对象模式
 * @param obj - 对象值
 * @returns 主键值，如果无 $pk 则返回 undefined
 */
export const getPrimaryKeyValue = (
    schema: ArrayItemObjectSchema,
    obj: Record<string, unknown>
): string | undefined => {
    const pkField = schema.$pk;
    if (!pkField) {
        return undefined;
    }
    if (!obj[pkField]) {
        throw new Error(
            `Object missing primary key: ${pkField} \n obj: ${JSON.stringify(obj)} \n schema: ${JSON.stringify(schema)}`
        );
    }
    return String(obj[pkField]);
};

/**
 * 收集路径前缀
 *
 * @param path - 路径
 * @param results - 存储结果的集合
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
 * 判断 a 是否为 b 的祖先路径
 */
export const isAncestor = (a: string, b: string): boolean => {
    const na = normalizePointer(a);
    const nb = normalizePointer(b);
    if (na === undefined || nb === undefined) return false;
    if (na === '' || nb === '') return na === '' && nb !== '';
    if (na === nb) return false;
    return nb.startsWith(na + '/');
};

/**
 * 判断两条路径是否相同（规范化后）
 */
export const isSamePath = (a: string, b: string): boolean => {
    const na = normalizePointer(a);
    const nb = normalizePointer(b);
    if (na === undefined || nb === undefined) return false;
    return na === nb;
};

/**
 * 从对象中提取完整的路径映射
 * 用于支持索引和查找
 *
 * @param schema - 数据模型模式
 * @param data - 数据对象
 * @param basePath - 基础路径
 * @param result - 收集的路径映射结果
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

        data.forEach((item, index) => {
            const itemPath = `${basePath}/${index}`;

            if (schema.$item.$type === 'object') {
                const itemSchema = schema.$item as ArrayItemObjectSchema;
                const pkValue = getPrimaryKeyValue(itemSchema, item as Record<string, unknown>);
                // 如果有主键则使用主键路径，否则使用索引路径
                const semanticPath = pkValue !== undefined ? `${basePath}/${pkValue}` : itemPath;

                result.set(semanticPath, { path: itemPath, value: item });
                extractPathMap(schema.$item, item, semanticPath, result);
            } else {
                result.set(itemPath, { path: itemPath, value: item });
            }
        });
    } else if (schema.$type === 'object') {
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
