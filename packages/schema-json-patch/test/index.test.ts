import { describe, it, expect } from 'vitest';
import { generatePatches, applyPatches, detectConflicts, resolveConflicts } from '../src';
import {
    testSchema,
    sampleJsonA,
    sampleJsonB,
    sampleJsonC,
    sampleJsonD,
} from './__fixtures__/sample1';
import { Schema } from '../src/types/schema';

describe('Integration Tests', () => {
    it('should generate and apply patches', () => {
        const sourceJson = sampleJsonA;
        const targetJson = sampleJsonB;

        // Generate patches
        const patches = generatePatches(testSchema, sourceJson, targetJson);
        expect(patches).toStrictEqual([
            {
                op: 'replace',
                path: '/id_rsKW5kltWYSRz1TRf5W7f/replaceRules/id_DqPuVJe7lX0GyWvbBPCWL/replace',
                value: '最热',
            },
            {
                op: 'replace',
                path: '/id_yDw1a7QWI9Xd2eSsicOnu/replaceRules/id_2EJWGUk3oNG8vnn258Rbz/replace',
                value: '注意',
            },
            {
                op: 'replace',
                path: '/id_yDw1a7QWI9Xd2eSsicOnu/replaceRules/id_0BLLIdbgk9r0AodgfwwUP/replace',
                value: '评级排行',
            },
        ]);

        // Apply patches
        const result = applyPatches(sourceJson, patches, testSchema);
        const resultObj = JSON.parse(result);

        // Verify result - check if translations were correctly modified
        expect(result).toContain('最热');
        expect(result).not.toContain('热门');
    });

    it('should detect and resolve conflicts', () => {
        // Create patches from differences between sampleJsonA and sampleJsonB/C
        const patch1 = generatePatches(testSchema, sampleJsonA, sampleJsonB);
        const patch2 = generatePatches(testSchema, sampleJsonA, sampleJsonC);

        // Detect conflicts
        const conflicts = detectConflicts([patch1, patch2]);

        // Should have at least one conflict (translation differences)
        expect(conflicts.length).toBeGreaterThan(0);

        // Define conflict resolution strategy - select patch1 changes
        const resolutionStrategy = conflicts.reduce(
            (strategy, _, index) => {
                strategy[index.toString()] = 0; // Select first patch
                return strategy;
            },
            {} as Record<string, number>
        );

        // Resolve conflicts
        const resolvedPatches = resolveConflicts(
            [...patch1, ...patch2],
            conflicts,
            resolutionStrategy
        );

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
        expect(patches).toStrictEqual([
            {
                op: 'replace',
                path: '',
                value: { 'special/path': 'new value', 'path~with~tilde': 'new tilde' },
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
