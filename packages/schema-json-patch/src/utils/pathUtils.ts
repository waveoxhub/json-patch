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
    // 第一个元素是空字符串，移除它
    components.shift();

    return components.map(component => component.replace(/~1/g, '/').replace(/~0/g, '~'));
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
 * 根据模式和对象值获取主键值
 *
 * @param schema - 对象模式
 * @param obj - 对象值
 * @returns 主键值
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

        // 处理数组元素
        data.forEach((item, index) => {
            const itemPath = `${basePath}/${index}`;

            if (schema.$item.$type === 'object') {
                // 对于对象数组，使用主键作为索引
                const pkValue = getPrimaryKeyValue(
                    schema.$item as ArrayItemObjectSchema,
                    item as Record<string, unknown>
                );
                const semanticPath = `${basePath}/${pkValue}`;

                // 存储从语义路径到索引路径的映射
                result.set(semanticPath, { path: itemPath, value: item });

                // 递归处理对象字段
                extractPathMap(schema.$item, item, semanticPath, result);
            } else {
                // 基本类型数组
                result.set(itemPath, { path: itemPath, value: item });
            }
        });
    } else if (schema.$type === 'object') {
        // 处理对象字段
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
