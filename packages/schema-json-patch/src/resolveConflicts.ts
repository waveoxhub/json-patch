import {
    Patch,
    ConflictDetail,
    ConflictResolutions,
    UnresolvedConflicts,
    CustomConflictResolutions,
} from './types/patch';

/**
 * 从所有补丁中找到与指定哈希匹配的补丁
 * @param patchGroups 补丁组数组
 * @param optionHash 选项哈希
 * @returns 匹配的补丁
 */
const findMatchingPatch = (
    patchGroups: ReadonlyArray<ReadonlyArray<Patch>>,
    optionHash: string
): Patch | undefined => {
    for (const group of patchGroups) {
        for (const patch of group) {
            if (patch.hash === optionHash) {
                return patch;
            }
        }
    }
    return undefined;
};

/**
 * 应用冲突解决方案生成处理后的补丁集
 * @param patchGroups 原始补丁组数组
 * @param conflicts 冲突详情数组
 * @param resolutions 冲突解决方案数组
 * @param customResolutions 自定义解决方案
 * @returns 处理后的补丁数组
 */
export const resolveConflicts = (
    patchGroups: ReadonlyArray<ReadonlyArray<Patch>>,
    conflicts: ReadonlyArray<ConflictDetail>,
    resolutions: ConflictResolutions,
    customResolutions: CustomConflictResolutions = []
): ReadonlyArray<Patch> => {
    if (conflicts.length === 0) {
        return patchGroups.flat();
    }

    const includedPatches = new Set<Patch>();

    conflicts.forEach(conflict => {
        const resolution = resolutions.find(res => res.path === conflict.path);

        if (resolution && conflict.options.includes(resolution.selectedHash)) {
            const matchingPatch = findMatchingPatch(patchGroups, resolution.selectedHash);
            if (matchingPatch) {
                includedPatches.add(matchingPatch);
            }
        } else if (conflict.options.length > 0) {
            // 如果没有指定解决方案，默认选择第一个选项
            const defaultHash = conflict.options[0];
            const matchingPatch = findMatchingPatch(patchGroups, defaultHash);
            if (matchingPatch) {
                includedPatches.add(matchingPatch);
            }
        }
    });

    // 收集非冲突路径的补丁
    const allPatches = patchGroups.flat();
    const conflictPaths = new Set(conflicts.map(conflict => conflict.path));
    const nonConflictPatches = allPatches.filter(patch => !conflictPaths.has(patch.path));

    // 合并补丁和自定义解决方案
    return [
        ...nonConflictPatches,
        ...Array.from(includedPatches),
        ...(customResolutions.length > 0 ? customResolutions.map(cr => cr.patch) : []),
    ];
};

/**
 * 冲突解决后生成合并的补丁
 * @param patches 原始补丁数组（多个组）
 * @param conflicts 冲突详情数组
 * @param resolutions 冲突解决选择
 * @param customResolutions 自定义解决方案
 * @returns 处理结果对象
 */
export const generateResolvedPatch = (
    patches: ReadonlyArray<ReadonlyArray<Patch>>,
    conflicts: ReadonlyArray<ConflictDetail>,
    resolutions: ConflictResolutions,
    customResolutions: CustomConflictResolutions = []
): { unresolvedConflicts: UnresolvedConflicts; resolvedPatches: ReadonlyArray<Patch> } => {
    if (patches.length === 0) {
        return { unresolvedConflicts: [], resolvedPatches: [] };
    }

    if (conflicts.length === 0) {
        return { unresolvedConflicts: [], resolvedPatches: patches.flat() };
    }

    // 收集所有未解决的冲突哈希值
    const unresolvedHashes = new Set<string>();
    conflicts.forEach(conflict => {
        const resolution = resolutions.find(r => r.path === conflict.path);
        if (!resolution) {
            conflict.options.forEach(hash => unresolvedHashes.add(hash));
        }
    });

    const resolvedPatches = resolveConflicts(patches, conflicts, resolutions, customResolutions);

    return {
        unresolvedConflicts: Array.from(unresolvedHashes),
        resolvedPatches,
    };
};

/**
 * 初始化冲突解决方案
 * @param conflicts 冲突详情数组
 * @returns 默认冲突解决方案
 */
export const initializeResolutions = (
    conflicts: ReadonlyArray<ConflictDetail>
): ConflictResolutions =>
    conflicts
        .filter(conflict => conflict.options.length > 0)
        .map(conflict => ({
            path: conflict.path,
            selectedHash: conflict.options[0],
        }));
