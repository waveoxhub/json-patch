/**
 * 检查JSON字符串是否有效
 */
export const isValidJson = (json: string): boolean => {
    if (!json.trim()) return false;

    try {
        JSON.parse(json);
        return true;
    } catch {
        return false;
    }
};

/**
 * 格式化JSON字符串
 */
export const formatJson = (json: string): string => {
    try {
        const parsed = JSON.parse(json);
        return JSON.stringify(parsed, null, 2);
    } catch {
        return json; // 如果无法解析则返回原始字符串
    }
};

/**
 * 安全解析JSON字符串
 * @returns 解析的对象或undefined（如果解析失败）
 */
export const safeParseJson = <T>(json: string): T | undefined => {
    try {
        return JSON.parse(json) as T;
    } catch {
        return undefined;
    }
};

/**
 * 将JSON字符串转换为转义后的字符串
 * 适合在POST请求body中作为字符串值使用
 * @param jsonString 原始JSON字符串
 * @returns 转义后的字符串，以双引号包围
 */
export const escapeJsonString = (jsonString: string): string => {
    if (!jsonString.trim()) {
        return '""';
    }

    try {
        // 先解析JSON确保格式正确
        JSON.parse(jsonString);

        // 将JSON字符串转换为转义后的字符串
        // 使用JSON.stringify的第二个参数来转义特殊字符
        return JSON.stringify(jsonString);
    } catch {
        // 如果解析失败，返回空字符串
        return '""';
    }
};
