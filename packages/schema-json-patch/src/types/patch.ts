/**
 * JSON 补丁操作类型
 * - add: 添加新值
 * - remove: 删除值
 * - replace: 替换现有值
 * - move: 移动值到新位置
 */
export type PatchOperation = 'add' | 'remove' | 'replace' | 'move';

/**
 * JSON 补丁对象
 */
export type Patch = {
    /** 操作类型 */
    readonly op: PatchOperation;
    /** JSON Pointer 路径 */
    readonly path: string;
    /** 操作值（add 和 replace 操作必需） */
    readonly value?: unknown;
    /** move 操作的源路径 */
    readonly from?: string;
    /** 补丁唯一标识符，用于冲突检测和解决 */
    readonly hash: string;
};

/**
 * 冲突选项详情
 * 用于可视化展示，包含完整的补丁信息
 */
export type ConflictOptionDetail = {
    /** 补丁哈希，用于选择 */
    readonly hash: string;
    /** 完整补丁信息 */
    readonly patch: Patch;
    /** 所属补丁组索引 */
    readonly groupIndex: number;
};

/**
 * 补丁冲突详情
 */
export type ConflictDetail = {
    /** 冲突发生的路径 */
    readonly path: string;
    /** 该路径上的冲突选项 */
    readonly options: ReadonlyArray<ConflictOptionDetail>;
};

/**
 * 单个冲突解决方案
 */
export type ConflictResolution = {
    /** 冲突路径 */
    readonly path: string;
    /** 选中的补丁哈希值 */
    readonly selectedHash: string;
};

/**
 * 冲突解决方案数组
 */
export type ConflictResolutions = Array<ConflictResolution>;

/**
 * 未解决的冲突哈希数组
 */
export type UnresolvedConflicts = Array<string>;

/**
 * 自定义解决方案
 * 用于处理特殊冲突情况，允许用户提供自定义补丁
 */
export type CustomConflictResolution = {
    /** 冲突路径 */
    readonly path: string;
    /** 自定义补丁 */
    readonly patch: Patch;
};

/**
 * 自定义解决方案数组
 */
export type CustomConflictResolutions = Array<CustomConflictResolution>;
