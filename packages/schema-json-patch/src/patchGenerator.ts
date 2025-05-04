import { Schema } from './types/schema';
import { Patch } from './types/patch';
import { extractPathMap } from './utils/pathUtils';
import { deepEqual } from './utils/deepEqual';
import { generatePatchOptionHash } from './utils/hashUtils';

/**
 * 创建带有哈希值的补丁对象
 * @param op 操作类型
 * @param path 路径
 * @param value 值(可选)
 * @returns 带有哈希值的补丁
 */
const createPatchWithHash = (op: 'add' | 'remove' | 'replace', path: string, value?: unknown): Patch => {
    // 使用类型断言解决只读属性赋值问题
    const patch = {
        op,
        path
    } as Patch;
    
    if (value !== undefined) {
        (patch as any).value = value;
    }
    
    // 生成并添加哈希值
    (patch as any).hash = generatePatchOptionHash(path, value);
    
    return patch;
};

/**
 * 路径处理状态的接口
 */
interface PathProcessingState {
    handledPaths: Set<string>;
    allPaths: string[];
}

/**
 * 根据模式生成两个对象之间的补丁
 *
 * @param schema - 数据结构模式
 * @param sourceData - 源数据
 * @param targetData - 目标数据
 * @returns 补丁数组
 */
export const generatePatches = (
    schema: Schema,
    sourceJson: string,
    targetJson: string
): ReadonlyArray<Patch> => {
    // 解析输入的JSON数据
    const sourceData = JSON.parse(sourceJson);
    const targetData = JSON.parse(targetJson);
    // 提取路径映射
    const sourcePathMap = extractPathMap(schema, sourceData);
    const targetPathMap = extractPathMap(schema, targetData);
    const patches: Patch[] = [];

    // 检查是否为带有主键的顶层数组
    if (
        schema.$type === 'array' &&
        schema.$item &&
        schema.$item.$type === 'object' &&
        schema.$item.$pk
    ) {
        const pkField = schema.$item.$pk;
        if (!Array.isArray(sourceData) || !Array.isArray(targetData)) {
            throw new Error('Type mismatch: array expected');
        }

        // 创建ID到索引的映射
        const sourceIdMap = new Map(sourceData.map((item, index) => [item[pkField], index]));
        const targetIdMap = new Map(targetData.map((item, index) => [item[pkField], index]));

        // 处理已删除的项目
        for (const [id] of sourceIdMap) {
            if (!targetIdMap.has(id)) {
                patches.push(createPatchWithHash('remove', `/${id}`));
            }
        }

        // 处理新增和修改的项目
        for (let targetIndex = 0; targetIndex < targetData.length; targetIndex++) {
            const item = targetData[targetIndex];
            const id = item[pkField];

            if (!sourceIdMap.has(id)) {
                // 新项目
                patches.push(createPatchWithHash('add', `/${id}`, item));
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

    // 检查是否为顶层对象
    if (
        schema.$type === 'object' &&
        typeof sourceData === 'object' &&
        sourceData !== null &&
        typeof targetData === 'object' &&
        targetData !== null
    ) {
        // 常规对象没有主键，直接处理对象字段
        const sourceObj = sourceData as Record<string, unknown>;
        const targetObj = targetData as Record<string, unknown>;

        // 创建处理状态
        const allPaths = Array.from(
            new Set([...sourcePathMap.keys(), ...targetPathMap.keys()])
        ).sort((a, b) => {
            // 按路径深度排序，浅层路径优先
            const depthA = a.split('/').length;
            const depthB = b.split('/').length;
            if (depthA !== depthB) return depthA - depthB;
            return a.localeCompare(b);
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
const buildPath = (basePath: string, key: string): string => {
    return basePath.endsWith('/') ? `${basePath}${key}` : `${basePath}/${key}`;
};

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
    // 通用处理逻辑
    if (!deepEqual(sourceObj, targetObj)) {
        // 检查是否应该替换整个对象
        const shouldReplaceWhole = (): boolean => {
            // 对于包含非对象成员的数组，替换整个数组
            if (schema.$type === 'array' && schema.$item && schema.$item.$type !== 'object') {
                return true;
            }

            // 处理对象属性的添加/删除
            const sourceKeys = Object.keys(sourceObj);
            const targetKeys = Object.keys(targetObj);

            // 如果添加/删除了多个属性，使用整体替换
            const addedKeys = targetKeys.filter(k => !sourceKeys.includes(k));
            const removedKeys = sourceKeys.filter(k => !targetKeys.includes(k));

            if (addedKeys.length > 1 || removedKeys.length > 1) {
                return true;
            }

            // 如果超过50%的字段被修改，使用整体替换
            const commonKeys = sourceKeys.filter(k => targetKeys.includes(k));

            // 对于单属性对象，避免整体替换
            if (commonKeys.length === 1) {
                return false;
            }

            let changedCount = 0;
            for (const key of commonKeys) {
                if (!deepEqual(sourceObj[key], targetObj[key])) {
                    changedCount++;
                }
            }

            return changedCount > commonKeys.length / 2;
        };

        // Determine if the whole object should be replaced
        if (shouldReplaceWhole()) {
            patches.push(createPatchWithHash('replace', path === '/' ? '' : path, targetObj));

            // Mark whole object path and child paths as handled
            state.handledPaths.add(path);

            const allKeys = [...new Set([...Object.keys(sourceObj), ...Object.keys(targetObj)])];
            for (const key of allKeys) {
                state.handledPaths.add(buildPath(path, key));
            }

            return;
        }
    }

    // If not replacing the whole object, generate patches for each field
    const sourceKeys = Object.keys(sourceObj);
    const targetKeys = Object.keys(targetObj);

    // Process deleted fields
    for (const key of sourceKeys) {
        if (!targetKeys.includes(key)) {
            const fieldPath = buildPath(path, key);

            // Skip already handled fields
            if (state.handledPaths.has(fieldPath)) continue;

            patches.push(createPatchWithHash('remove', fieldPath));
            state.handledPaths.add(fieldPath);
        }
    }

    // Process added and modified fields
    for (const key of targetKeys) {
        const fieldPath = buildPath(path, key);

        // Skip already handled fields
        if (state.handledPaths.has(fieldPath)) continue;

        if (!sourceKeys.includes(key)) {
            patches.push(createPatchWithHash('add', fieldPath, targetObj[key]));
            state.handledPaths.add(fieldPath);
        } else if (!deepEqual(sourceObj[key], targetObj[key])) {
            const sourceValue = sourceObj[key];
            const targetValue = targetObj[key];

            // Get field schema
            let fieldSchema: Schema | undefined;
            if (schema.$type === 'object' && schema.$fields && key in schema.$fields) {
                fieldSchema = schema.$fields[key] as Schema;
            } else if (schema.$type === 'array' && schema.$item) {
                fieldSchema = schema.$item as Schema;
            }

            // Handle nested objects
            if (
                fieldSchema &&
                typeof sourceValue === 'object' &&
                sourceValue !== null &&
                typeof targetValue === 'object' &&
                targetValue !== null
            ) {
                // Check if nested array with primary key
                if (
                    fieldSchema.$type === 'array' &&
                    fieldSchema.$item &&
                    fieldSchema.$item.$type === 'object' &&
                    fieldSchema.$item.$pk &&
                    Array.isArray(sourceValue) &&
                    Array.isArray(targetValue)
                ) {
                    const pkField = fieldSchema.$item.$pk;
                    const sourceArray = sourceValue as Array<Record<string, unknown>>;
                    const targetArray = targetValue as Array<Record<string, unknown>>;

                    // Create ID to index mapping
                    const sourceIdMap = new Map(
                        sourceArray.map((item, index) => [item[pkField], index])
                    );
                    const targetIdMap = new Map(
                        targetArray.map((item, index) => [item[pkField], index])
                    );

                    // Process deleted items
                    for (const [id] of sourceIdMap.entries()) {
                        if (!targetIdMap.has(id)) {
                            const itemPath = buildPath(fieldPath, String(id));

                            if (state.handledPaths.has(itemPath)) continue;

                            patches.push(createPatchWithHash('remove', itemPath));
                            state.handledPaths.add(itemPath);
                        }
                    }

                    // Process added and modified items
                    for (const [id, targetIndex] of targetIdMap.entries()) {
                        const targetItem = targetArray[targetIndex];
                        const itemPath = buildPath(fieldPath, String(id));

                        if (state.handledPaths.has(itemPath)) continue;

                        if (!sourceIdMap.has(id)) {
                            // Process new item
                            patches.push(createPatchWithHash('add', itemPath, targetItem));
                            state.handledPaths.add(itemPath);
                        } else {
                            // Process modified item
                            const sourceIndex = sourceIdMap.get(id)!;
                            const sourceItem = sourceArray[sourceIndex];

                            if (!deepEqual(sourceItem, targetItem)) {
                                generateObjectFieldPatches(
                                    itemPath,
                                    sourceItem,
                                    targetItem,
                                    patches,
                                    state,
                                    fieldSchema.$item as Schema
                                );
                            }
                        }
                    }
                } else {
                    // Regular object or array without primary key
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
                // Simple value use replace operation
                patches.push(createPatchWithHash('replace', fieldPath, targetValue));
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

    // Sort patches by operation type and path depth
    const sortedPatches = [...patches].sort((a, b) => {
        // Sort by operation type priority
        const priorityA = getOperationPriority(a.op);
        const priorityB = getOperationPriority(b.op);

        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }

        // Then sort by path depth from shallow to deep
        const depthA = a.path.split('/').filter(Boolean).length;
        const depthB = b.path.split('/').filter(Boolean).length;

        return depthA - depthB;
    });

    // Record paths already handled by higher priority operations
    const coveredPaths = new Set<string>();
    const optimized: Patch[] = [];

    // Add patches not covered
    for (const patch of sortedPatches) {
        // Check if current patch path is covered
        let isCovered = false;
        for (const covered of coveredPaths) {
            // If current path is a child path of an already covered path, skip
            if (patch.path.startsWith(covered + '/') || patch.path === covered) {
                isCovered = true;
                break;
            }
        }

        if (!isCovered) {
            optimized.push(patch);

            // Only mark child paths as covered when operation is replace or add
            if (patch.op === 'replace' || patch.op === 'add') {
                coveredPaths.add(patch.path);
            }
        }
    }

    return optimized;
};
