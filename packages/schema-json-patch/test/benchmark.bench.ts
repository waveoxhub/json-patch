import { describe, bench } from 'vitest';
import { generatePatches } from '../src/patchGenerator';
import { detectConflicts } from '../src/detectConflicts';
import { Schema } from '../src/types/schema';

/**
 * 生成测试数据
 */
const generateTestData = (size: number) => {
    const items = [];
    for (let i = 0; i < size; i++) {
        items.push({
            id: `item_${i}`,
            name: `Item ${i}`,
            description: `Description for item ${i}`,
            value: i * 100,
            tags: ['tag1', 'tag2', 'tag3'],
            metadata: {
                createdAt: '2024-01-01',
                updatedAt: '2024-01-02',
            },
        });
    }
    return items;
};

const testSchema: Schema = {
    $type: 'array',
    $item: {
        $type: 'object',
        $pk: 'id',
        $fields: {
            id: { $type: 'string' },
            name: { $type: 'string' },
            description: { $type: 'string' },
            value: { $type: 'number' },
            tags: { $type: 'array', $item: { $type: 'string' } },
            metadata: {
                $type: 'object',
                $fields: {
                    createdAt: { $type: 'string' },
                    updatedAt: { $type: 'string' },
                },
            },
        },
    },
};

describe('Patch Generation Performance', () => {
    const sourceSmall = generateTestData(10);
    const targetSmall = generateTestData(10).map((item, i) =>
        i % 3 === 0 ? { ...item, name: `Updated ${item.name}` } : item
    );

    const sourceMedium = generateTestData(100);
    const targetMedium = generateTestData(100).map((item, i) =>
        i % 5 === 0 ? { ...item, name: `Updated ${item.name}` } : item
    );

    const sourceLarge = generateTestData(500);
    const targetLarge = generateTestData(500).map((item, i) =>
        i % 10 === 0 ? { ...item, name: `Updated ${item.name}` } : item
    );

    bench('generatePatches - 10 items, 3 changes', () => {
        generatePatches(testSchema, JSON.stringify(sourceSmall), JSON.stringify(targetSmall));
    });

    bench('generatePatches - 100 items, 20 changes', () => {
        generatePatches(testSchema, JSON.stringify(sourceMedium), JSON.stringify(targetMedium));
    });

    bench('generatePatches - 500 items, 50 changes', () => {
        generatePatches(testSchema, JSON.stringify(sourceLarge), JSON.stringify(targetLarge));
    });
});

describe('Conflict Detection Performance', () => {
    const baseData = generateTestData(50);
    const sourceJson = JSON.stringify(baseData);

    // 创建多个补丁组
    const createPatchGroup = (modifyIndices: number[], suffix: string) => {
        const modified = baseData.map((item, i) =>
            modifyIndices.includes(i) ? { ...item, name: `${item.name} ${suffix}` } : item
        );
        return generatePatches(testSchema, sourceJson, JSON.stringify(modified));
    };

    const group1 = createPatchGroup([0, 5, 10, 15, 20], 'A');
    const group2 = createPatchGroup([0, 6, 11, 16, 21], 'B');
    const group3 = createPatchGroup([0, 7, 12, 17, 22], 'C');

    bench('detectConflicts - 2 groups, few overlaps', () => {
        detectConflicts([group1, group2]);
    });

    bench('detectConflicts - 3 groups, more overlaps', () => {
        detectConflicts([group1, group2, group3]);
    });
});
