import { describe, bench } from 'vitest';
import { generatePatches } from '../../src/patchGenerator.js';
import { applyPatches } from '../../src/applyPatches.js';
import { testSchema, generateTestData, modifyEveryNth, SIZES } from '../shared/index.js';

describe('Apply Patches - Small Dataset', () => {
    const source = generateTestData(SIZES.tiny);
    const sourceJson = JSON.stringify(source);

    const target = modifyEveryNth(source, 3, item => ({
        ...item,
        name: `Updated ${item.name}`,
    }));
    const patches = generatePatches(testSchema, sourceJson, JSON.stringify(target));

    bench('apply few patches', () => {
        applyPatches(sourceJson, patches, testSchema);
    });
});

describe('Apply Patches - Medium Dataset', () => {
    const source = generateTestData(SIZES.medium);
    const sourceJson = JSON.stringify(source);

    const targetSparse = modifyEveryNth(source, 5, item => ({
        ...item,
        name: `Updated ${item.name}`,
    }));
    const patchesSparse = generatePatches(testSchema, sourceJson, JSON.stringify(targetSparse));

    const targetDense = source.map(item => ({
        ...item,
        name: `Updated ${item.name}`,
        value: item.value + 1,
    }));
    const patchesDense = generatePatches(testSchema, sourceJson, JSON.stringify(targetDense));

    bench('apply sparse patches (20 changes)', () => {
        applyPatches(sourceJson, patchesSparse, testSchema);
    });

    bench('apply dense patches (all items)', () => {
        applyPatches(sourceJson, patchesDense, testSchema);
    });
});

describe('Apply Patches - Large Dataset', () => {
    const source = generateTestData(SIZES.large);
    const sourceJson = JSON.stringify(source);

    const target = modifyEveryNth(source, 10, item => ({
        ...item,
        name: `Updated ${item.name}`,
    }));
    const patches = generatePatches(testSchema, sourceJson, JSON.stringify(target));

    bench('apply 50 patches to 500 items', () => {
        applyPatches(sourceJson, patches, testSchema);
    });
});

describe('Apply Patches - Complex Operations', () => {
    const source = generateTestData(SIZES.medium);
    const sourceJson = JSON.stringify(source);

    // Add new items
    const targetAdd = [
        ...source,
        ...generateTestData(20, false).map((item, i) => ({
            ...item,
            id: `new_item_${i}`,
        })),
    ];
    const patchesAdd = generatePatches(testSchema, sourceJson, JSON.stringify(targetAdd));

    // Remove items
    const targetRemove = source.slice(0, 80);
    const patchesRemove = generatePatches(testSchema, sourceJson, JSON.stringify(targetRemove));

    // Mixed operations
    const targetMixed = [
        ...source.slice(0, 50).map(item => ({ ...item, name: `Modified ${item.name}` })),
        ...generateTestData(10, false).map((item, i) => ({ ...item, id: `new_${i}` })),
    ];
    const patchesMixed = generatePatches(testSchema, sourceJson, JSON.stringify(targetMixed));

    bench('apply add operations (20 adds)', () => {
        applyPatches(sourceJson, patchesAdd, testSchema);
    });

    bench('apply remove operations (20 removes)', () => {
        applyPatches(sourceJson, patchesRemove, testSchema);
    });

    bench('apply mixed operations', () => {
        applyPatches(sourceJson, patchesMixed, testSchema);
    });
});
