import { message } from 'antd';

/**
 * 格式化JSON字符串
 * @param json JSON字符串
 * @param setter 设置格式化后字符串的回调函数
 */
export const formatJson = (json: string, setter: (value: string) => void): void => {
    try {
        const parsed = JSON.parse(json);
        setter(JSON.stringify(parsed, null, 2));
    } catch {
        // 如果解析失败，保留原样
    }
};

/**
 * 复制文本到剪贴板
 * @param text 要复制的文本
 * @param successMessage 成功提示信息
 */
export const copyToClipboard = (text: string, successMessage: string = '已复制到剪贴板'): void => {
    navigator.clipboard
        .writeText(text)
        .then(() => message.success(successMessage))
        .catch(() => message.error('复制失败'));
};
