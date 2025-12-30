import { describe, bench } from 'vitest';
import { generatePatches } from '../../src/patchGenerator.js';
import { detectConflicts } from '../../src/detectConflicts.js';
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

describe('Detect Conflicts - Two Groups', () => {
    const baseData = generateTestData(SIZES.small);
    const sourceJson = JSON.stringify(baseData);

    // No overlap
    const groupA1 = createPatchGroup(baseData, sourceJson, [0, 1, 2, 3, 4], 'A');
    const groupB1 = createPatchGroup(baseData, sourceJson, [10, 11, 12, 13, 14], 'B');

    // Partial overlap
    const groupA2 = createPatchGroup(baseData, sourceJson, [0, 5, 10, 15, 20], 'A');
    const groupB2 = createPatchGroup(baseData, sourceJson, [0, 6, 11, 16, 21], 'B');

    // Full overlap
    const groupA3 = createPatchGroup(baseData, sourceJson, [0, 1, 2, 3, 4], 'A');
    const groupB3 = createPatchGroup(baseData, sourceJson, [0, 1, 2, 3, 4], 'B');

    bench('no conflicts', () => {
        detectConflicts([groupA1, groupB1]);
    });

    bench('partial overlap (1 conflict)', () => {
        detectConflicts([groupA2, groupB2]);
    });

    bench('full overlap (5 conflicts)', () => {
        detectConflicts([groupA3, groupB3]);
    });
});

describe('Detect Conflicts - Multiple Groups', () => {
    const baseData = generateTestData(SIZES.small);
    const sourceJson = JSON.stringify(baseData);

    const group1 = createPatchGroup(baseData, sourceJson, [0, 5, 10, 15, 20], 'A');
    const group2 = createPatchGroup(baseData, sourceJson, [0, 6, 11, 16, 21], 'B');
    const group3 = createPatchGroup(baseData, sourceJson, [0, 7, 12, 17, 22], 'C');
    const group4 = createPatchGroup(baseData, sourceJson, [0, 8, 13, 18, 23], 'D');
    const group5 = createPatchGroup(baseData, sourceJson, [0, 9, 14, 19, 24], 'E');

    bench('3 groups with overlaps', () => {
        detectConflicts([group1, group2, group3]);
    });

    bench('5 groups with overlaps', () => {
        detectConflicts([group1, group2, group3, group4, group5]);
    });
});

describe('Detect Conflicts - Large Patches', () => {
    const baseData = generateTestData(SIZES.medium);
    const sourceJson = JSON.stringify(baseData);

    // Create large patch groups with many changes
    const groupLarge1 = createPatchGroup(
        baseData,
        sourceJson,
        Array.from({ length: 30 }, (_, i) => i * 3),
        'A'
    );
    const groupLarge2 = createPatchGroup(
        baseData,
        sourceJson,
        Array.from({ length: 30 }, (_, i) => i * 3 + 1),
        'B'
    );
    const groupLarge3 = createPatchGroup(
        baseData,
        sourceJson,
        Array.from({ length: 30 }, (_, i) => i * 3),
        'C'
    );

    bench('2 large groups, no conflicts (60 patches each)', () => {
        detectConflicts([groupLarge1, groupLarge2]);
    });

    bench('2 large groups, all conflicts (30 overlapping)', () => {
        detectConflicts([groupLarge1, groupLarge3]);
    });
});
