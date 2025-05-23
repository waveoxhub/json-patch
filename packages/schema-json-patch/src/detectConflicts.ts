import { collectPathPrefixes } from './utils/pathUtils';
import { deepEqual } from './utils/deepEqual';
import { ConflictDetail, Patch } from './types';

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

    // 路径前缀
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
        if (!group?.length) return;

        group.forEach((patch, patchIndex) => {
            if (!patch?.path) return;

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
    // 遍历每一个路径及其对应的操作
    for (const [path, operations] of patchesByPath.entries()) {
        if (!operations.length) continue;

        // 获取当前路径的所有父路径前缀
        const prefixes = pathPrefixMap.get(path) || [];

        // 遍历每一个父路径前缀
        for (const prefix of prefixes) {
            const parentOps = patchesByPath.get(prefix);

            if (!parentOps || !parentOps.length) continue;

            // 遍历父路径的每一个操作
            for (const parentOp of parentOps) {
                // 如果父路径的操作是 'remove'，它会与任何子路径上的操作冲突
                if (parentOp.patch.op === 'remove') {
                    const allConflictingOps = [parentOp, ...operations];
                    createConflictWithOperations(conflictsByPath, prefix, allConflictingOps);
                }
                // 如果父路径的操作是 'replace'，它可能会与子路径的操作冲突
                else if (parentOp.patch.op === 'replace') {
                    const isCompatibleReplace = operations.every(childOp => {
                        if (childOp.patch.op !== 'replace' && childOp.patch.op !== 'add') {
                            return false;
                        }

                        // 提取相对于父路径的子路径部分
                        const relativePath = path.substring(prefix.length);
                        // 获取父路径 'replace' 操作的值中对应子路径的值
                        const childValueInParent = getValueAtPath(
                            parentOp.patch.value,
                            relativePath
                        );

                        // 如果在父路径的值中找到了对应的子路径值，并且它们深度相等，则视为兼容
                        return (
                            childValueInParent !== undefined &&
                            deepEqual(childValueInParent, childOp.patch.value)
                        );
                    });

                    // 如果不兼容，则表示存在冲突
                    if (!isCompatibleReplace) {
                        // 冲突应该在父路径上报告，并包含来自双方的操作
                        const allConflictingOps = [parentOp, ...operations];
                        createConflictWithOperations(conflictsByPath, prefix, allConflictingOps);
                    }
                }
            }
        }
    }
};

const getValueAtPath = (obj: unknown, path: string): unknown => {
    if (!obj || typeof obj !== 'object' || !path) {
        return undefined;
    }

    const components = path.split('/').filter(Boolean);
    let current: unknown = obj;

    for (const component of components) {
        if (current === null || typeof current !== 'object') {
            return undefined;
        }

        if (Array.isArray(current)) {
            const index = parseInt(component, 10);
            if (isNaN(index) || index < 0 || index >= current.length) {
                return undefined;
            }
            current = current[index];
        } else {
            if (!(component in (current as object))) {
                return undefined;
            }
            current = (current as Record<string, unknown>)[component];
        }
    }

    return current;
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
    // 确保哈希唯一性
    if (!conflict.options.includes(op.patch.hash)) {
        conflict.options.push(op.patch.hash);
    }
};
