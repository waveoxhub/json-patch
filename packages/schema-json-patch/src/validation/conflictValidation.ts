import {
    Patch,
    ConflictDetail,
    ConflictResolutions,
    CustomConflictResolution,
    ConflictOptionDetail,
} from '../types/patch.js';
import { ValidationResult } from './types.js';
import { detectConflicts } from '../detectConflicts.js';

/**
 * 验证解决方案是否有效
 * @param conflicts 冲突详情
 * @param resolutions 冲突解决方案数组
 * @returns 验证结果
 */
export const validateResolutions = (
    conflicts: ReadonlyArray<ConflictDetail>,
    resolutions: ConflictResolutions
): ValidationResult => {
    const errors: string[] = [];

    if (!Array.isArray(conflicts)) {
        errors.push('Conflicts list must be an array');
        return { isValid: false, errors };
    }

    if (!Array.isArray(resolutions)) {
        errors.push('Resolutions must be an array');
        return { isValid: false, errors };
    }

    // 检查每个解决方案是否有合法的路径和选中的哈希值
    resolutions.forEach((resolution, index) => {
        if (!resolution.path || typeof resolution.path !== 'string') {
            errors.push(`Resolution #${index} has invalid path`);
            return;
        }

        if (!resolution.selectedHash || typeof resolution.selectedHash !== 'string') {
            errors.push(`Resolution #${index} has invalid selected hash`);
            return;
        }

        // 查找对应的冲突
        const conflict = conflicts.find(c => c.path === resolution.path);
        if (!conflict) {
            errors.push(
                `Resolution #${index} references non-existent conflict path "${resolution.path}"`
            );
            return;
        }

        // 验证选中的哈希是否在冲突选项中
        if (
            !conflict.options.some(
                (opt: ConflictOptionDetail) => opt.hash === resolution.selectedHash
            )
        ) {
            errors.push(
                `Resolution #${index} selected hash "${resolution.selectedHash}" ` +
                    `is not an option for conflict at path "${resolution.path}"`
            );
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
    };
};

/**
 * 验证应用解决方案后是否仍存在冲突
 * @param patches 原始补丁组
 * @param conflicts 冲突详情
 * @param resolutions 解决方案
 * @param customResolutions 自定义解决方案
 * @returns 验证结果
 */
export const validateResolvedConflicts = (
    patches: ReadonlyArray<ReadonlyArray<Patch>>,
    conflicts: ReadonlyArray<ConflictDetail>,
    resolutions: ConflictResolutions,
    customResolutions: ReadonlyArray<CustomConflictResolution> = []
): ValidationResult => {
    const errors: string[] = [];

    // 首先验证解决方案是否有效
    const resolutionsValid = validateResolutions(conflicts, resolutions);
    if (!resolutionsValid.isValid) {
        return resolutionsValid;
    }

    // 检查是否所有冲突都有对应的解决方案
    const resolvedPaths = new Set(resolutions.map(res => res.path));
    const unresolvedConflicts = conflicts.filter(conflict => !resolvedPaths.has(conflict.path));

    if (unresolvedConflicts.length > 0) {
        errors.push(`There are ${unresolvedConflicts.length} unresolved conflicts`);

        unresolvedConflicts.forEach(conflict => {
            errors.push(`  - Path ${conflict.path} has no resolution`);
        });

        return {
            isValid: false,
            errors,
        };
    }

    // 创建已解决冲突的补丁集合
    const allPatches = patches.flat();
    const resolvedPatchSet = new Set<Patch>();
    const conflictPaths = new Set<string>();

    // 收集所有冲突路径
    conflicts.forEach(conflict => {
        conflictPaths.add(conflict.path);

        // 找出选中的哈希值
        const resolution = resolutions.find(res => res.path === conflict.path);
        const selectedHash =
            resolution && conflict.options.some(opt => opt.hash === resolution.selectedHash)
                ? resolution.selectedHash
                : conflict.options[0]?.hash;

        // 找到匹配哈希值的补丁
        const matchingPatch = allPatches.find(patch => patch.hash === selectedHash);

        if (matchingPatch) {
            resolvedPatchSet.add(matchingPatch);
        }
    });

    // 添加非冲突补丁
    const nonConflictPatches = allPatches.filter(patch => !conflictPaths.has(patch.path));
    const resolvedPatches = [
        ...nonConflictPatches,
        ...Array.from(resolvedPatchSet),
        ...(customResolutions?.map(cr => cr.patch) || []),
    ];

    // 检查解决方案应用后是否仍有冲突
    const remainingConflicts = detectConflicts([resolvedPatches]);

    if (remainingConflicts.length > 0) {
        errors.push(
            `There are still ${remainingConflicts.length} conflicts after applying resolutions`
        );

        remainingConflicts.forEach(conflict => {
            errors.push(`  - Path ${conflict.path} has unresolved conflicts`);
        });
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};
