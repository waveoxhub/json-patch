import { describe, it, expect } from 'vitest';
import {
    resolveConflicts,
    generateResolvedPatch,
    initializeResolutions,
} from '../src/resolveConflicts';
import {
    ConflictDetail,
    Patch,
    ConflictResolutions,
    CustomConflictResolutions,
} from '../src/types/patch';
import { detectConflicts } from '../src';
import { generatePatchOptionHash } from '../src/utils/hashUtils';

describe('resolveConflicts', () => {
    it('should resolve property conflicts using specified strategy', () => {
        const patch1Hash = generatePatchOptionHash('replace', '/name', 'patch1Name');
        const patch2Hash = generatePatchOptionHash('replace', '/name', 'patch2Name');

        const patches: Patch[] = [
            {
                op: 'replace',
                path: '/name',
                value: 'patch1Name',
                hash: patch1Hash,
            },
            {
                op: 'replace',
                path: '/name',
                value: 'patch2Name',
                hash: patch2Hash,
            },
        ];

        const conflicts = detectConflicts([[patches[0]], [patches[1]]]);

        const resolutions: ConflictResolutions = [
            {
                path: '/name',
                selectedHash: patch2Hash,
            },
        ];

        const resolvedPatches = resolveConflicts(
            [[patches[0]], [patches[1]]],
            conflicts,
            resolutions
        );

        expect(resolvedPatches).toHaveLength(1);
        expect(resolvedPatches[0]).toEqual({
            op: 'replace',
            path: '/name',
            value: 'patch2Name',
            hash: patch2Hash,
        });
    });

    it('should use first patch as default when no resolution is provided', () => {
        const patch1Hash = generatePatchOptionHash('replace', '/name', 'patch1Name');
        const patch2Hash = generatePatchOptionHash('replace', '/name', 'patch2Name');

        const patches: Patch[] = [
            {
                op: 'replace',
                path: '/name',
                value: 'patch1Name',
                hash: patch1Hash,
            },
            {
                op: 'replace',
                path: '/name',
                value: 'patch2Name',
                hash: patch2Hash,
            },
        ];

        const conflicts = detectConflicts([[patches[0]], [patches[1]]]);

        const resolutions: ConflictResolutions = [];

        const resolvedPatches = resolveConflicts(
            [[patches[0]], [patches[1]]],
            conflicts,
            resolutions
        );

        expect(resolvedPatches).toHaveLength(1);
        expect(resolvedPatches[0]).toEqual({
            op: 'replace',
            path: '/name',
            value: 'patch1Name',
            hash: patch1Hash,
        });
    });

    it('should handle multiple conflict paths', () => {
        const name1Hash = generatePatchOptionHash('replace', '/name', 'patch1Name');
        const name2Hash = generatePatchOptionHash('replace', '/name', 'patch2Name');
        const age1Hash = generatePatchOptionHash('replace', '/age', 25);
        const age2Hash = generatePatchOptionHash('replace', '/age', 30);

        const patches: Patch[] = [
            {
                op: 'replace',
                path: '/name',
                value: 'patch1Name',
                hash: name1Hash,
            },
            {
                op: 'replace',
                path: '/name',
                value: 'patch2Name',
                hash: name2Hash,
            },
            {
                op: 'replace',
                path: '/age',
                value: 25,
                hash: age1Hash,
            },
            {
                op: 'replace',
                path: '/age',
                value: 30,
                hash: age2Hash,
            },
        ];

        const conflicts = detectConflicts([
            [patches[0], patches[2]],
            [patches[1], patches[3]],
        ]);

        const resolutions: ConflictResolutions = [
            {
                path: '/name',
                selectedHash: name1Hash,
            },
            {
                path: '/age',
                selectedHash: age2Hash,
            },
        ];

        const resolvedPatches = resolveConflicts(
            [
                [patches[0], patches[2]],
                [patches[1], patches[3]],
            ],
            conflicts,
            resolutions
        );

        expect(resolvedPatches).toHaveLength(2);
        expect(resolvedPatches).toContainEqual({
            op: 'replace',
            path: '/name',
            value: 'patch1Name',
            hash: name1Hash,
        });
        expect(resolvedPatches).toContainEqual({
            op: 'replace',
            path: '/age',
            value: 30,
            hash: age2Hash,
        });
    });

    it('should return all patches directly when no conflicts exist', () => {
        const nameHash = generatePatchOptionHash('replace', '/name', 'patch1Name');
        const ageHash = generatePatchOptionHash('add', '/age', 25);

        const patches: Patch[] = [
            {
                op: 'replace',
                path: '/name',
                value: 'patch1Name',
                hash: nameHash,
            },
            {
                op: 'add',
                path: '/age',
                value: 25,
                hash: ageHash,
            },
        ];

        const conflicts: ConflictDetail[] = [];
        const resolutions: ConflictResolutions = [];

        const resolvedPatches = resolveConflicts(
            [[patches[0]], [patches[1]]],
            conflicts,
            resolutions
        );

        expect(resolvedPatches).toHaveLength(2);
        expect(resolvedPatches).toEqual(patches);
    });

    it('should apply custom resolutions', () => {
        const patch1Hash = generatePatchOptionHash('replace', '/name', 'patch1Name');
        const patch2Hash = generatePatchOptionHash('replace', '/name', 'patch2Name');
        const ageHash = generatePatchOptionHash('add', '/age', 30);

        const patches: Patch[] = [
            {
                op: 'replace',
                path: '/name',
                value: 'patch1Name',
                hash: patch1Hash,
            },
            {
                op: 'replace',
                path: '/name',
                value: 'patch2Name',
                hash: patch2Hash,
            },
        ];

        const conflicts = detectConflicts([[patches[0]], [patches[1]]]);

        const resolutions: ConflictResolutions = [
            {
                path: '/name',
                selectedHash: patch1Hash,
            },
        ];

        const customResolutions: CustomConflictResolutions = [
            {
                path: '/age',
                patch: {
                    op: 'add',
                    path: '/age',
                    value: 30,
                    hash: ageHash,
                },
            },
        ];

        const resolvedPatches = resolveConflicts(
            [patches],
            conflicts,
            resolutions,
            customResolutions
        );

        expect(resolvedPatches).toHaveLength(2);
        expect(resolvedPatches).toContainEqual({
            op: 'replace',
            path: '/name',
            value: 'patch1Name',
            hash: patch1Hash,
        });
        expect(resolvedPatches).toContainEqual({
            op: 'add',
            path: '/age',
            value: 30,
            hash: ageHash,
        });
    });

    it('should handle conflicts with multiple operation types for the same path', () => {
        const removeHash = generatePatchOptionHash('remove', '/items/0');
        const replaceHash = generatePatchOptionHash('replace', '/items/0', 'new value');
        const addHash = generatePatchOptionHash('add', '/items/0', 'another new value');

        const patches: Patch[] = [
            {
                op: 'remove',
                path: '/items/0',
                hash: removeHash,
            },
            {
                op: 'replace',
                path: '/items/0',
                value: 'new value',
                hash: replaceHash,
            },
            {
                op: 'add',
                path: '/items/0',
                value: 'another new value',
                hash: addHash,
            },
        ];

        const conflicts = detectConflicts([[patches[0]], [patches[1]], [patches[2]]]);

        // Select add operation
        const resolutions: ConflictResolutions = [
            {
                path: '/items/0',
                selectedHash: addHash,
            },
        ];

        const resolvedPatches = resolveConflicts([patches], conflicts, resolutions);

        // Should only have one patch retained
        expect(resolvedPatches).toHaveLength(1);
        expect(resolvedPatches[0]).toEqual({
            op: 'add',
            path: '/items/0',
            value: 'another new value',
            hash: addHash,
        });
    });
});

describe('generateResolvedPatch', () => {
    it('should return empty result when no patches exist', () => {
        const patches: Patch[][] = [];
        const conflicts: ConflictDetail[] = [];
        const resolutions: ConflictResolutions = [];

        const result = generateResolvedPatch(patches, conflicts, resolutions);

        expect(result.unresolvedConflicts).toEqual([]);
        expect(result.resolvedPatches).toEqual([]);
    });

    it('should return all patches when no conflicts exist', () => {
        const nameHash = generatePatchOptionHash('replace', '/name', 'patch1Name');
        const ageHash = generatePatchOptionHash('add', '/age', 25);

        const patches: Patch[][] = [
            [
                {
                    op: 'replace',
                    path: '/name',
                    value: 'patch1Name',
                    hash: nameHash,
                },
            ],
            [
                {
                    op: 'add',
                    path: '/age',
                    value: 25,
                    hash: ageHash,
                },
            ],
        ];

        const conflicts: ConflictDetail[] = [];
        const resolutions: ConflictResolutions = [];

        const result = generateResolvedPatch(patches, conflicts, resolutions);

        expect(result.unresolvedConflicts).toEqual([]);
        expect(result.resolvedPatches).toEqual(patches.flat());
    });

    it('should apply solution and return unresolved conflicts when conflicts exist', () => {
        const patch1Hash = generatePatchOptionHash('replace', '/name', 'patch1Name');
        const patch2Hash = generatePatchOptionHash('replace', '/name', 'patch2Name');

        const patches: Patch[][] = [
            [
                {
                    op: 'replace',
                    path: '/name',
                    value: 'patch1Name',
                    hash: patch1Hash,
                },
            ],
            [
                {
                    op: 'replace',
                    path: '/name',
                    value: 'patch2Name',
                    hash: patch2Hash,
                },
            ],
        ];

        const conflicts = detectConflicts(patches);

        const resolutions: ConflictResolutions = [
            {
                path: '/name',
                selectedHash: patch2Hash,
            },
        ];

        const result = generateResolvedPatch(patches, conflicts, resolutions);

        expect(result.unresolvedConflicts.length).toBe(0); // All conflicts resolved
        expect(result.resolvedPatches).toHaveLength(1);
        expect(result.resolvedPatches[0]).toEqual({
            op: 'replace',
            path: '/name',
            value: 'patch2Name',
            hash: patch2Hash,
        });
    });

    it('should apply custom solution and track unresolved conflicts', () => {
        const patch1Hash = generatePatchOptionHash('replace', '/name', 'patch1Name');
        const patch2Hash = generatePatchOptionHash('replace', '/name', 'patch2Name');
        const ageHash = generatePatchOptionHash('add', '/age', 30);

        const patches: Patch[][] = [
            [
                {
                    op: 'replace',
                    path: '/name',
                    value: 'patch1Name',
                    hash: patch1Hash,
                },
            ],
            [
                {
                    op: 'replace',
                    path: '/name',
                    value: 'patch2Name',
                    hash: patch2Hash,
                },
            ],
        ];

        const conflicts = detectConflicts(patches);

        const resolutions: ConflictResolutions = [
            {
                path: '/name',
                selectedHash: patch1Hash,
            },
        ];

        const customResolutions: CustomConflictResolutions = [
            {
                path: '/age',
                patch: {
                    op: 'add',
                    path: '/age',
                    value: 30,
                    hash: ageHash,
                },
            },
        ];

        const result = generateResolvedPatch(patches, conflicts, resolutions, customResolutions);

        expect(result.unresolvedConflicts.length).toBe(0); // All conflicts resolved
        expect(result.resolvedPatches).toHaveLength(2);
        expect(result.resolvedPatches).toContainEqual({
            op: 'replace',
            path: '/name',
            value: 'patch1Name',
            hash: patch1Hash,
        });
        expect(result.resolvedPatches).toContainEqual({
            op: 'add',
            path: '/age',
            value: 30,
            hash: ageHash,
        });
    });

    it('should populate unresolvedConflicts when some conflicts remain unresolved', () => {
        const patch1Hash = generatePatchOptionHash('replace', '/name', 'patch1Name');
        const patch2Hash = generatePatchOptionHash('replace', '/name', 'patch2Name');
        const age1Hash = generatePatchOptionHash('replace', '/age', 25);
        const age2Hash = generatePatchOptionHash('replace', '/age', 30);

        const patches: Patch[][] = [
            [
                {
                    op: 'replace',
                    path: '/name',
                    value: 'patch1Name',
                    hash: patch1Hash,
                },
                {
                    op: 'replace',
                    path: '/age',
                    value: 25,
                    hash: age1Hash,
                },
            ],
            [
                {
                    op: 'replace',
                    path: '/name',
                    value: 'patch2Name',
                    hash: patch2Hash,
                },
                {
                    op: 'replace',
                    path: '/age',
                    value: 30,
                    hash: age2Hash,
                },
            ],
        ];

        const conflicts = detectConflicts(patches);

        // Only resolve one of the two conflicts
        const resolutions: ConflictResolutions = [
            {
                path: '/name',
                selectedHash: patch1Hash,
            },
            // age conflict remains unresolved
        ];

        const result = generateResolvedPatch(patches, conflicts, resolutions);

        expect(result.unresolvedConflicts.length).toBeGreaterThan(0); // Has unresolved conflicts
        expect(result.unresolvedConflicts).toContain(age1Hash);
        expect(result.unresolvedConflicts).toContain(age2Hash);
        // Still resolves the path that has a resolution
        expect(result.resolvedPatches).toContainEqual({
            op: 'replace',
            path: '/name',
            value: 'patch1Name',
            hash: patch1Hash,
        });
    });
});

describe('initializeResolutions', () => {
    it('should create default solution for each conflict (select first option)', () => {
        const name1Hash = generatePatchOptionHash('replace', '/name', 'patch1Name');
        const age1Hash = generatePatchOptionHash('replace', '/age', 25);

        const patches: Patch[][] = [
            [
                {
                    op: 'replace',
                    path: '/name',
                    value: 'patch1Name',
                    hash: name1Hash,
                },
                {
                    op: 'replace',
                    path: '/age',
                    value: 25,
                    hash: age1Hash,
                },
            ],
            [
                {
                    op: 'replace',
                    path: '/name',
                    value: 'patch2Name',
                    hash: generatePatchOptionHash('replace', '/name', 'patch2Name'),
                },
                {
                    op: 'replace',
                    path: '/age',
                    value: 30,
                    hash: generatePatchOptionHash('replace', '/age', 30),
                },
            ],
        ];

        const conflicts = detectConflicts(patches);

        const resolutions = initializeResolutions(conflicts);

        expect(resolutions).toHaveLength(2);
        expect(resolutions).toEqual([
            {
                path: conflicts[0].path,
                selectedHash: conflicts[0].options[0]?.hash,
            },
            {
                path: conflicts[1].path,
                selectedHash: conflicts[1].options[0]?.hash,
            },
        ]);
    });

    it('should return empty solution array when conflict array is empty', () => {
        const conflicts: ConflictDetail[] = [];

        const resolutions = initializeResolutions(conflicts);

        expect(resolutions).toEqual([]);
    });
});
