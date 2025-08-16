import { ValidationResult } from './types';

/**
 * 验证JSON字符串是否有效
 * @param jsonString JSON字符串
 * @returns 验证结果
 */
export const validateJson = (jsonString: string): ValidationResult => {
    const errors: string[] = [];

    try {
        JSON.parse(jsonString);
    } catch (error) {
        errors.push(`JSON parse error: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};
