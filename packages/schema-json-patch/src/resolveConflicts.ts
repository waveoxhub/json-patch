import {
    Patch,
    ConflictDetail,
    ConflictResolutions,
    UnresolvedConflicts,
    CustomConflictResolutions,
} from './types/patch';

/**
 * 从所有补丁中找到与指定哈希匹配的补丁
 * @param patches 所有补丁数组
 * @param optionHash 选项哈希
 * @returns 匹配的补丁
 */
const findMatchingPatch = (
    patches: ReadonlyArray<Patch>,
    optionHash: string
): Patch | undefined => {
    return patches.find(patch => patch.hash === optionHash);
};

/**
 * 应用冲突解决方案生成处理后的补丁集
 * @param patches 原始补丁集合（所有补丁组的扁平数组）
 * @param conflicts 冲突详情数组
 * @param resolutions 冲突解决方案数组
 * @param customResolutions 自定义解决方案
 * @returns 处理后的补丁数组
 */
export const resolveConflicts = (
    patches: ReadonlyArray<Patch>,
    conflicts: ReadonlyArray<ConflictDetail>,
    resolutions: ConflictResolutions,
    customResolutions: CustomConflictResolutions
): ReadonlyArray<Patch> => {
    // 如果没有冲突，返回所有补丁
    if (conflicts.length === 0) {
        return [...patches];
    }

    // 创建要包含的补丁集合
    const includedPatches = new Set<Patch>();

    // 处理所有冲突
    conflicts.forEach(conflict => {
        // 找出相应路径的解决方案
        const resolution = resolutions.find(res => res.path === conflict.path);

        if (resolution && conflict.options.includes(resolution.selectedHash)) {
            // 找到选中哈希对应的补丁并加入包含集合
            const matchingPatch = findMatchingPatch(patches, resolution.selectedHash);

            if (matchingPatch) {
                includedPatches.add(matchingPatch);
            }
        } else {
            // 如果没有指定解决方案，默认选择第一个选项
            if (conflict.options.length > 0) {
                const defaultHash = conflict.options[0];
                const matchingPatch = findMatchingPatch(patches, defaultHash);

                if (matchingPatch) {
                    includedPatches.add(matchingPatch);
                }
            }
        }
    });

    // 收集非冲突路径的补丁
    const conflictPaths = new Set(conflicts.map(conflict => conflict.path));
    const nonConflictPatches = patches.filter(patch => !conflictPaths.has(patch.path));

    // 合并非冲突补丁和选中的冲突补丁
    const resolvedPatches = [...nonConflictPatches, ...Array.from(includedPatches)];

    // 添加自定义解决方案
    if (customResolutions.length > 0) {
        return [...resolvedPatches, ...customResolutions.map(cr => cr.patch)];
    }

    return resolvedPatches;
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
    customResolutions: CustomConflictResolutions
): { unresolvedConflicts: UnresolvedConflicts; resolvedPatches: ReadonlyArray<Patch> } => {
    // 扁平化所有补丁
    const allPatches = patches.flat();

    if (allPatches.length === 0) {
        return {
            unresolvedConflicts: [],
            resolvedPatches: [],
        };
    }

    // 如果没有冲突，返回所有补丁
    if (conflicts.length === 0) {
        return {
            unresolvedConflicts: [],
            resolvedPatches: allPatches as Patch[],
        };
    }

    // 收集所有未解决的冲突哈希值
    const unresolvedHashes = new Set<string>();
    conflicts.forEach(conflict => {
        const resolution = resolutions.find(r => r.path === conflict.path);
        if (!resolution) {
            // 未解决的冲突
            conflict.options.forEach(hash => unresolvedHashes.add(hash));
        }
    });

    // 应用冲突解决方案
    const resolvedPatches = resolveConflicts(allPatches, conflicts, resolutions, customResolutions);

    return {
        unresolvedConflicts: Array.from(unresolvedHashes),
        resolvedPatches: resolvedPatches as Patch[],
    };
};

/**
 * 初始化冲突解决方案
 * @param conflicts 冲突详情数组
 * @returns 默认冲突解决方案
 */
export const initializeResolutions = (
    conflicts: ReadonlyArray<ConflictDetail>
): ConflictResolutions => {
    const initialResolutions: ConflictResolutions = [];

    conflicts.forEach(conflict => {
        // 默认选择每个冲突的第一个选项
        if (conflict.options.length > 0) {
            initialResolutions.push({
                path: conflict.path,
                selectedHash: conflict.options[0],
            });
        }
    });

    return initialResolutions;
};
