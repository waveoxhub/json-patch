import {
    Patch,
    ConflictDetail,
    ConflictResolutions,
    ConflictResult,
    CustomResolution,
} from './types/patch';

/**
 * 从所有补丁中找到与指定选项匹配的补丁
 * @param patches 所有补丁数组
 * @param optionHash 选项哈希
 * @param optionPath 选项路径
 * @param optionOperation 选项操作类型
 * @param optionValue 选项值
 * @returns 匹配的补丁
 */
const findMatchingPatch = (
    patches: ReadonlyArray<Patch>,
    optionHash: string,
    optionPath: string,
    optionOperation: string,
    optionValue?: unknown
): Patch | undefined => {
    // 优先通过哈希值快速匹配
    const patchByHash = patches.find(patch => patch.hash === optionHash);
    if (patchByHash) {
        return patchByHash;
    }
    
    // 如果找不到匹配的哈希，则回退到路径、操作和值的匹配
    return patches.find(patch => 
        patch.path === optionPath && 
        patch.op === optionOperation && 
        JSON.stringify(patch.value) === JSON.stringify(optionValue)
    );
};

/**
 * 应用冲突解决方案生成处理后的补丁集
 * @param patches 原始补丁集合（所有补丁组的扁平数组）
 * @param conflicts 冲突详情数组
 * @param resolutions 基于哈希键的冲突解决选择
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
        // 找出选中的选项
        let selectedOption = conflict.options[0]; // 默认选第一个
        
        // 查找用户选择的选项
        for (const option of conflict.options) {
            if (resolutions[option.hash] !== undefined) {
                const selectedIndex = resolutions[option.hash];
                // 找到对应选项索引的选项
                selectedOption = conflict.options[selectedIndex] || selectedOption;
                break;
            }
        }
        
        // 找到选中选项对应的补丁并加入包含集合
        const matchingPatch = findMatchingPatch(
            patches, 
            selectedOption.hash,
            selectedOption.path, 
            selectedOption.operation, 
            selectedOption.value
        );
        
        if (matchingPatch) {
            includedPatches.add(matchingPatch);
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
    const initialResolutions: ConflictResolutions = {};

    // 为每个冲突选项初始化解决方案
    conflicts.forEach(conflict => {
        // 默认选择每个冲突的第一个选项
        if (conflict.options.length > 0) {
            initialResolutions[conflict.options[0].hash] = 0;
        }
    });

    return initialResolutions;
};
