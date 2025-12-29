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
        },
    },
};

// Fisher-Yates shuffle
const shuffle = <T>(arr: T[]): T[] => {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
};

console.log('\n🔀 顺序变化场景性能测试\n');
console.log('测试项目完全打乱顺序的情况（触发 order detection）');
console.log('-'.repeat(80));

const sizes = [10, 50, 100, 200, 500, 1000];
let baseTimePerItem = 0;

console.log('Size\t| Time (ms)\t| Time per item (μs)\t| Scaling factor');
console.log('-'.repeat(60));

for (const size of sizes) {
    const source = generateTestData(size);
    const target = shuffle(generateTestData(size)); // 完全打乱顺序
    const sourceJson = JSON.stringify(source);
    const targetJson = JSON.stringify(target);

    // Warmup
    for (let i = 0; i < 3; i++) {
        generatePatches(testSchema, sourceJson, targetJson);
    }

    // Measure
    const iterations = Math.max(5, Math.floor(500 / size));
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        generatePatches(testSchema, sourceJson, targetJson);
    }
    const elapsed = performance.now() - start;

    const avgTime = elapsed / iterations;
    const timePerItem = (avgTime * 1000) / size;

    if (size === 10) baseTimePerItem = timePerItem;
    const scalingFactor = timePerItem / baseTimePerItem;

    console.log(
        `${size}\t| ${avgTime.toFixed(2)}\t\t| ${timePerItem.toFixed(2)}\t\t\t| ${scalingFactor.toFixed(2)}x`
    );
}

console.log('\n📊 大量变更场景测试\n');
console.log('测试大量元素都发生修改的情况');
console.log('-'.repeat(80));

let baseTimePerItem2 = 0;
console.log('Size\t| Time (ms)\t| Time per item (μs)\t| Scaling factor');
console.log('-'.repeat(60));

for (const size of sizes) {
    const source = generateTestData(size);
    // 修改所有元素
    const target = source.map(item => ({
        ...item,
        name: `Updated ${item.name}`,
        value: item.value + 1,
    }));
    const sourceJson = JSON.stringify(source);
    const targetJson = JSON.stringify(target);

    // Warmup
    for (let i = 0; i < 3; i++) {
        generatePatches(testSchema, sourceJson, targetJson);
    }

    // Measure
    const iterations = Math.max(5, Math.floor(500 / size));
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        generatePatches(testSchema, sourceJson, targetJson);
    }
    const elapsed = performance.now() - start;

    const avgTime = elapsed / iterations;
    const timePerItem = (avgTime * 1000) / size;

    if (size === 10) baseTimePerItem2 = timePerItem;
    const scalingFactor = timePerItem / baseTimePerItem2;

    console.log(
        `${size}\t| ${avgTime.toFixed(2)}\t\t| ${timePerItem.toFixed(2)}\t\t\t| ${scalingFactor.toFixed(2)}x`
    );
}

console.log('\n✅ 如果 Scaling factor 保持 < 2x，性能是可接受的');
console.log('❌ 如果 Scaling factor > 2x 且持续增长，存在非线性性能问题\n');
