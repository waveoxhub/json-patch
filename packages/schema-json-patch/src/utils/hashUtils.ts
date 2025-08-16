import { PatchOperation } from '../types/patch';

/**
 * 生成补丁选项的哈希值
 * 使用路径和值的组合生成哈希
 * @param op 补丁操作类型
 * @param path 补丁路径
 * @param value 补丁值
 * @returns 哈希字符串
 */
export const generatePatchOptionHash = (
    op: PatchOperation,
    path: string,
    value?: unknown
): string => {
    try {
        const serializedValue = value !== undefined ? JSON.stringify(value) : 'undefined';
        const hashInput = `${op}_${path}_${serializedValue}`;

        let hash = 0;
        for (let i = 0; i < hashInput.length; i++) {
            const char = hashInput.charCodeAt(i);
            hash = (hash << 5) - hash + char;
        }

        return Math.abs(hash).toString(16);
    } catch {
        throw new Error('Failed to generate patch option hash');
    }
};
