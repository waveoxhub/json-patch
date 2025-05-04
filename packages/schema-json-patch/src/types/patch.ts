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
    readonly hash?: string;   // 补丁的唯一哈希值
};

/**
 * 冲突选项，包含哈希标识符
 */
export type ConflictOption = {
    readonly hash: string;         // 选项唯一标识哈希
    readonly operation: PatchOperation;
    readonly groupIndex: number;   // 补丁组索引
    readonly path: string;         // 补丁路径
    readonly value?: unknown;      // 操作的值
};

/**
 * 补丁冲突详情
 */
export type ConflictDetail = {
    readonly path: string;         // 冲突的路径
    readonly options: Array<ConflictOption>; // 冲突选项数组
};

/**
 * 补丁冲突处理结果
 */
export type ConflictResult = {
    readonly hasConflicts: boolean;
    readonly conflicts: Array<ConflictDetail>;
    readonly resolvedPatches: Array<Patch>;
};

/**
 * 基于哈希的冲突解决方案
 * 用哈希值作为键，选择的选项索引作为值
 */
export type ConflictResolutions = Record<string, number>;

/**
 * 自定义解决方案类型
 * 用于处理特殊冲突情况
 */
export type CustomResolution = {
    readonly path: string;
    readonly patch: Patch;
};
