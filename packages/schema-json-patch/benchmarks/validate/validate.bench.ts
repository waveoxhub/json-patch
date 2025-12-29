import { describe, bench } from 'vitest';
import { generatePatches } from '../../src/patchGenerator.js';
import { detectConflicts } from '../../src/detectConflicts.js';
import {
    validateJson,
    validatePatches,
    validatePatchGroups,
    validatePatchApplication,
    validateResolutions,
} from '../../src/validatePatches.js';
import { testSchema, generateTestData, modifyEveryNth, SIZES } from '../shared/index.js';

describe('Validate JSON', () => {
    const smallData = JSON.stringify(generateTestData(SIZES.tiny));
    const mediumData = JSON.stringify(generateTestData(SIZES.medium));
    const largeData = JSON.stringify(generateTestData(SIZES.large));

    bench('validate small JSON (10 items)', () => {
        validateJson(smallData);
    });

    bench('validate medium JSON (100 items)', () => {
        validateJson(mediumData);
    });

    bench('validate large JSON (500 items)', () => {
        validateJson(largeData);
    });

    bench('validate invalid JSON', () => {
        validateJson('{ invalid json }');
    });
});

describe('Validate Patches', () => {
    const source = generateTestData(SIZES.medium);
    const sourceJson = JSON.stringify(source);

    const targetSmall = modifyEveryNth(source, 10, item => ({
        ...item,
        name: `Updated ${item.name}`,
    }));
    const patchesSmall = generatePatches(testSchema, sourceJson, JSON.stringify(targetSmall));

    const targetLarge = source.map(item => ({
        ...item,
        name: `Updated ${item.name}`,
    }));
    const patchesLarge = generatePatches(testSchema, sourceJson, JSON.stringify(targetLarge));

    bench('validate 10 patches', () => {
        validatePatches(patchesSmall);
    });

    bench('validate 100 patches', () => {
        validatePatches(patchesLarge);
    });
});

describe('Validate Patch Groups', () => {
    const source = generateTestData(SIZES.small);
    const sourceJson = JSON.stringify(source);

    const createGroup = (indices: number[], suffix: string) => {
        const target = source.map((item, i) =>
            indices.includes(i) ? { ...item, name: `${item.name} ${suffix}` } : item
        );
        return generatePatches(testSchema, sourceJson, JSON.stringify(target));
    };

    const groups2 = [createGroup([0, 1, 2], 'A'), createGroup([3, 4, 5], 'B')];

    const groups5 = [
        createGroup([0, 1], 'A'),
        createGroup([2, 3], 'B'),
        createGroup([4, 5], 'C'),
        createGroup([6, 7], 'D'),
        createGroup([8, 9], 'E'),
    ];

    bench('validate 2 patch groups', () => {
        validatePatchGroups(groups2);
    });

    bench('validate 5 patch groups', () => {
        validatePatchGroups(groups5);
    });
});

describe('Validate Patch Application', () => {
    const source = generateTestData(SIZES.medium);
    const sourceJson = JSON.stringify(source);

    const targetValid = modifyEveryNth(source, 5, item => ({
        ...item,
        name: `Updated ${item.name}`,
    }));
    const validPatches = generatePatches(testSchema, sourceJson, JSON.stringify(targetValid));

    bench('validate valid patch application', () => {
        validatePatchApplication(sourceJson, validPatches, testSchema);
    });
});

describe('Validate Resolutions', () => {
    const source = generateTestData(SIZES.small);
    const sourceJson = JSON.stringify(source);

    const createGroup = (indices: number[], suffix: string) => {
        const target = source.map((item, i) =>
            indices.includes(i) ? { ...item, name: `${item.name} ${suffix}` } : item
        );
        return generatePatches(testSchema, sourceJson, JSON.stringify(target));
    };

    const group1 = createGroup([0, 1, 2, 3, 4], 'A');
    const group2 = createGroup([0, 1, 2, 3, 4], 'B');
    const conflicts = detectConflicts([group1, group2]);

    const resolutions = conflicts.map(c => ({
        path: c.path,
        selectedHash: c.options[0],
    }));

    bench('validate 5 resolutions', () => {
        validateResolutions(conflicts, resolutions);
    });
});
