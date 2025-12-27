/**
 * 补丁生成配置常量
 */
export const PATCH_GENERATION = {
    /**
     * 触发整体替换的最小变更属性数量阈值
     * 当添加或删除的属性数量超过此值时，使用整体替换而非逐个操作
     */
    WHOLE_REPLACE_THRESHOLD: 1,
} as const;

/**
 * 哈希算法常量
 */
export const HASH_CONFIG = {
    /** FNV-1a 偏移基数 */
    FNV_OFFSET_BASIS: 2166136261,
    /** FNV-1a 质数 */
    FNV_PRIME: 16777619,
} as const;
