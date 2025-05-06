/**
 * JSON补丁操作类型
 */
export type PatchOperation = 'add' | 'remove' | 'replace';

/**
 * JSON补丁对象
 */
export type Patch = {
    readonly op: PatchOperation;
    readonly path: string;
    readonly value?: unknown;
    readonly hash: string;
};

/**
 * 补丁冲突详情
 */
export type ConflictDetail = {
    readonly path: string; // 冲突的路径
    readonly options: Array<string>; // 冲突选项哈希数组
};

/**
 * 单个冲突解决方案
 */
export type ConflictResolution = {
    readonly path: string; // 冲突路径
    readonly selectedHash: string; // 选中的补丁哈希值
};

/**
 * 冲突解决方案数组
 */
export type ConflictResolutions = Array<ConflictResolution>;

/**
 * 未解决的冲突hash数组
 */
export type UnresolvedConflicts = Array<string>;

/**
 * 自定义解决方案类型
 * 用于处理特殊冲突情况
 */
export type CustomConflictResolution = {
    readonly path: string;
    readonly patch: Patch;
};

/**
 * 自定义解决方案数组
 */
export type CustomConflictResolutions = Array<CustomConflictResolution>;
