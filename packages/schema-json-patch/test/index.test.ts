import { describe, it, expect } from 'vitest';
import {
    generatePatches,
    applyPatches,
    detectConflicts,
    resolveConflicts,
    ConflictResolutions,
} from '../src';
import {
    testSchema,
    sampleJsonA,
    sampleJsonB,
    sampleJsonC,
    sampleJsonD,
} from './__fixtures__/sample1';
import { Schema } from '../src/types/schema';
import { generatePatchOptionHash } from '../src/utils/hashUtils';

describe('Integration Tests', () => {
    // ----- patches -----
    const result_0_op = 'replace';
    const result_0_path = '/id_rsKW5kltWYSRz1TRf5W7f/replaceRules/id_DqPuVJe7lX0GyWvbBPCWL/replace';
    const result_0_value = '最热';
    const result_0_hash = generatePatchOptionHash(result_0_op, result_0_path, result_0_value);
    const result_1_op = 'replace';
    const result_1_path = '/id_yDw1a7QWI9Xd2eSsicOnu/replaceRules/id_2EJWGUk3oNG8vnn258Rbz/replace';
    const result_1_value = '注意';
    const result_1_hash = generatePatchOptionHash(result_1_op, result_1_path, result_1_value);
    const result_2_op = 'replace';
    const result_2_path = '/id_yDw1a7QWI9Xd2eSsicOnu/replaceRules/id_0BLLIdbgk9r0AodgfwwUP/replace';
    const result_2_value = '评级排行';
    const result_2_hash = generatePatchOptionHash(result_2_op, result_2_path, result_2_value);

    it('should generate and apply patches', () => {
        const sourceJson = sampleJsonA;
        const targetJson = sampleJsonB;

        const patches = generatePatches(testSchema, sourceJson, targetJson);

        expect(patches).toStrictEqual([
            {
                op: result_0_op,
                path: result_0_path,
                value: result_0_value,
                hash: result_0_hash,
            },
            {
                op: result_1_op,
                path: result_1_path,
                value: result_1_value,
                hash: result_1_hash,
            },
            {
                op: result_2_op,
                path: result_2_path,
                value: result_2_value,
                hash: result_2_hash,
            },
        ]);

        const result = applyPatches(sourceJson, patches, testSchema);
        expect(result).toContain('最热');
        expect(result).not.toContain('热门');
    });

    it('should detect and resolve conflicts', () => {
        // Create patches from differences between sampleJsonA and sampleJsonB/C
        const patch1 = generatePatches(testSchema, sampleJsonA, sampleJsonB);
        const patch2 = generatePatches(testSchema, sampleJsonA, sampleJsonC);

        const conflicts = detectConflicts([patch1, patch2]);

        expect(conflicts.length).toBeGreaterThan(0);

        const resolveResult: ConflictResolutions = [
            {
                path: result_1_path,
                selectedHash: conflicts[0].options[0],
            },
        ];

        const resolvedPatches = resolveConflicts([...patch1, ...patch2], conflicts, resolveResult);

        // Apply resolved patches
        const result = applyPatches(sampleJsonA, resolvedPatches, testSchema);

        // Verify result - should adopt sampleJsonB translations
        expect(result).toContain('最热');
        expect(result).not.toContain('热门');
    });

    it('should handle complex JSON structures with multiple changes', () => {
        const sourceJson = sampleJsonA;
        const targetJson = sampleJsonD;

        // Generate patches
        const patches = generatePatches(testSchema, sourceJson, targetJson);

        // Should have multiple patches (new translations and description changes)
        expect(patches.length).toBeGreaterThan(1);

        // Apply patches
        const result = applyPatches(sourceJson, patches, testSchema);
        const resultObj = JSON.parse(result);

        // Verify results
        expect(result).toContain('菜单栏翻译'); // Check description update
        expect(result).toContain('比赛'); // Check new translation
        expect(result).toContain('题库'); // Check new translation
        expect(result).toContain('rating排行榜'); // Check translation change
    });

    it('should handle paths with special characters', () => {
        // Create JSON data with special characters in paths
        const schema: Schema = {
            $type: 'object',
            $fields: {
                'special/path': { $type: 'string' },
                'path~with~tilde': { $type: 'string' },
            },
        };

        const source = JSON.stringify({
            'special/path': 'old value',
            'path~with~tilde': 'old tilde',
        });

        const target = JSON.stringify({
            'special/path': 'new value',
            'path~with~tilde': 'new tilde',
        });

        // Generate patches
        const patches = generatePatches(schema, source, target);

        // Verify generated patches
        expect(patches).toHaveLength(1);
        const result_0_op = 'replace';
        const result_0_path = '';
        const result_0_value = { 'special/path': 'new value', 'path~with~tilde': 'new tilde' };
        const result_0_hash = generatePatchOptionHash(result_0_op, result_0_path, result_0_value);
        expect(patches).toStrictEqual([
            {
                hash: result_0_hash,
                op: result_0_op,
                path: result_0_path,
                value: result_0_value,
            },
        ]);

        // Apply patches
        const result = applyPatches(source, patches, schema);
        const resultObj = JSON.parse(result);

        // Verify results
        expect(resultObj['special/path']).toBe('new value');
        expect(resultObj['path~with~tilde']).toBe('new tilde');
    });
});
