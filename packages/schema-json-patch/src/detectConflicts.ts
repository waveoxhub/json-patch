import { collectPathPrefixes } from './utils/pathUtils';
import { deepEqual } from './utils/deepEqual';
import { ConflictDetail, Patch } from './types';
import { generatePatchOptionHash } from './utils/hashUtils';

/**
 * 补丁操作类型定义
 */
type PatchOperationWithIndex = {
    patch: Patch;
    groupIndex: number;
    patchIndex: number;
};

/**
 * 检测多个补丁组之间的冲突
 * @param patchGroups 补丁组数组
 * @returns 详细冲突信息数组
 */
export const detectConflicts = (
    patchGroups: ReadonlyArray<ReadonlyArray<Patch>>
): ReadonlyArray<ConflictDetail> => {
    // 如果只有0或1个补丁组，不可能有冲突
    if (!patchGroups || patchGroups.length <= 1) {
        return [];
    }

    // 按路径索引所有补丁
    const patchesByPath = indexPatchesByPath(patchGroups);

    // 按路径前缀映射 - 用于快速查找父路径上的补丁
    const pathPrefixMap = buildPathPrefixMap(patchesByPath);

    // 存储所有冲突，按路径分组
    const conflictsByPath: Record<string, ConflictDetail> = {};

    // 检测相同路径上的冲突
    detectDirectPathConflicts(patchesByPath, conflictsByPath);

    // 检测父子路径冲突
    detectParentChildPathConflicts(
        patchesByPath,
        pathPrefixMap,
        conflictsByPath
    );

    // 转换为数组
    return Object.values(conflictsByPath);
};

/**
 * 按路径索引所有补丁
 */
const indexPatchesByPath = (
    patchGroups: ReadonlyArray<ReadonlyArray<Patch>>
): Map<string, PatchOperationWithIndex[]> => {
    const patchesByPath = new Map<string, PatchOperationWithIndex[]>();

    patchGroups.forEach((group, groupIndex) => {
        if (!group || !group.length) return;

        group.forEach((patch, patchIndex) => {
            if (!patch || !patch.path) return;

            const path = patch.path;

            if (!patchesByPath.has(path)) {
                patchesByPath.set(path, []);
            }

            patchesByPath.get(path)!.push({
                patch,
                groupIndex,
                patchIndex,
            });
        });
    });

    return patchesByPath;
};

/**
 * 构建路径前缀映射
 */
const buildPathPrefixMap = (
    patchesByPath: Map<string, PatchOperationWithIndex[]>
): Map<string, string[]> => {
    const pathPrefixMap = new Map<string, string[]>();

    for (const path of patchesByPath.keys()) {
        // 收集路径的所有前缀
        const prefixes = new Set<string>();
        collectPathPrefixes(path, prefixes);

        // 记录此路径的所有前缀路径
        pathPrefixMap.set(
            path,
            Array.from(prefixes).filter(p => p !== path)
        );
    }

    return pathPrefixMap;
};

/**
 * 检测直接路径冲突（在相同路径上操作冲突）
 */
const detectDirectPathConflicts = (
    patchesByPath: Map<string, PatchOperationWithIndex[]>,
    conflictsByPath: Record<string, ConflictDetail>
): void => {
    for (const [path, operations] of patchesByPath.entries()) {
        // 跳过只有一个操作的路径
        if (operations.length <= 1) continue;

        // 检查是否存在冲突
        if (hasConflictingOperations(operations)) {
            createConflictWithOperations(conflictsByPath, path, operations);
        }
    }
};

/**
 * 检查操作集是否有冲突
 */
const hasConflictingOperations = (operations: PatchOperationWithIndex[]): boolean => {
    // 检查是否有不同的操作类型
    const opTypes = new Set(operations.map(op => op.patch.op));

    // 如果操作类型相同
    if (opTypes.size === 1) {
        const opType = operations[0].patch.op;

        // 如果是删除操作，无冲突
        if (opType === 'remove') {
            return false;
        }

        // 如果是添加或替换操作，检查值是否相同
        if (opType === 'add' || opType === 'replace') {
            const valueMap = new Map();

            for (const op of operations) {
                const value = op.patch.value;
                // 查找任何匹配的值
                let found = false;

                for (const [, storedValue] of valueMap.entries()) {
                    if (deepEqual(value, storedValue)) {
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    valueMap.set(valueMap.size, value);
                    // 如果发现不同的值，存在冲突
                    if (valueMap.size > 1) {
                        return true;
                    }
                }
            }

            return false;
        }
    }

    // 不同的操作类型，存在冲突
    return true;
};

/**
 * 检测父子路径冲突
 */
const detectParentChildPathConflicts = (
    patchesByPath: Map<string, PatchOperationWithIndex[]>,
    pathPrefixMap: Map<string, string[]>,
    conflictsByPath: Record<string, ConflictDetail>
): void => {
    for (const [path, operations] of patchesByPath.entries()) {
        if (!operations.length) continue;

        // 获取此路径的所有前缀路径
        const prefixes = pathPrefixMap.get(path) || [];

        for (const prefix of prefixes) {
            const parentOps = patchesByPath.get(prefix);

            if (!parentOps || !parentOps.length) continue;

            // 检查前缀路径上的操作是否影响当前路径
            for (const parentOp of parentOps) {
                // 删除和替换操作会影响子路径
                if (parentOp.patch.op === 'remove' || parentOp.patch.op === 'replace') {
                    // 对于替换操作，检查子路径值是否与父对象中的值相同
                    if (
                        parentOp.patch.op === 'replace' &&
                        operations.every(childOp => {
                            // 只比较替换和添加操作的值
                            if (childOp.patch.op !== 'replace' && childOp.patch.op !== 'add') {
                                return true;
                            }
                            
                            // Extract the remaining path relative to the parent path
                            const remainingPath = path.slice(prefix.length);

                            // Get the value from the parent object at the corresponding child path
                            let parentValue = parentOp.patch.value;
                            const segments = remainingPath.split('/').filter(s => s);

                            try {
                                for (const segment of segments) {
                                    if (typeof parentValue !== 'object' || parentValue === null) {
                                        return false;
                                    }
                                    parentValue = (parentValue as any)[segment];
                                }

                                // Compare values for equality
                                return deepEqual(parentValue, childOp.patch.value);
                            } catch {
                                return false;
                            }
                        })
                    ) {
                        // 如果所有子操作都匹配父对象的相应部分，则不是冲突
                        continue;
                    }

                    if (!conflictsByPath[path]) {
                        conflictsByPath[path] = {
                            path,
                            options: [],
                        };
                    }

                    // Add parent path and current path operations to conflict
                    addOperationToConflict(conflictsByPath[path], parentOp);
                    operations.forEach(op =>
                        addOperationToConflict(conflictsByPath[path], op)
                    );

                    // One conflict is enough
                    break;
                }
            }
        }
    }
};

/**
 * 使用操作创建冲突
 */
const createConflictWithOperations = (
    conflictsByPath: Record<string, ConflictDetail>,
    path: string,
    operations: PatchOperationWithIndex[]
): void => {
    if (!conflictsByPath[path]) {
        conflictsByPath[path] = {
            path,
            options: [],
        };
    }

    const conflict = conflictsByPath[path];

    for (const op of operations) {
        addOperationToConflict(conflict, op);
    }
};

/**
 * 将操作添加到冲突
 */
const addOperationToConflict = (
    conflict: ConflictDetail,
    op: PatchOperationWithIndex
): void => {
    // 优先使用补丁中已有的哈希值，如果没有再计算
    const hash = op.patch.hash || generatePatchOptionHash(op.patch.op, op.patch.path, op.patch.value);
    
    // 检查是否已存在相同哈希的选项
    const existingOption = conflict.options.includes(hash);
    
    if (!existingOption) {
        // 添加新选项（仅哈希值）
        conflict.options.push(hash);
    }
};
