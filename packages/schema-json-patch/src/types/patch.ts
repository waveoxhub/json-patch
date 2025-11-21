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
 * 冲突原因分类（可选，用于UI与自动化处理提示）
 */
export type ConflictReason =
    | 'REPLACE_REPLACE_DIFFERENT'
    | 'ADD_ADD_DIFFERENT'
    | 'REMOVE_REMOVE_DUPLICATE'
    | 'ADD_REPLACE_COLLISION'
    | 'ANCESTOR_REMOVED'
    | 'ANCESTOR_REPLACED_INCOMPATIBLE'
    | 'ARRAY_INDEX_COLLISION'
    | 'MIXED_OPERATION_TYPES'
    | 'UNKNOWN';

/**
 * 冲突中涉及的操作（用于可视化与二次处理，可选）
 */
export type ConflictOperation = {
    readonly groupIndex: number;
    readonly patch: Patch;
};

/**
 * 冲突选项详情（用于可视化，包含完整补丁信息）
 */
export type ConflictOptionDetail = {
    readonly hash: string; // 补丁哈希（用于选择）
    readonly patch: Patch; // 完整补丁信息
    readonly groupIndex: number; // 所属补丁组索引
};

/**
 * 补丁冲突详情
 */
export type ConflictDetail = {
    readonly path: string; // 冲突的路径
    readonly options: ReadonlyArray<ConflictOptionDetail>; // 冲突选项详情（包含完整补丁信息）
    readonly reason?: ConflictReason; // 可选：冲突原因
    readonly leftOps?: ReadonlyArray<ConflictOperation>; // 可选：左侧(或第一个)补丁组相关操作
    readonly rightOps?: ReadonlyArray<ConflictOperation>; // 可选：右侧(或第二个)补丁组相关操作
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
