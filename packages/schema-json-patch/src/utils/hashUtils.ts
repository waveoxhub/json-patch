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
/**
 * 快速序列化值用于哈希计算
 * 对基本类型直接转字符串，避免 JSON.stringify 开销
 */
const fastSerialize = (value: unknown): string => {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';

    const type = typeof value;
    if (type === 'string') return `"${value}"`;
    if (type === 'number' || type === 'boolean') return String(value);

    // 仅对复杂类型使用 JSON.stringify
    return JSON.stringify(value);
};

export const generatePatchOptionHash = (
    op: PatchOperation,
    path: string,
    value?: unknown,
    from?: string
): string => {
    const serializedValue = fastSerialize(value);
    const fromPart = from !== undefined ? `_from:${from}` : '';
    const hashInput = `${op}_${path}_${serializedValue}${fromPart}`;

    let hash: number = HASH_CONFIG.FNV_OFFSET_BASIS;
    for (let i = 0; i < hashInput.length; i++) {
        hash ^= hashInput.charCodeAt(i);
        hash = Math.imul(hash, HASH_CONFIG.FNV_PRIME);
    }

    // 使用无符号右移确保正数，并转换为 8 位十六进制
    return (hash >>> 0).toString(16).padStart(8, '0');
};
