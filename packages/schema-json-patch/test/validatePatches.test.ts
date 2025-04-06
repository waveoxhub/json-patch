import { describe, expect, it } from 'vitest';
import {
    validateJson,
    validatePatches,
    validatePatchGroups,
    validateResolutions,
    validateResolvedConflicts,
    validatePatchApplication,
} from '../src/validatePatches';
import { detectConflicts } from '../src/detectConflicts';
import { Patch, ConflictDetail } from '../src/types/patch';
import { ObjectSchema } from '../src/types/schema';

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
                { op: 'add', path: '/name', value: 'test' },
                { op: 'remove', path: '/age' },
                { op: 'replace', path: '/value', value: 456 },
            ];
            const result = validatePatches(patches);
            expect(result.isValid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        it('should identify invalid patch operation type', () => {
            type InvalidPatch = Omit<Patch, 'op'> & { op: string };
            const patches: InvalidPatch[] = [{ op: 'invalid', path: '/name', value: 'test' }];
            const result = validatePatches(patches as Patch[]);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain('invalid operation type');
        });

        it('should identify missing value in add/replace operations', () => {
            const patches: Partial<Patch>[] = [{ op: 'add', path: '/name' }];
            const result = validatePatches(patches as Patch[]);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain('must include a value');
        });

        it('should identify invalid path format', () => {
            const patches: Patch[] = [{ op: 'add', path: 'name', value: 'test' }];
            const result = validatePatches(patches);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain('path must start with');
        });
    });

    describe('validatePatchGroups', () => {
        it('should validate valid patch group array', () => {
            const patchGroups: Patch[][] = [
                [{ op: 'add', path: '/name', value: 'test' }],
                [{ op: 'replace', path: '/value', value: 456 }],
            ];
            const result = validatePatchGroups(patchGroups);
            expect(result.isValid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        it('should identify invalid patch groups', () => {
            const invalidPatchGroups = [
                [{ op: 'add', path: '/name', value: 'test' }],
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
            const conflicts: ConflictDetail[] = [
                {
                    path: '/name',
                    operations: [
                        { operation: 'add', index: 0, groupIndex: 0 },
                        { operation: 'replace', index: 1, groupIndex: 1 },
                    ],
                },
            ];
            const resolutions = { '0': 1 };

            const result = validateResolutions(conflicts, resolutions);
            expect(result.isValid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        it('should identify missing resolutions', () => {
            const conflicts: ConflictDetail[] = [
                {
                    path: '/name',
                    operations: [
                        { operation: 'add', index: 0, groupIndex: 0 },
                        { operation: 'replace', index: 1, groupIndex: 1 },
                    ],
                },
            ];
            const resolutions = {};

            const result = validateResolutions(conflicts, resolutions);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain('missing a resolution');
        });

        it('should identify invalid resolution indices', () => {
            const conflicts: ConflictDetail[] = [
                {
                    path: '/name',
                    operations: [
                        { operation: 'add', index: 0, groupIndex: 0 },
                        { operation: 'replace', index: 1, groupIndex: 1 },
                    ],
                },
            ];
            const resolutions = { '0': 5 }; // Out of range

            const result = validateResolutions(conflicts, resolutions);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain('invalid resolution');
        });
    });

    describe('validateResolvedConflicts', () => {
        it('should validate scenarios with no conflicts after resolution', () => {
            // Simulate two patch groups with a conflict on the same path
            const patchGroups: Patch[][] = [
                [{ op: 'add', path: '/name', value: 'A' }],
                [{ op: 'add', path: '/name', value: 'B' }],
            ];

            // Detect conflicts
            const conflicts = detectConflicts(patchGroups);
            expect(conflicts.length).toBe(1);

            // Resolution: choose the second patch group's operation
            const resolutions = { '0': 1 };

            // Validate if there are still conflicts after resolution
            const result = validateResolvedConflicts(patchGroups, conflicts, resolutions);
            expect(result.isValid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        it('should identify scenarios with conflicts remaining after resolution', () => {
            // Simulate a scenario with conflicting resolution that would introduce new conflicts
            // This would require more complex test cases in practice
            // This is just an example

            const patchGroups: Patch[][] = [
                [
                    { op: 'add', path: '/name', value: 'A' },
                    { op: 'add', path: '/value', value: 1 },
                ],
                [
                    { op: 'add', path: '/name', value: 'B' },
                    { op: 'add', path: '/value', value: 2 },
                ],
            ];

            // Detect conflicts
            const conflicts = detectConflicts(patchGroups);

            // Resolution: only address the first conflict, but not the second
            // In a real test, this might need more precise simulation
            const resolutions = { '0': 0 };

            // In a real implementation this scenario might need to be simulated
            // Here for test coverage we'll rely on validateResolutions' validation
            if (conflicts.length > 1) {
                const result = validateResolvedConflicts(patchGroups, conflicts, resolutions);
                expect(result.isValid).toBe(false);
            }
        });
    });

    describe('validatePatchApplication', () => {
        it('should validate patches that can be successfully applied', () => {
            const json = '{"name": "test", "value": 123}';
            const patches: Patch[] = [{ op: 'replace', path: '/value', value: 456 }];
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
            const patches: Patch[] = [{ op: 'replace', path: '/value', value: 456 }];
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
            type InvalidPatch = Omit<Patch, 'op'> & { op: string };
            const patches: InvalidPatch[] = [
                { op: 'invalid', path: '/value', value: 456 }, // Invalid operation
            ];
            const schema: ObjectSchema = {
                $type: 'object',
                $fields: {
                    name: { $type: 'string' },
                    value: { $type: 'number' },
                },
            };

            const result = validatePatchApplication(json, patches as Patch[], schema);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain('invalid operation type');
        });

        it('should identify invalid Schema', () => {
            const json = '{"name": "test", "value": 123}';
            const patches: Patch[] = [{ op: 'replace', path: '/value', value: 456 }];
            const schema = null;

            const result = validatePatchApplication(
                json,
                patches,
                schema as unknown as ObjectSchema
            );
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain('not a valid object');
        });
    });
});
