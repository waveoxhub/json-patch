import {
    Patch,
    ConflictDetail,
    ConflictResolutions,
    ConflictResult,
    CustomResolution,
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
    // 通过哈希值匹配
    return patches.find(patch => patch.hash === optionHash);
};

/**
 * 应用冲突解决方案生成处理后的补丁集
 * @param patches 原始补丁集合（所有补丁组的扁平数组）
 * @param conflicts 冲突详情数组
 * @param resolutions 冲突解决方案数组
 * @param customResolutions 自定义解决方案（可选）
 * @returns 处理后的补丁数组
 */
export const resolveConflicts = (
    patches: ReadonlyArray<Patch>,
    conflicts: ReadonlyArray<ConflictDetail>,
    resolutions: ConflictResolutions,
    customResolutions: ReadonlyArray<CustomResolution> = []
): ReadonlyArray<Patch> => {
    // 如果没有冲突，返回所有补丁
    if (conflicts.length === 0) {
        return [...patches];
    }

    // 创建要包含的补丁集合
    const includedPatches = new Set<Patch>();
    
    // 处理所有冲突
    conflicts.forEach((conflict) => {
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
    const resolvedPatches = [
        ...nonConflictPatches,
        ...Array.from(includedPatches)
    ];

    // 添加自定义解决方案
    if (customResolutions.length > 0) {
        return [...resolvedPatches, ...customResolutions.map(cr => cr.patch)];
    }

    return resolvedPatches;
};

/**
 * 处理补丁冲突并生成冲突结果
 * @param patches 多个补丁组
 * @param conflicts 冲突详情数组
 * @returns 包含冲突信息的结果对象
 */
export const processConflicts = (
    patches: ReadonlyArray<ReadonlyArray<Patch>>,
    conflicts: ReadonlyArray<ConflictDetail>
): ConflictResult => {
    if (conflicts.length === 0) {
        // 没有冲突，返回所有补丁的扁平数组
        const allPatches = patches.flat();
        return {
            hasConflicts: false,
            conflicts: [],
            resolvedPatches: allPatches,
        };
    }

    return {
        hasConflicts: true,
        conflicts: conflicts as ConflictDetail[],
        resolvedPatches: [], // 默认为空，冲突解决后填充
    };
};

/**
 * 冲突解决后生成合并的补丁
 * @param patches 原始补丁数组（多个组）
 * @param conflicts 冲突详情数组
 * @param resolutions 冲突解决选择
 * @param customResolutions 自定义解决方案（可选）
 * @returns 冲突解决结果对象
 */
export const generateResolvedPatch = (
    patches: ReadonlyArray<ReadonlyArray<Patch>>,
    conflicts: ReadonlyArray<ConflictDetail>,
    resolutions: ConflictResolutions,
    customResolutions: ReadonlyArray<CustomResolution> = []
): ConflictResult => {
    // 扁平化所有补丁
    const allPatches = patches.flat();

    if (allPatches.length === 0) {
        return {
            hasConflicts: false,
            conflicts: [],
            resolvedPatches: [],
        };
    }

    // 如果没有冲突，返回所有补丁
    if (conflicts.length === 0) {
        return {
            hasConflicts: false,
            conflicts: [],
            resolvedPatches: allPatches as Patch[],
        };
    }

    // 应用冲突解决方案
    const resolvedPatches = resolveConflicts(allPatches, conflicts, resolutions, customResolutions);

    return {
        hasConflicts: true,
        conflicts: conflicts as ConflictDetail[],
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

    // 为每个冲突选项初始化解决方案
    conflicts.forEach(conflict => {
        // 默认选择每个冲突的第一个选项
        if (conflict.options.length > 0) {
            initialResolutions.push({
                path: conflict.path,
                selectedHash: conflict.options[0]
            });
        }
    });

    return initialResolutions;
};
