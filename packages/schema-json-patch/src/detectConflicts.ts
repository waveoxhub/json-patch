import { collectPathPrefixes } from './utils/pathUtils';
import { deepEqual } from './utils/deepEqual';
import { ConflictDetail, Patch } from './types';
import { generatePatchOptionHash } from './utils/hashUtils';

/**
 * Patch operation type definition
 */
type PatchOperationWithIndex = {
    patch: Patch;
    groupIndex: number;
    patchIndex: number;
};

/**
 * Detects conflicts between multiple patch groups
 * @param patchGroups Array of patch groups
 * @returns Array of detailed conflict information
 */
export const detectConflicts = (
    patchGroups: ReadonlyArray<ReadonlyArray<Patch>>
): ReadonlyArray<ConflictDetail> => {
    // No conflicts possible with 0 or 1 patch groups
    if (!patchGroups || patchGroups.length <= 1) {
        return [];
    }

    // Index all patches by path
    const patchesByPath = indexPatchesByPath(patchGroups);

    // Path prefix mapping - for quickly finding patches on parent paths
    const pathPrefixMap = buildPathPrefixMap(patchesByPath);

    // Store all conflicts, grouped by path
    const conflictsByPath: Record<string, ConflictDetail> = {};

    // Detect conflicts on the same path
    detectDirectPathConflicts(patchesByPath, conflictsByPath);

    // Detect parent-child path conflicts
    detectParentChildPathConflicts(
        patchesByPath,
        pathPrefixMap,
        conflictsByPath
    );

    // Convert to array
    return Object.values(conflictsByPath);
};

/**
 * Index all patches by path
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
 * Detect direct path conflicts (conflicting operations on the same path)
 */
const detectDirectPathConflicts = (
    patchesByPath: Map<string, PatchOperationWithIndex[]>,
    conflictsByPath: Record<string, ConflictDetail>
): void => {
    for (const [path, operations] of patchesByPath.entries()) {
        // Skip paths with only one operation
        if (operations.length <= 1) continue;

        // Check if there are conflicting operations
        if (hasConflictingOperations(operations)) {
            createConflictWithOperations(conflictsByPath, path, operations);
        }
    }
};

/**
 * Check if a set of operations has conflicts
 */
const hasConflictingOperations = (operations: PatchOperationWithIndex[]): boolean => {
    // Check if there are different operation types
    const opTypes = new Set(operations.map(op => op.patch.op));

    // If operation types are the same
    if (opTypes.size === 1) {
        const opType = operations[0].patch.op;

        // If it's a remove operation, no conflict
        if (opType === 'remove') {
            return false;
        }

        // If add or replace operation, check if values are the same
        if (opType === 'add' || opType === 'replace') {
            const valueMap = new Map();

            for (const op of operations) {
                const value = op.patch.value;
                // Look for any matching value
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
    conflictsByPath: Record<string, ConflictDetail>
): void => {
    for (const [path, operations] of patchesByPath.entries()) {
        if (!operations.length) continue;

        // Get all prefix paths for this path
        const prefixes = pathPrefixMap.get(path) || [];

        for (const prefix of prefixes) {
            const parentOps = patchesByPath.get(prefix);

            if (!parentOps || !parentOps.length) continue;

            // Check if operations on the prefix path affect the current path
            for (const parentOp of parentOps) {
                // Remove and replace operations affect child paths
                if (parentOp.patch.op === 'remove' || parentOp.patch.op === 'replace') {
                    // For replace operations, check if child path values match values in parent object
                    if (
                        parentOp.patch.op === 'replace' &&
                        operations.every(childOp => {
                            // Only compare values for replace and add operations
                            if (childOp.patch.op !== 'replace' && childOp.patch.op !== 'add') {
                                return true;
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
                            } catch {
                                return false;
                            }
                        })
                    ) {
                        // If all child operations match the corresponding parts in the parent object, not a conflict
                        continue;
                    }

                    if (!conflictsByPath[path]) {
                        conflictsByPath[path] = {
                            path,
                            options: [],
                        };
                    }

                    // Add parent path and current path operations to conflict
                    addOperationToConflict(conflictsByPath[path], parentOp);
                    operations.forEach(op =>
                        addOperationToConflict(conflictsByPath[path], op)
                    );

                    // One conflict is enough
                    break;
                }
            }
        }
    }
};

/**
 * Create a conflict with operations
 */
const createConflictWithOperations = (
    conflictsByPath: Record<string, ConflictDetail>,
    path: string,
    operations: PatchOperationWithIndex[]
): void => {
    if (!conflictsByPath[path]) {
        conflictsByPath[path] = {
            path,
            options: [],
        };
    }

    const conflict = conflictsByPath[path];

    for (const op of operations) {
        addOperationToConflict(conflict, op);
    }
};

/**
 * Add an operation to a conflict
 */
const addOperationToConflict = (
    conflict: ConflictDetail,
    op: PatchOperationWithIndex
): void => {
    // Prefer to use hash already in the patch, compute if not available
    const hash = op.patch.hash || generatePatchOptionHash(op.patch.op, op.patch.path, op.patch.value);
    
    // Check if an option with the same hash already exists
    const existingOption = conflict.options.includes(hash);
    
    if (!existingOption) {
        // Add new option (hash only)
        conflict.options.push(hash);
    }
};
