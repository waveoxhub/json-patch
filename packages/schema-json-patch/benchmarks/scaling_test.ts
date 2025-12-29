import { generatePatches } from '../src/patchGenerator.js';
import { Schema } from '../src/types/schema.js';

const generateTestData = (size: number) => {
    const items = [];
    for (let i = 0; i < size; i++) {
        items.push({
            id: `item_${i}`,
            name: `Item ${i}`,
            description: `Description for item ${i}`,
            value: i * 100,
            tags: ['tag1', 'tag2', 'tag3'],
            metadata: { createdAt: '2024-01-01', updatedAt: '2024-01-02' },
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
                $fields: { createdAt: { $type: 'string' }, updatedAt: { $type: 'string' } },
            },
        },
    },
};

const sizes = [10, 50, 100, 200, 500, 1000];
console.log('\n性能扩展测试 (随着数据量增长的性能变化)\n');
console.log('Size\t| Time (ms)\t| Ops/sec\t| Time per item (μs)\t| Scaling factor');
console.log('-'.repeat(80));

let baseTimePerItem = 0;

for (const size of sizes) {
    const source = generateTestData(size);
    const target = generateTestData(size).map((item, i) =>
        i % 5 === 0 ? { ...item, name: `Updated ${item.name}` } : item
    );
    const sourceJson = JSON.stringify(source);
    const targetJson = JSON.stringify(target);

    // Warmup
    for (let i = 0; i < 3; i++) {
        generatePatches(testSchema, sourceJson, targetJson);
    }

    // Measure
    const iterations = Math.max(10, Math.floor(1000 / size));
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        generatePatches(testSchema, sourceJson, targetJson);
    }
    const elapsed = performance.now() - start;

    const avgTime = elapsed / iterations;
    const opsPerSec = (iterations / elapsed) * 1000;
    const timePerItem = (avgTime * 1000) / size;

    if (size === 10) baseTimePerItem = timePerItem;
    const scalingFactor = timePerItem / baseTimePerItem;

    console.log(
        `${size}\t| ${avgTime.toFixed(2)}\t\t| ${opsPerSec.toFixed(0)}\t\t| ${timePerItem.toFixed(2)}\t\t\t| ${scalingFactor.toFixed(2)}x`
    );
}
