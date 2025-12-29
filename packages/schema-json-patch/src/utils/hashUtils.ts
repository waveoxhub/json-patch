import { PatchOperation } from '../types/patch.js';
import { HASH_CONFIG } from '../constants.js';

/**
 * 生成补丁选项的哈希值
 * @param op 补丁操作类型
 * @param path 补丁路径
 * @param value 补丁值
 * @param from move 操作的源路径（可选）
 * @returns 哈希字符串（8位十六进制）
 */
export const generatePatchOptionHash = (
    op: PatchOperation,
    path: string,
    value?: unknown,
    from?: string
): string => {
    try {
        const serializedValue = value !== undefined ? JSON.stringify(value) : 'undefined';
        const fromPart = from !== undefined ? `_from:${from}` : '';
        const hashInput = `${op}_${path}_${serializedValue}${fromPart}`;

        let hash: number = HASH_CONFIG.FNV_OFFSET_BASIS;
        for (let i = 0; i < hashInput.length; i++) {
            hash ^= hashInput.charCodeAt(i);
            hash = Math.imul(hash, HASH_CONFIG.FNV_PRIME);
        }

        // 使用无符号右移确保正数，并转换为 8 位十六进制
        return (hash >>> 0).toString(16).padStart(8, '0');
    } catch {
        throw new Error('Failed to generate patch option hash');
    }
};
