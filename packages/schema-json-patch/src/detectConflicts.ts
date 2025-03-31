import { collectPathPrefixes } from './utils/pathUtils';
import { deepEqual } from './utils/deepEqual';
import { ConflictDetail, Patch } from './types';

/**
 * Patch operation type definition
 */
type PatchOperationWithIndex = {
    patch: Patch;
    groupIndex: number;
    patchIndex: number;
};

/**
 * Detect conflicts between multiple patch groups
 * @param patchGroups Array of patch groups
 * @returns Array of detailed conflict information
 */
export const detectConflicts = (
    patchGroups: ReadonlyArray<ReadonlyArray<Patch>>
): ReadonlyArray<ConflictDetail> => {
    // if only 0 or 1 patch group, no conflicts possible
    if (!patchGroups || patchGroups.length <= 1) {
        return [];
    }

    // Calculate starting global index for each group
    const groupStartIndices: number[] = [];
    let currentIndex = 0;
    for (const group of patchGroups) {
        groupStartIndices.push(currentIndex);
        currentIndex += group?.length || 0;
    }

    // Index all patches by path
    const patchesByPath = indexPatchesByPath(patchGroups);

    // Index by path prefix mapping - for quickly finding patches on parent paths
    const pathPrefixMap = buildPathPrefixMap(patchesByPath);

    // Store all conflicts, grouped by path
    const conflictsByPath: Record<string, ConflictDetail> = {};

    // Detect conflicts on the same path
    detectDirectPathConflicts(patchesByPath, conflictsByPath, groupStartIndices);

    // Detect parent-child path conflicts
    detectParentChildPathConflicts(
        patchesByPath,
        pathPrefixMap,
        conflictsByPath,
        groupStartIndices
    );

    // Convert to array
    const conflicts = Object.values(conflictsByPath);

    // Flatten all patches into one-dimensional array
    const flatPatches = patchGroups.flat();

    // Add patch information to each conflict
    return conflicts.map(conflict => {
        const conflictPatches = conflict.operations.map(op => flatPatches[op.index]);

        return {
            ...conflict,
            patches: conflictPatches,
        };
    });
};

/**
 * Index all patches grouped by path
 */
const indexPatchesByPath = (
    patchGroups: ReadonlyArray<ReadonlyArray<Patch>>
): Map<string, PatchOperationWithIndex[]> => {
    const patchesByPath = new Map<string, PatchOperationWithIndex[]>();

    patchGroups.forEach((group, groupIndex) => {
        if (!group || !group.length) return;

        group.forEach((patch, patchIndex) => {
            if (!patch || !patch.path) return;

            const path = patch.path;

            if (!patchesByPath.has(path)) {
                patchesByPath.set(path, []);
            }

            patchesByPath.get(path)!.push({
                patch,
                groupIndex,
                patchIndex,
            });
        });
    });

    return patchesByPath;
};

/**
 * Build path prefix mapping
 */
const buildPathPrefixMap = (
    patchesByPath: Map<string, PatchOperationWithIndex[]>
): Map<string, string[]> => {
    const pathPrefixMap = new Map<string, string[]>();

    for (const path of patchesByPath.keys()) {
        // Collect all prefixes for the path
        const prefixes = new Set<string>();
        collectPathPrefixes(path, prefixes);

        // Record all prefix paths for this path
        pathPrefixMap.set(
            path,
            Array.from(prefixes).filter(p => p !== path)
        );
    }

    return pathPrefixMap;
};

/**
 * Detect direct path conflicts (operations conflicting on the same path)
 */
const detectDirectPathConflicts = (
    patchesByPath: Map<string, PatchOperationWithIndex[]>,
    conflictsByPath: Record<string, ConflictDetail>,
    groupStartIndices: number[]
): void => {
    for (const [path, operations] of patchesByPath.entries()) {
        // Skip paths with only one operation
        if (operations.length <= 1) continue;

        // Check if conflicts exist
        if (hasConflictingOperations(operations)) {
            createConflictWithOperations(conflictsByPath, path, operations, groupStartIndices);
        }
    }
};

/**
 * Check if operation set has conflicts
 */
const hasConflictingOperations = (operations: PatchOperationWithIndex[]): boolean => {
    // Check if there are different operation types
    const opTypes = new Set(operations.map(op => op.patch.op));

    // If same operation type
    if (opTypes.size === 1) {
        const opType = operations[0].patch.op;

        // If remove operation, no conflicts
        if (opType === 'remove') {
            return false;
        }

        // If add or replace operations, check if values are the same
        if (opType === 'add' || opType === 'replace') {
            const valueMap = new Map();

            for (const op of operations) {
                const value = op.patch.value;
                // Find any matching value
                let found = false;

                for (const [, storedValue] of valueMap.entries()) {
                    if (deepEqual(value, storedValue)) {
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    valueMap.set(valueMap.size, value);
                    // If different values found, conflict exists
                    if (valueMap.size > 1) {
                        return true;
                    }
                }
            }

            return false;
        }
    }

    // Different operation types, conflict exists
    return true;
};

/**
 * Detect parent-child path conflicts
 */
const detectParentChildPathConflicts = (
    patchesByPath: Map<string, PatchOperationWithIndex[]>,
    pathPrefixMap: Map<string, string[]>,
    conflictsByPath: Record<string, ConflictDetail>,
    groupStartIndices: number[]
): void => {
    for (const [path, operations] of patchesByPath.entries()) {
        if (!operations.length) continue;

        // Get all prefix paths for this path
        const prefixes = pathPrefixMap.get(path) || [];

        for (const prefix of prefixes) {
            const parentOps = patchesByPath.get(prefix);

            if (!parentOps || !parentOps.length) continue;

            // Check if operations on prefix path affect current path
            for (const parentOp of parentOps) {
                // remove and replace operations affect child paths
                if (parentOp.patch.op === 'remove' || parentOp.patch.op === 'replace') {
                    // For replace operations, check if child path values are identical to the values in the parent object
                    if (parentOp.patch.op === 'replace' && operations.every(childOp => {
                        // Only compare values for replace and add operations
                        if (childOp.patch.op !== 'replace' && childOp.patch.op !== 'add') {
                            return false;
                        }
                        
                        // Extract the remaining path relative to the parent path
                        const remainingPath = path.slice(prefix.length);
                        
                        // Get the value from the parent object at the corresponding child path
                        let parentValue = parentOp.patch.value;
                        const segments = remainingPath.split('/').filter(s => s);
                        
                        try {
                            for (const segment of segments) {
                                if (typeof parentValue !== 'object' || parentValue === null) {
                                    return false;
                                }
                                parentValue = (parentValue as any)[segment];
                            }
                            
                            // Compare values for equality
                            return deepEqual(parentValue, childOp.patch.value);
                        } catch (e) {
                            return false;
                        }
                    })) {
                        // If all child operations have values identical to the parent object, don't mark as conflict
                        continue;
                    }
                    
                    if (!conflictsByPath[path]) {
                        conflictsByPath[path] = {
                            path,
                            operations: [],
                        };
                    }

                    // Add parent path and current path operations to conflict
                    addOperationToConflict(conflictsByPath[path], parentOp, groupStartIndices);
                    operations.forEach(op =>
                        addOperationToConflict(conflictsByPath[path], op, groupStartIndices)
                    );

                    // One conflict is enough
                    break;
                }
            }
        }
    }
};

/**
 * Create conflict record and add multiple operations
 */
const createConflictWithOperations = (
    conflictsByPath: Record<string, ConflictDetail>,
    path: string,
    operations: PatchOperationWithIndex[],
    groupStartIndices: number[]
): void => {
    // Create conflict details
    if (!conflictsByPath[path]) {
        conflictsByPath[path] = {
            path,
            operations: [],
        };
    }

    // Add all operations to conflict
    operations.forEach(op => addOperationToConflict(conflictsByPath[path], op, groupStartIndices));
};

/**
 * Add operation to conflict record
 */
const addOperationToConflict = (
    conflict: ConflictDetail,
    op: PatchOperationWithIndex,
    groupStartIndices: number[]
): void => {
    // Calculate global index
    const globalIndex = groupStartIndices[op.groupIndex] + op.patchIndex;

    // Check if operation already in conflict
    const exists = conflict.operations.some(
        existingOp => existingOp.index === globalIndex
    );

    if (!exists) {
        conflict.operations.push({
            operation: op.patch.op,
            index: globalIndex,
            groupIndex: op.groupIndex,
        });
    }
};
