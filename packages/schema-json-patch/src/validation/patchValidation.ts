import { Patch } from '../types/patch.js';
import { ValidationResult } from './types.js';

/**
 * 验证补丁数组是否有效
 * @param patches 补丁数组
 * @returns 验证结果
 */
export const validatePatches = (patches: ReadonlyArray<Patch>): ValidationResult => {
    const errors: string[] = [];

    if (!Array.isArray(patches)) {
        errors.push('Patches must be an array');
        return { isValid: false, errors };
    }

    patches.forEach((patch, index) => {
        if (!patch || typeof patch !== 'object') {
            errors.push(`Patch #${index} is not a valid object`);
            return;
        }

        // 验证补丁操作类型
        if (!patch.op || !['add', 'remove', 'replace'].includes(patch.op)) {
            errors.push(`Patch #${index} has invalid operation type: ${patch.op}`);
        }

        // 验证补丁路径
        if (!patch.path || typeof patch.path !== 'string') {
            errors.push(`Patch #${index} has invalid path`);
        } else if (!patch.path.startsWith('/') && patch.path !== '') {
            errors.push(`Patch #${index} path must start with / or be empty`);
        }

        // 验证补丁值
        if ((patch.op === 'add' || patch.op === 'replace') && patch.value === undefined) {
            errors.push(`Patch #${index} ${patch.op} operation must include a value`);
        }

        // 验证哈希值
        if (!patch.hash || typeof patch.hash !== 'string') {
            errors.push(`Patch #${index} must have a valid hash string`);
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
    };
};

/**
 * 验证补丁组数组是否有效
 * @param patchGroups 补丁组数组
 * @returns 验证结果
 */
export const validatePatchGroups = (
    patchGroups: ReadonlyArray<ReadonlyArray<Patch>>
): ValidationResult => {
    const errors: string[] = [];

    if (!Array.isArray(patchGroups)) {
        errors.push('Patch groups must be an array');
        return { isValid: false, errors };
    }

    patchGroups.forEach((group, groupIndex) => {
        if (!Array.isArray(group)) {
            errors.push(`Patch group #${groupIndex} is not a valid array`);
            return;
        }

        const groupResult = validatePatches(group);
        if (!groupResult.isValid) {
            errors.push(`Patch group #${groupIndex} contains invalid patches:`);
            groupResult.errors.forEach(error => {
                errors.push(`  - ${error}`);
            });
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
    };
};
