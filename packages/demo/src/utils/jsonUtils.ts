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
