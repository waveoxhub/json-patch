import { describe, expect, it } from 'vitest';
import {
    validateJson,
    validatePatches,
    validatePatchGroups,
    validateResolutions,
    validateResolvedConflicts,
    validatePatchApplication,
} from '../src/validation';
import { detectConflicts } from '../src/detectConflicts';
import { Patch, ConflictDetail } from '../src/types/patch';
import { ObjectSchema } from '../src/types/schema';
import { generatePatchOptionHash } from '../src/utils/hashUtils';

describe('Validation Functionality', () => {
    describe('validateJson', () => {
        it('should validate valid JSON', () => {
            const result = validateJson('{"name": "test", "value": 123}');
            expect(result.isValid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        it('should identify invalid JSON', () => {
            const result = validateJson('{"name": "test", value: 123}');
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain('JSON parse error');
        });
    });

    describe('validatePatches', () => {
        it('should validate valid patch array', () => {
            const patches: Patch[] = [
                {
                    op: 'add',
                    path: '/name',
                    value: 'test',
                    hash: generatePatchOptionHash('add', '/name', 'test'),
                },
                {
                    op: 'remove',
                    path: '/age',
                    hash: generatePatchOptionHash('remove', '/age'),
                },
                {
                    op: 'replace',
                    path: '/value',
                    value: 456,
                    hash: generatePatchOptionHash('replace', '/value', 456),
                },
            ];
            const result = validatePatches(patches);
            expect(result.isValid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        it('should identify invalid patch operation type', () => {
            type InvalidPatch = { op: string; path: string; value?: unknown; hash: string };
            const patches: InvalidPatch[] = [
                {
                    op: 'invalid',
                    path: '/name',
                    value: 'test',
                    hash: 'dummy-hash',
                },
            ];
            const result = validatePatches(patches as unknown as Patch[]);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain('invalid operation type');
        });

        it('should identify missing value in add/replace operations', () => {
            const patches: Partial<Patch>[] = [
                {
                    op: 'add',
                    path: '/name',
                    hash: 'dummy-hash',
                },
            ];
            const result = validatePatches(patches as Patch[]);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain('must include a value');
        });

        it('should identify invalid path format', () => {
            const patches: Patch[] = [
                {
                    op: 'add',
                    path: 'name',
                    value: 'test',
                    hash: generatePatchOptionHash('add', 'name', 'test'),
                },
            ];
            const result = validatePatches(patches);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain('path must start with');
        });

        it('should identify missing hash', () => {
            const patches: Partial<Patch>[] = [
                {
                    op: 'add',
                    path: '/name',
                    value: 'test',
                },
            ];
            const result = validatePatches(patches as Patch[]);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain('must have a valid hash');
        });
    });

    describe('validatePatchGroups', () => {
        it('should validate valid patch group array', () => {
            const patchGroups: Patch[][] = [
                [
                    {
                        op: 'add',
                        path: '/name',
                        value: 'test',
                        hash: generatePatchOptionHash('add', '/name', 'test'),
                    },
                ],
                [
                    {
                        op: 'replace',
                        path: '/value',
                        value: 456,
                        hash: generatePatchOptionHash('replace', '/value', 456),
                    },
                ],
            ];
            const result = validatePatchGroups(patchGroups);
            expect(result.isValid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        it('should identify invalid patch groups', () => {
            const invalidPatchGroups = [
                [
                    {
                        op: 'add',
                        path: '/name',
                        value: 'test',
                        hash: generatePatchOptionHash('add', '/name', 'test'),
                    },
                ],
                'not-an-array',
            ];
            const result = validatePatchGroups(invalidPatchGroups as Patch[][]);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain('not a valid array');
        });
    });

    describe('validateResolutions', () => {
        it('should validate valid resolutions', () => {
            const hash1 = generatePatchOptionHash('add', '/name', 'test1');
            const hash2 = generatePatchOptionHash('replace', '/name', 'test2');

            const patch1: Patch = {
                op: 'add',
                path: '/name',
                value: 'test1',
                hash: hash1,
            };
            const patch2: Patch = {
                op: 'replace',
                path: '/name',
                value: 'test2',
                hash: hash2,
            };

            const conflicts: ConflictDetail[] = [
                {
                    path: '/name',
                    options: [
                        { hash: hash1, patch: patch1, groupIndex: 0 },
                        { hash: hash2, patch: patch2, groupIndex: 1 },
                    ],
                },
            ];
            const resolutions = [
                {
                    path: '/name',
                    selectedHash: hash2,
                },
            ];

            const result = validateResolutions(conflicts, resolutions);
            expect(result.isValid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        it('should identify non-existent path in resolutions', () => {
            const hash1 = generatePatchOptionHash('add', '/name', 'test1');
            const hash2 = generatePatchOptionHash('replace', '/name', 'test2');

            const conflicts: ConflictDetail[] = [
                {
                    path: '/name',
                    options: [hash1, hash2],
                },
            ];
            const resolutions = [
                {
                    path: '/nonexistent',
                    selectedHash: hash1,
                },
            ];

            const result = validateResolutions(conflicts, resolutions);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain('references non-existent conflict path');
        });

        it('should identify invalid hash in resolutions', () => {
            const hash1 = generatePatchOptionHash('add', '/name', 'test1');
            const hash2 = generatePatchOptionHash('replace', '/name', 'test2');
            const invalidHash = 'invalid-hash';

            const conflicts: ConflictDetail[] = [
                {
                    path: '/name',
                    options: [hash1, hash2],
                },
            ];
            const resolutions = [
                {
                    path: '/name',
                    selectedHash: invalidHash,
                },
            ];

            const result = validateResolutions(conflicts, resolutions);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain(
                '"invalid-hash" is not an option for conflict at path "/name"'
            );
        });
    });

    describe('validateResolvedConflicts', () => {
        it('should validate scenarios with no conflicts after resolution', () => {
            // Simulate two patch groups with a conflict on the same path
            const hash1 = generatePatchOptionHash('add', '/name', 'A');
            const hash2 = generatePatchOptionHash('add', '/name', 'B');

            const patchGroups: Patch[][] = [
                [
                    {
                        op: 'add',
                        path: '/name',
                        value: 'A',
                        hash: hash1,
                    },
                ],
                [
                    {
                        op: 'add',
                        path: '/name',
                        value: 'B',
                        hash: hash2,
                    },
                ],
            ];

            // Detect conflicts
            const conflicts = detectConflicts(patchGroups);
            expect(conflicts.length).toBe(1);

            // Resolution: choose the second patch group's operation
            const resolutions = [
                {
                    path: '/name',
                    selectedHash: hash2,
                },
            ];

            // Validate if there are still conflicts after resolution
            const result = validateResolvedConflicts(patchGroups, conflicts, resolutions);
            expect(result.isValid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        it('should identify scenarios with conflicts remaining after resolution', () => {
            // Simulate a scenario with conflicting resolution that would introduce new conflicts
            const hashA1 = generatePatchOptionHash('add', '/name', 'A');
            const hashA2 = generatePatchOptionHash('add', '/value', 1);
            const hashB1 = generatePatchOptionHash('add', '/name', 'B');
            const hashB2 = generatePatchOptionHash('add', '/value', 2);

            const patchGroups: Patch[][] = [
                [
                    {
                        op: 'add',
                        path: '/name',
                        value: 'A',
                        hash: hashA1,
                    },
                    {
                        op: 'add',
                        path: '/value',
                        value: 1,
                        hash: hashA2,
                    },
                ],
                [
                    {
                        op: 'add',
                        path: '/name',
                        value: 'B',
                        hash: hashB1,
                    },
                    {
                        op: 'add',
                        path: '/value',
                        value: 2,
                        hash: hashB2,
                    },
                ],
            ];

            // Detect conflicts
            const conflicts = detectConflicts(patchGroups);

            console.log(patchGroups);
            console.log(conflicts);

            // Only resolve the first conflict
            const resolutions = [
                {
                    path: conflicts[0].path,
                    selectedHash: conflicts[0].options[0],
                },
            ];

            const result = validateResolvedConflicts(patchGroups, conflicts, resolutions);

            console.log(result);
            expect(result.isValid).toBe(false);
        });
    });

    describe('validatePatchApplication', () => {
        it('should validate patches that can be successfully applied', () => {
            const json = '{"name": "test", "value": 123}';
            const patches: Patch[] = [
                {
                    op: 'replace',
                    path: '/value',
                    value: 456,
                    hash: generatePatchOptionHash('replace', '/value', 456),
                },
            ];
            const schema: ObjectSchema = {
                $type: 'object',
                $fields: {
                    name: { $type: 'string' },
                    value: { $type: 'number' },
                },
            };

            const result = validatePatchApplication(json, patches, schema);
            expect(result.isValid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        it('should identify invalid JSON input', () => {
            const json = '{"name": "test", value: 123}'; // Invalid JSON
            const patches: Patch[] = [
                {
                    op: 'replace',
                    path: '/value',
                    value: 456,
                    hash: generatePatchOptionHash('replace', '/value', 456),
                },
            ];
            const schema: ObjectSchema = {
                $type: 'object',
                $fields: {
                    name: { $type: 'string' },
                    value: { $type: 'number' },
                },
            };

            const result = validatePatchApplication(json, patches, schema);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain('JSON parse error');
        });

        it('should identify invalid patches', () => {
            const json = '{"name": "test", "value": 123}';
            type InvalidPatch = { op: string; path: string; value?: unknown; hash: string };
            const patches: InvalidPatch[] = [
                {
                    op: 'invalid',
                    path: '/value',
                    value: 456,
                    hash: 'dummy-hash',
                },
            ];
            const schema: ObjectSchema = {
                $type: 'object',
                $fields: {
                    name: { $type: 'string' },
                    value: { $type: 'number' },
                },
            };

            const result = validatePatchApplication(json, patches as unknown as Patch[], schema);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain('invalid operation type');
        });

        it('should identify null Schema', () => {
            const json = '{"name": "test", "value": 123}';
            const patches: Patch[] = [
                {
                    op: 'replace',
                    path: '/value',
                    value: 456,
                    hash: generatePatchOptionHash('replace', '/value', 456),
                },
            ];
            const schema = null;

            const result = validatePatchApplication(
                json,
                patches,
                schema as unknown as ObjectSchema
            );
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain('Schema must be a valid object');
        });

        it('should identify invalid Schema', () => {
            const json = '{"name": "test", "value": 123}';
            const patches: Patch[] = [
                {
                    op: 'replace',
                    path: '/value',
                    value: 456,
                    hash: generatePatchOptionHash('replace', '/value', 456),
                },
            ];
            const schema = {};

            const result = validatePatchApplication(
                json,
                patches,
                schema as unknown as ObjectSchema
            );
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain(
                'Schema must have a valid $type field with value "object" or "array"'
            );
        });

        it('should reject add operation when path already exists', () => {
            // 这个测试用例验证：当目标路径已存在时，add 操作应该被拒绝
            const json = '{"name": "test", "value": 123}';
            const patches: Patch[] = [
                {
                    op: 'add',
                    path: '/name',
                    value: 'new-name',
                    hash: generatePatchOptionHash('add', '/name', 'new-name'),
                },
            ];
            const schema: ObjectSchema = {
                $type: 'object',
                $fields: {
                    name: { $type: 'string' },
                    value: { $type: 'number' },
                },
            };

            const result = validatePatchApplication(json, patches, schema);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain('already exists');
            expect(result.errors[0]).toContain('cannot perform add operation');
        });

        it('should allow add operation when path does not exist', () => {
            // 这个测试用例验证：当目标路径不存在时，add 操作应该被允许
            const json = '{"name": "test"}';
            const patches: Patch[] = [
                {
                    op: 'add',
                    path: '/value',
                    value: 123,
                    hash: generatePatchOptionHash('add', '/value', 123),
                },
            ];
            const schema: ObjectSchema = {
                $type: 'object',
                $fields: {
                    name: { $type: 'string' },
                    value: { $type: 'number' },
                },
            };

            const result = validatePatchApplication(json, patches, schema);
            expect(result.isValid).toBe(true);
            expect(result.errors.length).toBe(0);
        });
    });
});
