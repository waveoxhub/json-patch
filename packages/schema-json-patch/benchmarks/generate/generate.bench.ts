import { describe, bench } from 'vitest';
import { generatePatches } from '../../src/patchGenerator.js';
import { testSchema, generateTestData, modifyEveryNth, shuffle, SIZES } from '../shared/index.js';

describe('Generate Patches - Small Dataset', () => {
    const source = generateTestData(SIZES.tiny);
    const sourceJson = JSON.stringify(source);

    bench('few changes (3 items)', () => {
        const target = modifyEveryNth(source, 3, item => ({
            ...item,
            name: `Updated ${item.name}`,
        }));
        generatePatches(testSchema, sourceJson, JSON.stringify(target));
    });

    bench('all items modified', () => {
        const target = source.map(item => ({
            ...item,
            name: `Updated ${item.name}`,
            value: item.value + 1,
        }));
        generatePatches(testSchema, sourceJson, JSON.stringify(target));
    });
});

describe('Generate Patches - Medium Dataset', () => {
    const source = generateTestData(SIZES.medium);
    const sourceJson = JSON.stringify(source);

    bench('sparse changes (20%)', () => {
        const target = modifyEveryNth(source, 5, item => ({
            ...item,
            name: `Updated ${item.name}`,
        }));
        generatePatches(testSchema, sourceJson, JSON.stringify(target));
    });

    bench('dense changes (50%)', () => {
        const target = modifyEveryNth(source, 2, item => ({
            ...item,
            name: `Updated ${item.name}`,
        }));
        generatePatches(testSchema, sourceJson, JSON.stringify(target));
    });
});

describe('Generate Patches - Large Dataset', () => {
    const source = generateTestData(SIZES.large);
    const sourceJson = JSON.stringify(source);

    bench('sparse changes (10%)', () => {
        const target = modifyEveryNth(source, 10, item => ({
            ...item,
            name: `Updated ${item.name}`,
        }));
        generatePatches(testSchema, sourceJson, JSON.stringify(target));
    });

    bench('bulk changes (all)', () => {
        const target = source.map(item => ({
            ...item,
            name: `Updated ${item.name}`,
        }));
        generatePatches(testSchema, sourceJson, JSON.stringify(target));
    });
});

describe('Generate Patches - Order Changes', () => {
    const source = generateTestData(SIZES.medium);
    const sourceJson = JSON.stringify(source);

    bench('fully shuffled array', () => {
        const target = shuffle([...source]);
        generatePatches(testSchema, sourceJson, JSON.stringify(target));
    });

    bench('reversed array', () => {
        const target = [...source].reverse();
        generatePatches(testSchema, sourceJson, JSON.stringify(target));
    });

    bench('partial reorder (first half moved)', () => {
        const half = Math.floor(source.length / 2);
        const target = [...source.slice(half), ...source.slice(0, half)];
        generatePatches(testSchema, sourceJson, JSON.stringify(target));
    });
});
