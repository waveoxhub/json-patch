import { Patch, ConflictDetail } from '../types/patch.js';
import { Schema } from '../types/schema.js';
import { isObject } from '../utils/isObject.js';
import { parseJsonPath } from '../utils/pathUtils.js';
import { ValidationResult } from './types.js';
import { validateJson } from './jsonValidation.js';
import { validatePatches } from './patchValidation.js';

/**
 * 验证补丁操作是否可以应用到JSON上
 * @param jsonString JSON字符串
 * @param patches 补丁数组
 * @param schema 数据结构模式
 * @returns 验证结果
 */
export const validatePatchApplication = (
    jsonString: string,
    patches: ReadonlyArray<Patch>,
    schema: Schema
): ValidationResult => {
    const errors: string[] = [];

    // 首先验证JSON和补丁
    const jsonValid = validateJson(jsonString);
    if (!jsonValid.isValid) {
        return jsonValid;
    }

    const patchesValid = validatePatches(patches);
    if (!patchesValid.isValid) {
        return patchesValid;
    }

    // 验证模式
    if (!schema || !isObject(schema)) {
        errors.push('Schema must be a valid object');
        return { isValid: false, errors };
    }

    if (!('$type' in schema) || (schema.$type !== 'object' && schema.$type !== 'array')) {
        errors.push('Schema must have a valid $type field with value "object" or "array"');
        return { isValid: false, errors };
    }

    try {
        const state = JSON.parse(jsonString);

        // 验证每个补丁操作是否可应用到当前状态
        for (const patch of patches) {
            // 跳过目标为根的空路径
            if (patch.path === '') {
                continue;
            }

            // 解析路径组件
            const pathComponents = parseJsonPath(patch.path);

            // 验证操作特定要求
            if (patch.op === 'remove' || patch.op === 'replace') {
                // 对于删除和替换操作，路径必须存在于当前状态
                if (!pathExists(state, pathComponents, schema)) {
                    errors.push(
                        `Path "${patch.path}" does not exist, cannot perform ${patch.op} operation`
                    );
                }
            } else if (patch.op === 'add') {
                // 对于添加操作，验证父路径是否存在（除非是添加到根）
                if (pathComponents.length > 1) {
                    const parentComponents = pathComponents.slice(0, -1);
                    if (!pathExists(state, parentComponents, schema)) {
                        errors.push(`Parent path for add operation "${patch.path}" does not exist`);
                    }
                }

                // 根据模式验证值类型
                const valueSchema = getSchemaForPath(schema, pathComponents);
                if (valueSchema && !validateValueAgainstSchema(patch.value, valueSchema)) {
                    errors.push(
                        `Add operation value for path "${patch.path}" does not conform to schema type requirements`
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
 * 验证冲突是否符合JSON模式
 * @param conflicts 冲突详情数组
 * @param schema JSON模式对象
 * @param patches 所有补丁的数组（用于查找哈希对应的补丁）
 * @returns 验证结果
 */
export const validateConflictsAgainstSchema = (
    conflicts: ReadonlyArray<ConflictDetail>,
    schema: Schema,
    patches?: ReadonlyArray<Patch>
): ValidationResult => {
    const errors: string[] = [];

    if (!Array.isArray(conflicts)) {
        errors.push('Conflicts list must be an array');
        return { isValid: false, errors };
    }

    // 如果没有提供补丁数组，无法验证
    if (!patches || patches.length === 0) {
        errors.push('Patch array is required to validate conflicts against schema');
        return { isValid: false, errors };
    }

    // 检查每个冲突是否符合模式
    conflicts.forEach((conflict, conflictIndex) => {
        const pathComponents = parseJsonPath(conflict.path);
        const schemaForPath = getSchemaForPath(schema, pathComponents);

        // 如果没有找到路径对应的模式，跳过验证
        if (!schemaForPath || typeof schemaForPath !== 'object') {
            return;
        }

        // 验证每个选项的补丁
        conflict.options.forEach((option, optionIndex) => {
            const patch = option.patch;

            // 跳过非添加/替换操作
            if (patch.op !== 'add' && patch.op !== 'replace') {
                return;
            }

            // 验证值是否符合模式
            if (!validateValueAgainstSchema(patch.value, schemaForPath)) {
                errors.push(
                    `Option #${optionIndex} (hash: ${option.hash}) for conflict #${conflictIndex}: ` +
                        `value does not conform to schema requirements`
                );
            }
        });
    });

    return {
        isValid: errors.length === 0,
        errors,
    };
};

/**
 * 检查路径是否存在于给定状态中
 * @param state 当前状态
 * @param pathComponents 路径组件
 * @param schema 模式
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

    let current: any = state;

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
                const item = current.find((i: any) => isObject(i) && i[pkField] === component);
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
 * 获取特定路径的模式
 * @param schema 基础模式
 * @param pathComponents 路径组件
 * @returns 路径的模式或undefined
 */
const getSchemaForPath = (
    schema: Schema,
    pathComponents: ReadonlyArray<string>
): Schema | undefined => {
    if (!pathComponents.length) {
        return schema;
    }

    let currentSchema = schema;

    for (const component of pathComponents) {
        if (!currentSchema) {
            return undefined;
        }

        if (currentSchema.$type === 'object' && '$fields' in currentSchema) {
            // 导航对象字段
            currentSchema = currentSchema.$fields[component] as Schema;
        } else if (currentSchema.$type === 'array' && '$item' in currentSchema) {
            // 对于数组，继续使用项目模式
            currentSchema = currentSchema.$item as Schema;
        } else {
            // 无法继续导航
            return undefined;
        }
    }

    return currentSchema;
};

/**
 * 验证值是否符合模式
 * @param value 要验证的值
 * @param schema 验证的模式
 * @returns 值是否符合模式
 */
const validateValueAgainstSchema = (value: unknown, schema: Schema): boolean => {
    if (!schema) {
        return true; // 无模式，假定有效
    }

    if (!('$type' in schema)) {
        return true; // 无效模式，假定有效
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
