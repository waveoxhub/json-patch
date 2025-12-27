import { PatchOperation } from '../types/patch';

/**
 * FNV-1a 哈希算法常量
 * 使用 32 位版本，提供更好的分布性和跨平台一致性
 */
const FNV_OFFSET_BASIS = 2166136261;
const FNV_PRIME = 16777619;

/**
 * 生成补丁选项的哈希值
 * 使用 FNV-1a 算法，提供更好的分布性和跨平台一致性
 * @param op 补丁操作类型
 * @param path 补丁路径
 * @param value 补丁值
 * @returns 哈希字符串（8位十六进制）
 */
export const generatePatchOptionHash = (
    op: PatchOperation,
    path: string,
    value?: unknown
): string => {
    try {
        const serializedValue = value !== undefined ? JSON.stringify(value) : 'undefined';
        const hashInput = `${op}_${path}_${serializedValue}`;

        let hash = FNV_OFFSET_BASIS;
        for (let i = 0; i < hashInput.length; i++) {
            hash ^= hashInput.charCodeAt(i);
            hash = Math.imul(hash, FNV_PRIME);
        }

        // 使用无符号右移确保正数，并转换为 8 位十六进制
        return (hash >>> 0).toString(16).padStart(8, '0');
    } catch {
        throw new Error('Failed to generate patch option hash');
    }
};
