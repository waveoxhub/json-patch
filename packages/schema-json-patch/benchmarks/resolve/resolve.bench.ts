import { describe, bench } from 'vitest';
import { generatePatches } from '../../src/patchGenerator.js';
import { detectConflicts } from '../../src/detectConflicts.js';
import { resolveConflicts } from '../../src/resolveConflicts.js';
import { testSchema, generateTestData, SIZES } from '../shared/index.js';

const createPatchGroup = (
    baseData: ReturnType<typeof generateTestData>,
    sourceJson: string,
    modifyIndices: number[],
    suffix: string
) => {
    const modified = baseData.map((item, i) =>
        modifyIndices.includes(i) ? { ...item, name: `${item.name} ${suffix}` } : item
    );
    return generatePatches(testSchema, sourceJson, JSON.stringify(modified));
};

describe('Resolve Conflicts - Simple', () => {
    const baseData = generateTestData(SIZES.small);
    const sourceJson = JSON.stringify(baseData);

    const group1 = createPatchGroup(baseData, sourceJson, [0, 1, 2], 'A');
    const group2 = createPatchGroup(baseData, sourceJson, [0, 1, 2], 'B');

    const conflicts = detectConflicts([group1, group2]);
    const resolutions = conflicts.map(c => ({
        path: c.path,
        selectedHash: c.options[0],
    }));

    bench('resolve 3 conflicts', () => {
        resolveConflicts([group1, group2], conflicts, resolutions);
    });
});

describe('Resolve Conflicts - Medium', () => {
    const baseData = generateTestData(SIZES.small);
    const sourceJson = JSON.stringify(baseData);

    const indices = Array.from({ length: 10 }, (_, i) => i);
    const group1 = createPatchGroup(baseData, sourceJson, indices, 'A');
    const group2 = createPatchGroup(baseData, sourceJson, indices, 'B');

    const conflicts = detectConflicts([group1, group2]);
    const resolutions = conflicts.map(c => ({
        path: c.path,
        selectedHash: c.options[0],
    }));

    bench('resolve 10 conflicts', () => {
        resolveConflicts([group1, group2], conflicts, resolutions);
    });
});

describe('Resolve Conflicts - Multiple Groups', () => {
    const baseData = generateTestData(SIZES.small);
    const sourceJson = JSON.stringify(baseData);

    const indices = [0, 5, 10, 15, 20];
    const group1 = createPatchGroup(baseData, sourceJson, indices, 'A');
    const group2 = createPatchGroup(baseData, sourceJson, indices, 'B');
    const group3 = createPatchGroup(baseData, sourceJson, indices, 'C');

    const conflicts = detectConflicts([group1, group2, group3]);
    const resolutions = conflicts.map(c => ({
        path: c.path,
        selectedHash: c.options[0],
    }));

    bench('resolve conflicts from 3 groups', () => {
        resolveConflicts([group1, group2, group3], conflicts, resolutions);
    });
});

describe('Resolve Conflicts - With Custom Resolutions', () => {
    const baseData = generateTestData(SIZES.small);
    const sourceJson = JSON.stringify(baseData);

    const group1 = createPatchGroup(baseData, sourceJson, [0, 1, 2, 3, 4], 'A');
    const group2 = createPatchGroup(baseData, sourceJson, [0, 1, 2, 3, 4], 'B');

    const conflicts = detectConflicts([group1, group2]);

    // Mix of selected and custom resolutions
    const resolutions = conflicts.slice(0, 3).map(c => ({
        path: c.path,
        selectedHash: c.options[0],
    }));

    const customResolutions = conflicts.slice(3).map(c => ({
        path: c.path,
        patch: { op: 'replace' as const, path: c.path, value: 'Custom Value' },
    }));

    bench('resolve with custom values', () => {
        resolveConflicts([group1, group2], conflicts, resolutions, customResolutions);
    });
});
