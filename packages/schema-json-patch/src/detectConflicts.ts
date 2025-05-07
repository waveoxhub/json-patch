import { collectPathPrefixes } from './utils/pathUtils';
import { deepEqual } from './utils/deepEqual';
import { ConflictDetail, Patch } from './types';
import { generatePatchOptionHash } from './utils/hashUtils';

/**
 * 补丁操作的类型定义
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
    // 0或1个补丁组不可能有冲突
    if (!patchGroups || patchGroups.length <= 1) {
        return [];
    }

    // 按路径索引所有补丁
    const patchesByPath = indexPatchesByPath(patchGroups);

    // 路径前缀映射 - 用于快速查找父路径上的补丁
    const pathPrefixMap = buildPathPrefixMap(patchesByPath);

    // 存储所有冲突，按路径分组
    const conflictsByPath: Record<string, ConflictDetail> = {};

    // 检测相同路径上的冲突
    detectDirectPathConflicts(patchesByPath, conflictsByPath);

    // 检测父子路径冲突
    detectParentChildPathConflicts(patchesByPath, pathPrefixMap, conflictsByPath);

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

        // 记录这个路径的所有前缀路径
        pathPrefixMap.set(
            path,
            Array.from(prefixes).filter(p => p !== path)
        );
    }

    return pathPrefixMap;
};

/**
 * 检测直接路径冲突（同一路径上的冲突操作）
 */
const detectDirectPathConflicts = (
    patchesByPath: Map<string, PatchOperationWithIndex[]>,
    conflictsByPath: Record<string, ConflictDetail>
): void => {
    for (const [path, operations] of patchesByPath.entries()) {
        // 跳过只有一个操作的路径
        if (operations.length <= 1) continue;

        // 检查是否存在冲突操作
        if (hasConflictingOperations(operations)) {
            createConflictWithOperations(conflictsByPath, path, operations);
        }
    }
};

/**
 * 检查一组操作是否存在冲突
 */
const hasConflictingOperations = (operations: PatchOperationWithIndex[]): boolean => {
    // 检查是否有不同的操作类型
    const opTypes = new Set(operations.map(op => op.patch.op));

    // 如果操作类型相同
    if (opTypes.size === 1) {
        const opType = operations[0].patch.op;

        // 如果是删除操作，没有冲突
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
                    // 对于替换操作，检查子路径值是否与父对象中的值匹配
                    if (
                        parentOp.patch.op === 'replace' &&
                        operations.every(childOp => {
                            // 仅对替换和添加操作比较值
                            if (childOp.patch.op !== 'replace' && childOp.patch.op !== 'add') {
                                return true;
                            }

                            // 提取相对于父路径的剩余路径
                            const remainingPath = path.slice(prefix.length);

                            // 获取父对象中对应子路径的值
                            let parentValue = parentOp.patch.value;
                            const segments = remainingPath.split('/').filter(s => s);

                            try {
                                for (const segment of segments) {
                                    if (typeof parentValue !== 'object' || parentValue === null) {
                                        return false;
                                    }
                                    parentValue = (parentValue as any)[segment];
                                }

                                // 比较值是否相等
                                return deepEqual(parentValue, childOp.patch.value);
                            } catch {
                                return false;
                            }
                        })
                    ) {
                        // 如果所有子操作与父对象中的对应部分匹配，则不是冲突
                        continue;
                    }

                    // 关键修改：当父路径替换或删除时，冲突应该记录在父路径上
                    // 而不是子路径上，因为父路径操作会覆盖所有子路径
                    const conflictPath = prefix;

                    if (!conflictsByPath[conflictPath]) {
                        conflictsByPath[conflictPath] = {
                            path: conflictPath,
                            options: [],
                        };
                    }

                    // 将父路径操作添加到冲突中
                    addOperationToConflict(conflictsByPath[conflictPath], parentOp);
                    
                    // 将子路径操作添加到冲突中，因为它们与父路径操作冲突
                    operations.forEach(op => addOperationToConflict(conflictsByPath[conflictPath], op));

                    // 一个冲突就足够了
                    break;
                }
            }
        }
    }
};

/**
 * 创建包含操作的冲突
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
const addOperationToConflict = (conflict: ConflictDetail, op: PatchOperationWithIndex): void => {
    // 优先使用补丁中已有的哈希值，如果没有则计算
    const hash =
        op.patch.hash || generatePatchOptionHash(op.patch.op, op.patch.path, op.patch.value);

    // 检查是否已存在具有相同哈希值的选项
    const existingOption = conflict.options.includes(hash);

    if (!existingOption) {
        // 添加新选项（仅哈希值）
        conflict.options.push(hash);
    }
};
