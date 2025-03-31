/**
 * JSON Patch operation types
 * Compliant with RFC 6902 standard
 */
export type PatchOperation = 'add' | 'remove' | 'replace';

/**
 * JSON Patch object
 * Supports semantic paths
 */
export type Patch = {
    readonly op: PatchOperation;
    readonly path: string;
    readonly value?: unknown;
};

/**
 * Patch conflict details, records conflicting path and operation information
 */
export type ConflictDetail = {
    readonly path: string;
    readonly operations: Array<{
        readonly operation: PatchOperation;
        readonly index: number;
        readonly groupIndex: number; // Index of the source patch group
    }>;
    readonly patches?: Array<Patch>; // Specific patch content
};

/**
 * Conflict resolution type
 * Records index of each conflict and chosen resolution
 */
export type ConflictResolutions = Record<string, number>;

/**
 * Patch conflict processing result
 */
export type PatchConflictResult = {
    readonly hasConflicts: boolean;
    readonly conflicts: Array<ConflictDetail>;
    readonly resolvedPatches: Array<Patch>;
};

/**
 * Custom resolution type
 * Used for handling special conflict cases
 */
export type CustomResolution = {
    readonly path: string;
    readonly patch: Patch;
};
