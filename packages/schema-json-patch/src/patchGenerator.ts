import { Schema } from './types/schema.js';
import { PatchOperation, Patch } from './types/patch.js';
import { deepEqual } from './utils/deepEqual.js';
import { generatePatchOptionHash } from './utils/hashUtils.js';
import { detectOrderChanges } from './utils/orderUtils.js';

/**
 * 创建补丁对象
 * @param op 操作类型
 * @param path 路径
 * @param value 值(可选)
 * @param from move操作的源路径(可选)
 * @returns 补丁
 */
const createPatch = (op: PatchOperation, path: string, value?: unknown, from?: string): Patch => {
    const hash = generatePatchOptionHash(op, path, value, from);

    if (op === 'move' && from !== undefined) {
        return { op, path, from, hash };
    }

    return value !== undefined ? { op, path, value, hash } : { op, path, hash };
};

/**
 * 路径处理状态
 * 用于在补丁生成过程中跟踪已处理的路径，避免重复处理
 */
interface PathProcessingState {
    /** 已处理的路径集合，防止重复生成补丁 */
    handledPaths: Set<string>;
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
    const patches: Patch[] = [];

    // 处理顶层数组
    if (schema.$type === 'array' && schema.$item.$type === 'object') {
        if (!Array.isArray(sourceData) || !Array.isArray(targetData)) {
            throw new Error('Type mismatch: array expected');
        }

        const pkField = schema.$item.$pk;

        if (pkField) {
            // 有主键，使用主键匹配
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
                    // 新项目：检查是否需要拆分
                    const itemPath = `/${id}`;
                    if (schema.$item.$split === true) {
                        const state: PathProcessingState = {
                            handledPaths: new Set<string>(),
                        };
                        generateSplitPatches(
                            itemPath,
                            item as Record<string, unknown>,
                            patches,
                            state,
                            schema.$item
                        );
                    } else {
                        patches.push(createPatch('add', itemPath, item));
                    }
                } else {
                    // 修改的项目
                    const sourceIndex = sourceIdMap.get(id)!;
                    const sourceItem = sourceData[sourceIndex];

                    if (!deepEqual(sourceItem, item)) {
                        const itemPath = `/${id}`;
                        const state: PathProcessingState = {
                            handledPaths: new Set<string>(),
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

            // 处理顺序变化（仅当 $ordered !== false 时）
            const isOrdered = schema.$item.$ordered !== false;
            if (isOrdered) {
                const sourceOrder = sourceData.map(item => String(item[pkField]));
                const targetOrder = targetData.map(item => String(item[pkField]));
                const movedIds = detectOrderChanges(sourceOrder, targetOrder);

                for (const id of movedIds) {
                    // from: 源元素的主键路径
                    // path: 目标位置 - 使用目标索引位置
                    //   - 如果移动到第一位，使用 /0
                    //   - 否则使用前一个元素的主键路径（表示插入到该元素之后）
                    const targetIndex = targetOrder.indexOf(id);
                    const toPath = targetIndex === 0 ? '/0' : `/${targetOrder[targetIndex - 1]}`;
                    patches.push(createPatch('move', toPath, undefined, `/${id}`));
                }
            }
        } else {
            // 无主键，使用索引匹配

            // 处理删除的项目（目标数组比源数组短）
            for (let i = targetData.length; i < sourceData.length; i++) {
                patches.push(createPatch('remove', `/${i}`));
            }

            // 处理新增和修改的项目
            for (let i = 0; i < targetData.length; i++) {
                const targetItem = targetData[i];
                const itemPath = `/${i}`;

                if (i >= sourceData.length) {
                    // 新增项目
                    if (schema.$item.$split === true) {
                        const state: PathProcessingState = {
                            handledPaths: new Set<string>(),
                        };
                        generateSplitPatches(
                            itemPath,
                            targetItem as Record<string, unknown>,
                            patches,
                            state,
                            schema.$item
                        );
                    } else {
                        patches.push(createPatch('add', itemPath, targetItem));
                    }
                } else {
                    // 修改的项目
                    const sourceItem = sourceData[i];
                    if (!deepEqual(sourceItem, targetItem)) {
                        const state: PathProcessingState = {
                            handledPaths: new Set<string>(),
                        };

                        generateObjectFieldPatches(
                            itemPath,
                            sourceItem as Record<string, unknown>,
                            targetItem as Record<string, unknown>,
                            patches,
                            state,
                            schema.$item
                        );
                    }
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

        const state: PathProcessingState = {
            handledPaths: new Set<string>(),
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
 * 为对象生成拆分的 add 补丁
 * 递归遍历对象的每个字段，为每个叶子节点生成独立的 add 操作
 * @param basePath - 当前对象的路径
 * @param obj - 要拆分的对象
 * @param patches - 补丁数组
 * @param state - 路径处理状态
 * @param schema - 当前对象的 Schema（可选）
 */
const generateSplitPatches = (
    basePath: string,
    obj: Record<string, unknown>,
    patches: Patch[],
    state: PathProcessingState,
    schema?: Schema
): void => {
    for (const key of Object.keys(obj)) {
        const fieldPath = buildPath(basePath, key);
        const value = obj[key];

        // 获取字段 Schema
        let fieldSchema: Schema | undefined;
        if (schema && schema.$type === 'object' && schema.$fields && key in schema.$fields) {
            fieldSchema = schema.$fields[key] as Schema;
        }

        // 如果值是对象且对应 Schema 设置了 $split，继续递归拆分
        if (
            typeof value === 'object' &&
            value !== null &&
            !Array.isArray(value) &&
            fieldSchema &&
            fieldSchema.$type === 'object' &&
            '$split' in fieldSchema &&
            fieldSchema.$split === true
        ) {
            generateSplitPatches(
                fieldPath,
                value as Record<string, unknown>,
                patches,
                state,
                fieldSchema
            );
        } else {
            // 叶子节点或不需要继续拆分的对象，生成单个 add 操作
            patches.push(createPatch('add', fieldPath, value));
            state.handledPaths.add(fieldPath);
        }
    }
};

/**
 * 判断是否应该整体替换对象
 */
const shouldReplaceWhole = (
    sourceObj: Record<string, unknown>,
    targetObj: Record<string, unknown>,
    schema: Schema
): boolean => {
    // 如果 Schema 配置了 $split，强制不整体替换
    if (schema.$type === 'object' && '$split' in schema && schema.$split === true) {
        return false;
    }

    // 对于包含非对象成员的数组，替换整个数组
    if (schema.$type === 'array' && schema.$item && schema.$item.$type !== 'object') {
        return true;
    }

    const sourceKeys = Object.keys(sourceObj);
    const targetKeys = Object.keys(targetObj);
    const sourceKeySet = new Set(sourceKeys);
    const targetKeySet = new Set(targetKeys);

    // 如果添加/删除了多个属性，使用整体替换
    const addedKeys = targetKeys.filter(k => !sourceKeySet.has(k));
    const removedKeys = sourceKeys.filter(k => !targetKeySet.has(k));

    if (addedKeys.length > 1 || removedKeys.length > 1) {
        return true;
    }

    // 对于单属性对象，避免整体替换
    const commonKeys = sourceKeys.filter(k => targetKeySet.has(k));
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

/**
 * 处理删除的字段
 */
const handleDeletedFields = (
    path: string,
    sourceKeys: string[],
    targetKeySet: Set<string>,
    patches: Patch[],
    state: PathProcessingState
): void => {
    for (const key of sourceKeys) {
        if (!targetKeySet.has(key)) {
            const fieldPath = buildPath(path, key);
            if (state.handledPaths.has(fieldPath)) continue;

            patches.push(createPatch('remove', fieldPath));
            state.handledPaths.add(fieldPath);
        }
    }
};

/**
 * 处理新增的字段
 */
const handleAddedField = (
    fieldPath: string,
    targetValue: unknown,
    schema: Schema,
    key: string,
    patches: Patch[],
    state: PathProcessingState
): void => {
    // 获取字段模式以检查 $split 配置
    let fieldSchema: Schema | undefined;
    if (schema.$type === 'object' && schema.$fields && key in schema.$fields) {
        fieldSchema = schema.$fields[key] as Schema;
    }

    // 如果是对象且设置了 $split，拆分为细粒度操作
    if (
        fieldSchema &&
        fieldSchema.$type === 'object' &&
        '$split' in fieldSchema &&
        fieldSchema.$split === true &&
        typeof targetValue === 'object' &&
        targetValue !== null &&
        !Array.isArray(targetValue)
    ) {
        generateSplitPatches(
            fieldPath,
            targetValue as Record<string, unknown>,
            patches,
            state,
            fieldSchema
        );
    } else {
        patches.push(createPatch('add', fieldPath, targetValue));
        state.handledPaths.add(fieldPath);
    }
};

/**
 * 处理带主键的嵌套数组
 */
const handleNestedArrayWithPk = (
    fieldPath: string,
    sourceValue: Array<Record<string, unknown>>,
    targetValue: Array<Record<string, unknown>>,
    fieldSchema: Schema & { $type: 'array'; $item: { $type: 'object'; $pk: string } },
    patches: Patch[],
    state: PathProcessingState
): void => {
    const pkField = fieldSchema.$item.$pk;
    const sourceIdMap = new Map(sourceValue.map((item, index) => [item[pkField], index]));
    const targetIdMap = new Map(targetValue.map((item, index) => [item[pkField], index]));

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
        const targetItem = targetValue[targetIndex];
        const itemPath = buildPath(fieldPath, String(id));
        if (state.handledPaths.has(itemPath)) continue;

        if (!sourceIdMap.has(id)) {
            patches.push(createPatch('add', itemPath, targetItem));
            state.handledPaths.add(itemPath);
        } else {
            const sourceIndex = sourceIdMap.get(id)!;
            const sourceItem = sourceValue[sourceIndex];

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

    // 处理顺序变化（仅当 $ordered !== false 时）
    const isOrdered = (fieldSchema.$item as { $ordered?: boolean }).$ordered !== false;
    if (isOrdered) {
        const sourceOrder = sourceValue.map(item => String(item[pkField]));
        const targetOrder = targetValue.map(item => String(item[pkField]));
        const movedIds = detectOrderChanges(sourceOrder, targetOrder);

        for (const id of movedIds) {
            // from: 源元素的主键路径
            // path: 目标位置 - 使用目标索引位置
            //   - 如果移动到第一位，使用 /0
            //   - 否则使用前一个元素的主键路径（表示插入到该元素之后）
            const targetIndex = targetOrder.indexOf(id);
            const toPath =
                targetIndex === 0
                    ? buildPath(fieldPath, '0')
                    : buildPath(fieldPath, targetOrder[targetIndex - 1]);
            const fromPath = buildPath(fieldPath, id);
            patches.push(createPatch('move', toPath, undefined, fromPath));
        }
    }
};

/**
 * 处理无主键的嵌套对象数组（按索引匹配）
 */
const handleNestedArrayByIndex = (
    fieldPath: string,
    sourceValue: Array<Record<string, unknown>>,
    targetValue: Array<Record<string, unknown>>,
    fieldSchema: Schema & { $type: 'array'; $item: { $type: 'object' } },
    patches: Patch[],
    state: PathProcessingState
): void => {
    // 处理删除的项目（目标数组比源数组短）
    for (let i = targetValue.length; i < sourceValue.length; i++) {
        const itemPath = buildPath(fieldPath, String(i));
        if (state.handledPaths.has(itemPath)) continue;

        patches.push(createPatch('remove', itemPath));
        state.handledPaths.add(itemPath);
    }

    // 处理新增和修改的项目
    for (let i = 0; i < targetValue.length; i++) {
        const targetItem = targetValue[i];
        const itemPath = buildPath(fieldPath, String(i));
        if (state.handledPaths.has(itemPath)) continue;

        if (i >= sourceValue.length) {
            // 新增项目
            patches.push(createPatch('add', itemPath, targetItem));
            state.handledPaths.add(itemPath);
        } else {
            // 修改的项目
            const sourceItem = sourceValue[i];
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
};

/**
 * 处理修改的字段
 */
const handleModifiedField = (
    fieldPath: string,
    sourceValue: unknown,
    targetValue: unknown,
    schema: Schema,
    key: string,
    patches: Patch[],
    state: PathProcessingState
): void => {
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
        // 检查是否嵌套数组并且是对象数组
        if (
            fieldSchema.$type === 'array' &&
            fieldSchema.$item.$type === 'object' &&
            Array.isArray(sourceValue) &&
            Array.isArray(targetValue)
        ) {
            if (fieldSchema.$item.$pk) {
                // 有主键
                handleNestedArrayWithPk(
                    fieldPath,
                    sourceValue as Array<Record<string, unknown>>,
                    targetValue as Array<Record<string, unknown>>,
                    fieldSchema as Schema & {
                        $type: 'array';
                        $item: { $type: 'object'; $pk: string };
                    },
                    patches,
                    state
                );
            } else {
                // 无主键，按索引匹配
                handleNestedArrayByIndex(
                    fieldPath,
                    sourceValue as Array<Record<string, unknown>>,
                    targetValue as Array<Record<string, unknown>>,
                    fieldSchema as Schema & { $type: 'array'; $item: { $type: 'object' } },
                    patches,
                    state
                );
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
    // 检查是否需要整体替换
    if (!deepEqual(sourceObj, targetObj) && shouldReplaceWhole(sourceObj, targetObj, schema)) {
        patches.push(createPatch('replace', path === '/' ? '' : path, targetObj));
        state.handledPaths.add(path);

        const allKeys = [...new Set([...Object.keys(sourceObj), ...Object.keys(targetObj)])];
        for (const key of allKeys) {
            state.handledPaths.add(buildPath(path, key));
        }
        return;
    }

    const sourceKeys = Object.keys(sourceObj);
    const targetKeys = Object.keys(targetObj);
    const sourceKeySet = new Set(sourceKeys);
    const targetKeySet = new Set(targetKeys);

    // 处理删除的字段
    handleDeletedFields(path, sourceKeys, targetKeySet, patches, state);

    // 处理新增和修改的字段
    for (const key of targetKeys) {
        const fieldPath = buildPath(path, key);
        if (state.handledPaths.has(fieldPath)) continue;

        if (!sourceKeySet.has(key)) {
            // 新增字段
            handleAddedField(fieldPath, targetObj[key], schema, key, patches, state);
        } else if (!deepEqual(sourceObj[key], targetObj[key])) {
            // 修改的字段
            handleModifiedField(
                fieldPath,
                sourceObj[key],
                targetObj[key],
                schema,
                key,
                patches,
                state
            );
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

    /**
     * 检查路径是否被已覆盖的父路径覆盖
     */
    const isPathCovered = (path: string): boolean => {
        // 检查精确匹配
        if (coveredPaths.has(path)) return true;

        // 逐级检查父路径
        const segments = path.split('/').filter(Boolean);
        let currentPath = '';
        for (const segment of segments) {
            currentPath = currentPath + '/' + segment;
            if (coveredPaths.has(currentPath) && currentPath !== path) {
                return true;
            }
        }
        return false;
    };

    // 添加未覆盖的补丁
    for (const patch of sortedPatches) {
        if (!isPathCovered(patch.path)) {
            optimized.push(patch);
            if (patch.op === 'replace' || patch.op === 'add') {
                coveredPaths.add(patch.path);
            }
        }
    }

    return optimized;
};
