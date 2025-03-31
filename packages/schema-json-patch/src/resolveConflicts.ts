import {
    Patch,
    ConflictDetail,
    ConflictResolutions,
    PatchConflictResult,
    CustomResolution,
} from './types/patch';

/**
 * Process patch conflicts and generate conflict result
 * @param patches Multiple patch groups
 * @param conflicts Conflict details array
 * @returns Result object containing conflict information
 */
export const processConflicts = (
    patches: ReadonlyArray<ReadonlyArray<Patch>>,
    conflicts: ReadonlyArray<ConflictDetail>
): PatchConflictResult => {
    if (conflicts.length === 0) {
        // No conflicts, return flattened array of all patches
        const allPatches = patches.flat();
        return {
            hasConflicts: false,
            conflicts: [],
            resolvedPatches: allPatches,
        };
    }

    return {
        hasConflicts: true,
        conflicts: conflicts as ConflictDetail[],
        resolvedPatches: [], // Empty by default, filled after conflict resolution
    };
};

/**
 * Apply conflict resolutions to generate processed patch set
 * @param patches Original patch collection (flattened array of all patch groups)
 * @param conflicts Conflict details array
 * @param resolutions Conflict resolution choices
 * @param customResolutions Custom resolutions (optional)
 * @returns Processed patch array
 */
export const resolveConflicts = (
    patches: ReadonlyArray<Patch>,
    conflicts: ReadonlyArray<ConflictDetail>,
    resolutions: ConflictResolutions,
    customResolutions: ReadonlyArray<CustomResolution> = []
): ReadonlyArray<Patch> => {
    // If no conflicts, return all patches
    if (conflicts.length === 0) {
        return [...patches];
    }

    // Create set of patch indices to exclude
    const excludedPatchIndices = new Set<number>();

    // Mark patches to exclude based on user resolutions
    conflicts.forEach((conflict, index) => {
        // Get user's selected operation index
        const selectedOperationIndex = resolutions[index.toString()] ?? 0;

        // Exclude all conflict patches not selected
        conflict.operations.forEach((op, opIndex) => {
            if (opIndex !== selectedOperationIndex) {
                excludedPatchIndices.add(op.index);
            }
        });
    });

    // Collect patches to apply (excluding marked patches)
    const resolvedPatches = patches.filter((_, index) => !excludedPatchIndices.has(index));

    // Add custom resolutions
    if (customResolutions.length > 0) {
        return [...resolvedPatches, ...customResolutions.map(cr => cr.patch)];
    }

    return resolvedPatches;
};

/**
 * Generate merged patch after conflict resolution
 * @param patches Original patch array (multiple groups)
 * @param conflicts Conflict details array
 * @param resolutions Conflict resolution choices
 * @param customResolutions Custom resolutions (optional)
 * @returns Conflict resolution result object
 */
export const generateResolvedPatch = (
    patches: ReadonlyArray<ReadonlyArray<Patch>>,
    conflicts: ReadonlyArray<ConflictDetail>,
    resolutions: ConflictResolutions,
    customResolutions: ReadonlyArray<CustomResolution> = []
): PatchConflictResult => {
    // Flatten all patches
    const allPatches = patches.flat();

    if (allPatches.length === 0) {
        return {
            hasConflicts: false,
            conflicts: [],
            resolvedPatches: [],
        };
    }

    // If no conflicts, return all patches
    if (conflicts.length === 0) {
        return {
            hasConflicts: false,
            conflicts: [],
            resolvedPatches: allPatches as Patch[],
        };
    }

    // Apply conflict resolutions
    const resolvedPatches = resolveConflicts(allPatches, conflicts, resolutions, customResolutions);

    return {
        hasConflicts: true,
        conflicts: conflicts as ConflictDetail[],
        resolvedPatches: resolvedPatches as Patch[],
    };
};

/**
 * Initialize conflict resolutions
 * @param conflicts Conflict details array
 * @returns Default conflict resolutions
 */
export const initializeResolutions = (
    conflicts: ReadonlyArray<ConflictDetail>
): ConflictResolutions => {
    const initialResolutions: ConflictResolutions = {};

    conflicts.forEach((_, index) => {
        initialResolutions[index.toString()] = 0;
    });

    return initialResolutions;
};
