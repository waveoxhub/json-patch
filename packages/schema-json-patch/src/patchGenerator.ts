import { Schema } from './types/schema';
import { Patch } from './types/patch';
import { extractPathMap } from './utils/pathUtils';
import { deepEqual } from './utils/deepEqual';

/**
 * Interface for tracking path processing state
 */
interface PathProcessingState {
    handledPaths: Set<string>;
    allPaths: string[];
}

/**
 * Generate patches between two objects based on schema
 *
 * @param schema - Data structure schema
 * @param sourceData - Source data
 * @param targetData - Target data
 * @returns Array of patches
 */
export const generatePatches = (
    schema: Schema,
    sourceJson: string,
    targetJson: string
): ReadonlyArray<Patch> => {
    // Parse input JSON data
    const sourceData = JSON.parse(sourceJson);
    const targetData = JSON.parse(targetJson);
    // Extract path mappings
    const sourcePathMap = extractPathMap(schema, sourceData);
    const targetPathMap = extractPathMap(schema, targetData);
    const patches: Patch[] = [];

    // Check if top-level array with primary key
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

        // Create ID to index mapping
        const sourceIdMap = new Map(sourceData.map((item, index) => [item[pkField], index]));
        const targetIdMap = new Map(targetData.map((item, index) => [item[pkField], index]));

        // Process deleted items
        for (const [id] of sourceIdMap) {
            if (!targetIdMap.has(id)) {
                patches.push({
                    op: 'remove',
                    path: `/${id}`,
                });
            }
        }

        // Process added and modified items
        for (let targetIndex = 0; targetIndex < targetData.length; targetIndex++) {
            const item = targetData[targetIndex];
            const id = item[pkField];

            if (!sourceIdMap.has(id)) {
                // New item
                patches.push({
                    op: 'add',
                    path: `/${id}`,
                    value: item,
                });
            } else {
                // Modified item
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

    // Check if top-level object
    if (
        schema.$type === 'object' &&
        typeof sourceData === 'object' &&
        sourceData !== null &&
        typeof targetData === 'object' &&
        targetData !== null
    ) {
        // Regular objects don't have primary keys, directly process object fields
        const sourceObj = sourceData as Record<string, unknown>;
        const targetObj = targetData as Record<string, unknown>;

        // Create processing state
        const allPaths = Array.from(
            new Set([...sourcePathMap.keys(), ...targetPathMap.keys()])
        ).sort((a, b) => {
            // Sort by path depth, shallow paths first
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
 * Build path string, handling slash issues
 */
const buildPath = (basePath: string, key: string): string => {
    return basePath.endsWith('/') ? `${basePath}${key}` : `${basePath}/${key}`;
};

/**
 * Generate patches for object fields
 */
const generateObjectFieldPatches = (
    path: string,
    sourceObj: Record<string, unknown>,
    targetObj: Record<string, unknown>,
    patches: Patch[],
    state: PathProcessingState,
    schema: Schema
): void => {
    // General processing logic
    if (!deepEqual(sourceObj, targetObj)) {
        // Check if whole object should be replaced
        const shouldReplaceWhole = (): boolean => {
            // For arrays with non-object members, replace the whole array
            if (schema.$type === 'array' && schema.$item && schema.$item.$type !== 'object') {
                return true;
            }

            // Handle object property additions/deletions
            const sourceKeys = Object.keys(sourceObj);
            const targetKeys = Object.keys(targetObj);

            // If more than one property is added/removed, use whole replacement
            const addedKeys = targetKeys.filter(k => !sourceKeys.includes(k));
            const removedKeys = sourceKeys.filter(k => !targetKeys.includes(k));

            if (addedKeys.length > 1 || removedKeys.length > 1) {
                return true;
            }

            // If more than 50% of fields are modified, use whole replacement
            const commonKeys = sourceKeys.filter(k => targetKeys.includes(k));

            // For single property objects, avoid whole replacement
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
            patches.push({
                op: 'replace',
                path: path === '/' ? '' : path,
                value: targetObj,
            });

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

            patches.push({
                op: 'remove',
                path: fieldPath,
            });
            state.handledPaths.add(fieldPath);
        }
    }

    // Process added and modified fields
    for (const key of targetKeys) {
        const fieldPath = buildPath(path, key);

        // Skip already handled fields
        if (state.handledPaths.has(fieldPath)) continue;

        if (!sourceKeys.includes(key)) {
            patches.push({
                op: 'add',
                path: fieldPath,
                value: targetObj[key],
            });
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

                            patches.push({
                                op: 'remove',
                                path: itemPath,
                            });
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
                            patches.push({
                                op: 'add',
                                path: itemPath,
                                value: targetItem,
                            });
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
                patches.push({
                    op: 'replace',
                    path: fieldPath,
                    value: targetValue,
                });
                state.handledPaths.add(fieldPath);
            }
        }
    }
};

/**
 * 根据操作类型的优先级
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
 * Optimize patches, remove redundant operations
 *
 * @param patches - Patches array
 * @returns Optimized patches array
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
