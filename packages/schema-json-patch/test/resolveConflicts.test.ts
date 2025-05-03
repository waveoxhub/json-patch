import { describe, it, expect } from 'vitest';
import {
    resolveConflicts,
    processConflicts,
    generateResolvedPatch,
    initializeResolutions,
} from '../src/resolveConflicts';
import { ConflictDetail, Patch, ConflictResolutions, CustomResolution } from '../src/types/patch';
import { detectConflicts } from '../src';

describe('resolveConflicts', () => {
    it('should resolve property conflicts using specified strategy', () => {
        const patches: Patch[] = [
            {
                op: 'replace',
                path: '/name',
                value: 'patch1Name',
            },
            {
                op: 'replace',
                path: '/name',
                value: 'patch2Name',
            },
        ];

        const conflicts = detectConflicts([[patches[0]], [patches[1]]]);

        const resolutions: ConflictResolutions = {
            '0': 1, // Select second operation
        };

        const resolvedPatches = resolveConflicts(patches, conflicts, resolutions);

        expect(resolvedPatches).toHaveLength(1);
        expect(resolvedPatches[0]).toEqual({
            op: 'replace',
            path: '/name',
            value: 'patch2Name',
        });
    });

    it('should use first patch as default when no resolution is provided', () => {
        const patches: Patch[] = [
            {
                op: 'replace',
                path: '/name',
                value: 'patch1Name',
            },
            {
                op: 'replace',
                path: '/name',
                value: 'patch2Name',
            },
        ];

        const conflicts = detectConflicts([[patches[0]], [patches[1]]]);

        const resolutions: ConflictResolutions = {};

        const resolvedPatches = resolveConflicts(patches, conflicts, resolutions);

        expect(resolvedPatches).toHaveLength(1);
        expect(resolvedPatches[0]).toEqual({
            op: 'replace',
            path: '/name',
            value: 'patch1Name',
        });
    });

    it('should handle multiple conflict paths', () => {
        const patches: Patch[] = [
            {
                op: 'replace',
                path: '/name',
                value: 'patch1Name',
            },
            {
                op: 'replace',
                path: '/name',
                value: 'patch2Name',
            },
            {
                op: 'replace',
                path: '/age',
                value: 25,
            },
            {
                op: 'replace',
                path: '/age',
                value: 30,
            },
        ];

        const conflicts = detectConflicts([
            [patches[0], patches[2]],
            [patches[1], patches[3]]
        ]);

        const resolutions: ConflictResolutions = {
            '0': 0, // Select first patch for name
            '1': 1, // Select second patch for age
        };

        const resolvedPatches = resolveConflicts(patches, conflicts, resolutions);

        expect(resolvedPatches).toHaveLength(2);
        expect(resolvedPatches).toContainEqual({
            op: 'replace',
            path: '/name',
            value: 'patch1Name',
        });
        expect(resolvedPatches).toContainEqual({
            op: 'replace',
            path: '/age',
            value: 30,
        });
    });

    it('should return all patches directly when no conflicts exist', () => {
        const patches: Patch[] = [
            {
                op: 'replace',
                path: '/name',
                value: 'patch1Name',
            },
            {
                op: 'add',
                path: '/age',
                value: 25,
            },
        ];

        const conflicts: ConflictDetail[] = [];
        const resolutions: ConflictResolutions = {};

        const resolvedPatches = resolveConflicts(patches, conflicts, resolutions);

        expect(resolvedPatches).toHaveLength(2);
        expect(resolvedPatches).toEqual(patches);
    });

    it('should apply custom resolutions', () => {
        const patches: Patch[] = [
            {
                op: 'replace',
                path: '/name',
                value: 'patch1Name',
            },
            {
                op: 'replace',
                path: '/name',
                value: 'patch2Name',
            },
        ];

        const conflicts = detectConflicts([[patches[0]], [patches[1]]]);

        const resolutions: ConflictResolutions = {
            '0': 0, // Select first operation
        };

        const customResolutions: CustomResolution[] = [
            {
                path: '/age',
                patch: {
                    op: 'add',
                    path: '/age',
                    value: 30,
                },
            },
        ];

        const resolvedPatches = resolveConflicts(
            patches,
            conflicts,
            resolutions,
            customResolutions
        );

        expect(resolvedPatches).toHaveLength(2);
        expect(resolvedPatches).toContainEqual({
            op: 'replace',
            path: '/name',
            value: 'patch1Name',
        });
        expect(resolvedPatches).toContainEqual({
            op: 'add',
            path: '/age',
            value: 30,
        });
    });

    it('should handle conflicts with multiple operation types for the same path', () => {
        const patches: Patch[] = [
            {
                op: 'remove',
                path: '/items/0',
            },
            {
                op: 'replace',
                path: '/items/0',
                value: 'new value',
            },
            {
                op: 'add',
                path: '/items/0',
                value: 'another new value',
            },
        ];

        const conflicts = detectConflicts([[patches[0]], [patches[1]], [patches[2]]]);

        // Select third operation (add)
        const resolutions: ConflictResolutions = {
            '0': 2,
        };

        const resolvedPatches = resolveConflicts(patches, conflicts, resolutions);

        // Should only have one patch retained
        expect(resolvedPatches).toHaveLength(1);
        expect(resolvedPatches[0]).toEqual({
            op: 'add',
            path: '/items/0',
            value: 'another new value',
        });
    });
});

describe('processConflicts', () => {
    it('should return flattened patch array when no conflicts exist', () => {
        const patches: Patch[][] = [
            [
                {
                    op: 'replace',
                    path: '/name',
                    value: 'patch1Name',
                },
            ],
            [
                {
                    op: 'add',
                    path: '/age',
                    value: 25,
                },
            ],
        ];

        const conflicts: ConflictDetail[] = [];

        const result = processConflicts(patches, conflicts);

        expect(result.hasConflicts).toBe(false);
        expect(result.conflicts).toEqual([]);
        expect(result.resolvedPatches).toHaveLength(2);
        expect(result.resolvedPatches).toEqual(patches.flat());
    });

    it('should return conflict information but not resolve patches when conflicts exist', () => {
        const patches: Patch[][] = [
            [
                {
                    op: 'replace',
                    path: '/name',
                    value: 'patch1Name',
                },
            ],
            [
                {
                    op: 'replace',
                    path: '/name',
                    value: 'patch2Name',
                },
            ],
        ];

        const conflicts = detectConflicts(patches);

        const result = processConflicts(patches, conflicts);

        expect(result.hasConflicts).toBe(true);
        expect(result.conflicts).toEqual(conflicts);
        expect(result.resolvedPatches).toEqual([]);
    });
});

describe('generateResolvedPatch', () => {
    it('should return empty result when no patches exist', () => {
        const patches: Patch[][] = [];
        const conflicts: ConflictDetail[] = [];
        const resolutions: ConflictResolutions = {};

        const result = generateResolvedPatch(patches, conflicts, resolutions);

        expect(result.hasConflicts).toBe(false);
        expect(result.conflicts).toEqual([]);
        expect(result.resolvedPatches).toEqual([]);
    });

    it('should return all patches when no conflicts exist', () => {
        const patches: Patch[][] = [
            [
                {
                    op: 'replace',
                    path: '/name',
                    value: 'patch1Name',
                },
            ],
            [
                {
                    op: 'add',
                    path: '/age',
                    value: 25,
                },
            ],
        ];

        const conflicts: ConflictDetail[] = [];
        const resolutions: ConflictResolutions = {};

        const result = generateResolvedPatch(patches, conflicts, resolutions);

        expect(result.hasConflicts).toBe(false);
        expect(result.conflicts).toEqual([]);
        expect(result.resolvedPatches).toEqual(patches.flat());
    });

    it('should apply solution and return conflict information when conflicts exist', () => {
        const patches: Patch[][] = [
            [
                {
                    op: 'replace',
                    path: '/name',
                    value: 'patch1Name',
                },
            ],
            [
                {
                    op: 'replace',
                    path: '/name',
                    value: 'patch2Name',
                },
            ],
        ];

        const conflicts = detectConflicts(patches);

        const resolutions: ConflictResolutions = {
            '0': 1, // Select second operation
        };

        const result = generateResolvedPatch(patches, conflicts, resolutions);

        expect(result.hasConflicts).toBe(true);
        expect(result.conflicts).toEqual(conflicts);
        expect(result.resolvedPatches).toHaveLength(1);
        expect(result.resolvedPatches[0]).toEqual({
            op: 'replace',
            path: '/name',
            value: 'patch2Name',
        });
    });

    it('should apply custom solution and retain conflict information', () => {
        const patches: Patch[][] = [
            [
                {
                    op: 'replace',
                    path: '/name',
                    value: 'patch1Name',
                },
            ],
            [
                {
                    op: 'replace',
                    path: '/name',
                    value: 'patch2Name',
                },
            ],
        ];

        const conflicts = detectConflicts(patches);

        const resolutions: ConflictResolutions = {
            '0': 0, // Select first operation
        };

        const customResolutions: CustomResolution[] = [
            {
                path: '/age',
                patch: {
                    op: 'add',
                    path: '/age',
                    value: 30,
                },
            },
        ];

        const result = generateResolvedPatch(patches, conflicts, resolutions, customResolutions);

        expect(result.hasConflicts).toBe(true);
        expect(result.conflicts).toEqual(conflicts);
        expect(result.resolvedPatches).toHaveLength(2);
        expect(result.resolvedPatches).toContainEqual({
            op: 'replace',
            path: '/name',
            value: 'patch1Name',
        });
        expect(result.resolvedPatches).toContainEqual({
            op: 'add',
            path: '/age',
            value: 30,
        });
    });
});

describe('initializeResolutions', () => {
    it('should create default solution for each conflict (select first operation)', () => {
        const patches: Patch[][] = [
            [
                { op: 'replace', path: '/name', value: 'patch1Name' },
                { op: 'replace', path: '/age', value: 25 },
            ],
            [
                { op: 'replace', path: '/name', value: 'patch2Name' },
                { op: 'replace', path: '/age', value: 30 },
            ],
        ];
        
        const conflicts = detectConflicts(patches);

        const resolutions = initializeResolutions(conflicts);

        expect(resolutions).toEqual({
            '0': 0,
            '1': 0,
        });
    });

    it('should return empty solution object when conflict array is empty', () => {
        const conflicts: ConflictDetail[] = [];

        const resolutions = initializeResolutions(conflicts);

        expect(resolutions).toEqual({});
    });
});
