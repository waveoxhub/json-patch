import { Schema } from './types/schema';
import { PatchOperation, Patch } from './types/patch';
import { extractPathMap } from './utils/pathUtils';
import { deepEqual } from './utils/deepEqual';
import { generatePatchOptionHash } from './utils/hashUtils';

/**
 * 创建补丁对象
 * @param op 操作类型
 * @param path 路径
 * @param value 值(可选)
 * @returns 补丁
 */
const createPatch = (op: PatchOperation, path: string, value?: unknown): Patch => {
    return value !== undefined
        ? {
              op,
              path,
              value,
              hash: generatePatchOptionHash(op, path, value),
          }
        : {
              op,
              path,
              hash: generatePatchOptionHash(op, path, value),
          };
};

/**
 * 路径处理状态的接口
 */
interface PathProcessingState {
    handledPaths: Set<string>;
    allPaths: string[];
}

/**
 * 根据 Schema 生成两个对象之间的补丁
 *
 * @param schema - 数据结构模式
 * @param sourceJson - 源数据
 * @param targetJson - 目标数据
 * @returns 补丁数组
 */
export const generatePatches = (
    schema: Schema,
    sourceJson: string,
    targetJson: string
): ReadonlyArray<Patch> => {
    const sourceData = JSON.parse(sourceJson);
    const targetData = JSON.parse(targetJson);
    const sourcePathMap = extractPathMap(schema, sourceData);
    const targetPathMap = extractPathMap(schema, targetData);
    const patches: Patch[] = [];

    // 处理顶层数组
    if (schema.$type === 'array' && schema.$item.$type === 'object' && schema.$item.$pk) {
        if (!Array.isArray(sourceData) || !Array.isArray(targetData)) {
            throw new Error('Type mismatch: array expected');
        }

        const pkField = schema.$item.$pk;
        const sourceIdMap = new Map(sourceData.map((item, index) => [item[pkField], index]));
        const targetIdMap = new Map(targetData.map((item, index) => [item[pkField], index]));

        // 处理已删除的项目
        for (const [id] of sourceIdMap) {
            if (!targetIdMap.has(id)) {
                patches.push(createPatch('remove', `/${id}`));
            }
        }

        // 处理新增和修改的项目
        for (const [id, targetIndex] of targetIdMap.entries()) {
            const item = targetData[targetIndex];

            if (!sourceIdMap.has(id)) {
                // 新项目
                patches.push(createPatch('add', `/${id}`, item));
            } else {
                // 修改的项目
                const sourceIndex = sourceIdMap.get(id)!;
                const sourceItem = sourceData[sourceIndex];

                if (!deepEqual(sourceItem, item)) {
                    const itemPath = `/${id}`;
                    const state: PathProcessingState = {
                        handledPaths: new Set<string>(),
                        allPaths: Array.from(
                            new Set([...sourcePathMap.keys(), ...targetPathMap.keys()])
                        ),
                    };

                    generateObjectFieldPatches(
                        itemPath,
                        sourceItem as Record<string, unknown>,
                        item as Record<string, unknown>,
                        patches,
                        state,
                        schema.$item
                    );
                }
            }
        }

        return optimizePatches(patches);
    }

    // 处理顶层对象
    if (
        schema.$type === 'object' &&
        typeof sourceData === 'object' &&
        sourceData !== null &&
        typeof targetData === 'object' &&
        targetData !== null
    ) {
        const sourceObj = sourceData as Record<string, unknown>;
        const targetObj = targetData as Record<string, unknown>;

        // 按路径深度排序，浅层路径优先
        const allPaths = Array.from(
            new Set([...sourcePathMap.keys(), ...targetPathMap.keys()])
        ).sort((a, b) => {
            const depthA = a.split('/').length;
            const depthB = b.split('/').length;
            return depthA !== depthB ? depthA - depthB : a.localeCompare(b);
        });

        const state: PathProcessingState = {
            handledPaths: new Set<string>(),
            allPaths,
        };

        generateObjectFieldPatches('/', sourceObj, targetObj, patches, state, schema);

        return optimizePatches(patches);
    }

    throw new Error('Unsupported schema type');
};

/**
 * 构建路径字符串，处理斜杠问题
 */
const buildPath = (basePath: string, key: string): string =>
    basePath.endsWith('/') ? `${basePath}${key}` : `${basePath}/${key}`;

/**
 * 为对象字段生成补丁
 */
const generateObjectFieldPatches = (
    path: string,
    sourceObj: Record<string, unknown>,
    targetObj: Record<string, unknown>,
    patches: Patch[],
    state: PathProcessingState,
    schema: Schema
): void => {
    if (!deepEqual(sourceObj, targetObj)) {
        const shouldReplaceWhole = (): boolean => {
            // 对于包含非对象成员的数组，替换整个数组
            if (schema.$type === 'array' && schema.$item && schema.$item.$type !== 'object') {
                return true;
            }

            const sourceKeys = Object.keys(sourceObj);
            const targetKeys = Object.keys(targetObj);

            // 如果添加/删除了多个属性，使用整体替换
            const addedKeys = targetKeys.filter(k => !sourceKeys.includes(k));
            const removedKeys = sourceKeys.filter(k => !targetKeys.includes(k));

            if (addedKeys.length > 1 || removedKeys.length > 1) {
                return true;
            }

            // 对于单属性对象，避免整体替换
            const commonKeys = sourceKeys.filter(k => targetKeys.includes(k));
            if (commonKeys.length === 1) {
                return false;
            }

            // 当所有公共字段都发生变化且公共字段数大于1时，使用整体替换
            let changedCount = 0;
            for (const key of commonKeys) {
                if (!deepEqual(sourceObj[key], targetObj[key])) {
                    changedCount++;
                }
            }

            return commonKeys.length > 1 && changedCount === commonKeys.length;
        };

        if (shouldReplaceWhole()) {
            patches.push(createPatch('replace', path === '/' ? '' : path, targetObj));
            state.handledPaths.add(path);

            const allKeys = [...new Set([...Object.keys(sourceObj), ...Object.keys(targetObj)])];
            for (const key of allKeys) {
                state.handledPaths.add(buildPath(path, key));
            }
            return;
        }
    }

    const sourceKeys = Object.keys(sourceObj);
    const targetKeys = Object.keys(targetObj);

    // 处理删除的字段
    for (const key of sourceKeys) {
        if (!targetKeys.includes(key)) {
            const fieldPath = buildPath(path, key);
            if (state.handledPaths.has(fieldPath)) continue;

            patches.push(createPatch('remove', fieldPath));
            state.handledPaths.add(fieldPath);
        }
    }

    // 处理新增和修改的字段
    for (const key of targetKeys) {
        const fieldPath = buildPath(path, key);
        if (state.handledPaths.has(fieldPath)) continue;

        if (!sourceKeys.includes(key)) {
            patches.push(createPatch('add', fieldPath, targetObj[key]));
            state.handledPaths.add(fieldPath);
        } else if (!deepEqual(sourceObj[key], targetObj[key])) {
            const sourceValue = sourceObj[key];
            const targetValue = targetObj[key];

            // 获取字段模式
            let fieldSchema: Schema | undefined;
            if (schema.$type === 'object' && schema.$fields && key in schema.$fields) {
                fieldSchema = schema.$fields[key] as Schema;
            } else if (schema.$type === 'array' && schema.$item) {
                fieldSchema = schema.$item as Schema;
            }

            // 处理嵌套对象
            if (
                fieldSchema &&
                typeof sourceValue === 'object' &&
                sourceValue !== null &&
                typeof targetValue === 'object' &&
                targetValue !== null
            ) {
                // 检查是否嵌套数组并且有主键
                if (
                    fieldSchema.$type === 'array' &&
                    fieldSchema.$item.$type === 'object' &&
                    fieldSchema.$item.$pk &&
                    Array.isArray(sourceValue) &&
                    Array.isArray(targetValue)
                ) {
                    const pkField = fieldSchema.$item.$pk;
                    const sourceArray = sourceValue as Array<Record<string, unknown>>;
                    const targetArray = targetValue as Array<Record<string, unknown>>;

                    const sourceIdMap = new Map(
                        sourceArray.map((item, index) => [item[pkField], index])
                    );
                    const targetIdMap = new Map(
                        targetArray.map((item, index) => [item[pkField], index])
                    );

                    // 处理删除的项目
                    for (const [id] of sourceIdMap.entries()) {
                        if (!targetIdMap.has(id)) {
                            const itemPath = buildPath(fieldPath, String(id));
                            if (state.handledPaths.has(itemPath)) continue;

                            patches.push(createPatch('remove', itemPath));
                            state.handledPaths.add(itemPath);
                        }
                    }

                    // 处理新增和修改的项目
                    for (const [id, targetIndex] of targetIdMap.entries()) {
                        const targetItem = targetArray[targetIndex];
                        const itemPath = buildPath(fieldPath, String(id));
                        if (state.handledPaths.has(itemPath)) continue;

                        if (!sourceIdMap.has(id)) {
                            patches.push(createPatch('add', itemPath, targetItem));
                            state.handledPaths.add(itemPath);
                        } else {
                            const sourceIndex = sourceIdMap.get(id)!;
                            const sourceItem = sourceArray[sourceIndex];

                            if (!deepEqual(sourceItem, targetItem)) {
                                generateObjectFieldPatches(
                                    itemPath,
                                    sourceItem,
                                    targetItem,
                                    patches,
                                    state,
                                    fieldSchema.$item
                                );
                            }
                        }
                    }
                } else {
                    // 常规对象或没有主键的数组
                    generateObjectFieldPatches(
                        fieldPath,
                        sourceValue as Record<string, unknown>,
                        targetValue as Record<string, unknown>,
                        patches,
                        state,
                        fieldSchema
                    );
                }
            } else {
                // 简单值使用替换操作
                patches.push(createPatch('replace', fieldPath, targetValue));
                state.handledPaths.add(fieldPath);
            }
        }
    }
};

/**
 * 获取操作优先级
 */
const getOperationPriority = (op: string): number => {
    switch (op) {
        case 'remove':
            return 0;
        case 'replace':
            return 1;
        case 'add':
            return 2;
        default:
            return 3;
    }
};

/**
 * 优化补丁列表
 */
const optimizePatches = (patches: Patch[]): ReadonlyArray<Patch> => {
    if (patches.length <= 1) return patches;

    // 按操作类型和路径深度排序
    const sortedPatches = [...patches].sort((a, b) => {
        const priorityA = getOperationPriority(a.op);
        const priorityB = getOperationPriority(b.op);

        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }

        // 从浅到深排序
        const depthA = a.path.split('/').filter(Boolean).length;
        const depthB = b.path.split('/').filter(Boolean).length;

        return depthA - depthB;
    });

    // 记录已处理的路径
    const coveredPaths = new Set<string>();
    const optimized: Patch[] = [];

    // 添加未覆盖的补丁
    for (const patch of sortedPatches) {
        let isCovered = false;
        for (const covered of coveredPaths) {
            if (patch.path.startsWith(covered + '/') || patch.path === covered) {
                isCovered = true;
                break;
            }
        }

        if (!isCovered) {
            optimized.push(patch);
            if (patch.op === 'replace' || patch.op === 'add') {
                coveredPaths.add(patch.path);
            }
        }
    }

    return optimized;
};
