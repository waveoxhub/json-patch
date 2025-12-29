import {
    Patch,
    ConflictDetail,
    ConflictResolutions,
    CustomConflictResolution,
    ConflictOptionDetail,
} from './types/patch.js';
import { Schema } from './types/schema.js';
import { isObject, getSchemaForPath } from './utils/schemaUtils.js';
import { detectConflicts } from './detectConflicts.js';
import { parseJsonPath } from './utils/pathUtils.js';

/**
 * 验证结果类型
 */
export type ValidationResult = {
    readonly isValid: boolean;
    readonly errors: string[];
};

/**
 * 验证JSON字符串是否有效
 * @param jsonString JSON字符串
 * @returns 验证结果
 */
export const validateJson = (jsonString: string): ValidationResult => {
    const errors: string[] = [];

    try {
        JSON.parse(jsonString);
    } catch (error) {
        if (error instanceof Error) {
            errors.push(`JSON parse error: ${error.message}`);
        } else {
            errors.push('JSON parse error');
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};

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
        if (!patch.op || !['add', 'remove', 'replace', 'move'].includes(patch.op)) {
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

        // 验证 move 操作的 from 字段
        if (patch.op === 'move' && (!patch.from || typeof patch.from !== 'string')) {
            errors.push(`Patch #${index} move operation must include a valid "from" field`);
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
        errors.push('Conflicts must be an array');
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
            errors.push(`Resolution #${index} has invalid selectedHash`);
            return;
        }

        // 查找对应的冲突
        const conflict = conflicts.find(c => c.path === resolution.path);
        if (!conflict) {
            errors.push(
                `Resolution #${index} references a path "${resolution.path}" that doesn't exist in conflicts`
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
                `Resolution #${index} selects a hash "${resolution.selectedHash}" ` +
                    `that is not an option for conflict at path "${resolution.path}"`
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

    // 创建已解决冲突的补丁集合
    const allPatches = patches.flat();
    const resolvedPatchSet = new Set<Patch>();
    const conflictPaths = new Set<string>();

    // 收集所有冲突路径
    conflicts.forEach(conflict => {
        conflictPaths.add(conflict.path);

        // 找出选中的哈希值
        let selectedHash = conflict.options[0]?.hash; // 默认选第一个

        // 查找是否有针对此路径的解决方案
        const resolution = resolutions.find(res => res.path === conflict.path);
        if (resolution && conflict.options.some(opt => opt.hash === resolution.selectedHash)) {
            selectedHash = resolution.selectedHash;
        }

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

    // 检查应用解决方案后是否仍存在冲突
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

/**
 * 验证 JSON 补丁操作是否可以应用到 JSON 数据
 * @param jsonString - JSON 字符串
 * @param patches - 补丁数组
 * @param schema - 数据结构模式
 * @returns 验证结果
 */
export const validatePatchApplication = (
    jsonString: string,
    patches: ReadonlyArray<Patch>,
    schema: Schema
): ValidationResult => {
    const errors: string[] = [];

    // 首先验证 JSON 和补丁
    const jsonValid = validateJson(jsonString);
    if (!jsonValid.isValid) {
        return jsonValid;
    }

    const patchesValid = validatePatches(patches);
    if (!patchesValid.isValid) {
        return patchesValid;
    }

    // 验证 Schema
    if (!schema || !isObject(schema)) {
        errors.push('Schema is not a valid object');
        return { isValid: false, errors };
    }

    if (!('$type' in schema) || (schema.$type !== 'object' && schema.$type !== 'array')) {
        errors.push('Schema must have a valid $type of either "object" or "array"');
        return { isValid: false, errors };
    }

    try {
        const state = JSON.parse(jsonString);

        // 验证每个补丁操作是否可应用于当前状态
        for (const patch of patches) {
            // 跳过目标为根路径的空路径
            if (patch.path === '') {
                continue;
            }

            // 解析路径组件
            const pathComponents = parseJsonPath(patch.path);

            // 验证特定操作的要求
            if (patch.op === 'remove' || patch.op === 'replace') {
                // 对于 remove 和 replace 操作，路径必须存在于当前状态中
                if (!pathExists(state, pathComponents, schema)) {
                    errors.push(`Path "${patch.path}" does not exist for ${patch.op} operation`);
                }
            } else if (patch.op === 'add') {
                // 对于 add 操作，验证父路径存在（除非添加到根路径）
                if (pathComponents.length > 1) {
                    const parentComponents = pathComponents.slice(0, -1);
                    if (!pathExists(state, parentComponents, schema)) {
                        errors.push(
                            `Parent path does not exist for add operation at "${patch.path}"`
                        );
                    }
                }

                // 对于 add 操作，验证目标路径尚不存在
                // 强制执行严格的 "add" 语义 - add 只能创建新条目
                if (pathExists(state, pathComponents, schema)) {
                    errors.push(
                        `Path "${patch.path}" already exists, cannot perform add operation (use replace instead)`
                    );
                }

                // 根据 Schema 验证值类型
                const valueSchema = getSchemaForPath(schema, pathComponents);
                if (valueSchema && !validateValueAgainstSchema(patch.value, valueSchema)) {
                    errors.push(
                        `Value for add operation at "${patch.path}" does not match schema type`
                    );
                }
            }
        }
    } catch (error) {
        if (error instanceof Error) {
            errors.push(`Patch application validation error: ${error.message}`);
        } else {
            errors.push('Patch application validation error');
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};

/**
 * 检查路径是否存在于给定状态中
 * @param state - 当前状态
 * @param pathComponents - 路径组件数组
 * @param schema - Schema
 * @returns 路径是否存在
 */
const pathExists = (
    state: unknown,
    pathComponents: ReadonlyArray<string>,
    schema: Schema
): boolean => {
    if (!pathComponents.length) {
        return true;
    }

    let current: unknown = state;

    for (const component of pathComponents) {
        if (Array.isArray(current)) {
            // 通过索引或主键处理数组
            if (component.match(/^\d+$/)) {
                // 数字索引
                const index = parseInt(component, 10);
                if (index >= current.length) {
                    return false;
                }
                current = current[index];
            } else {
                // 主键查找

                if (
                    !schema ||
                    schema.$type !== 'array' ||
                    !schema.$item ||
                    schema.$item.$type !== 'object'
                ) {
                    return false;
                }

                const pkField = schema.$item.$pk;
                // 如果没有定义主键，无法通过主键查找
                if (!pkField) {
                    return false;
                }
                const item = current.find(
                    (i: unknown) =>
                        isObject(i) && (i as Record<string, unknown>)[pkField] === component
                );
                if (!item) {
                    return false;
                }
                current = item;
            }
        } else if (isObject(current)) {
            // 处理对象属性
            if (!(component in current)) {
                return false;
            }
            current = current[component];
        } else {
            // 无法继续导航
            return false;
        }
    }

    return true;
};

/**
 * 根据 Schema 验证值
 * @param value - 要验证的值
 * @param schema - 用于验证的 Schema
 * @returns 值是否符合 Schema
 */
const validateValueAgainstSchema = (value: unknown, schema: Schema): boolean => {
    if (!schema) {
        return true; // 无 Schema，假定有效
    }

    if (!('$type' in schema)) {
        return true; // 无效 Schema，假定有效
    }

    const schemaType = schema.$type;

    if (schemaType === 'object') {
        return isObject(value);
    } else if (schemaType === 'array') {
        return Array.isArray(value);
    } else {
        // 处理基本类型
        switch (schemaType) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number';
            case 'boolean':
                return typeof value === 'boolean';
            case 'null':
                return value === null;
            default:
                return true; // 未知类型，假定有效
        }
    }
};
