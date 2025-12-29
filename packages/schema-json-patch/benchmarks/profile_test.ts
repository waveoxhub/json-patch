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

console.log('\n🔍 性能剖析：分解各阶段耗时\n');

const sizes = [100, 200, 500, 1000];

for (const size of sizes) {
    const source = generateTestData(size);
    const target = source.map(item => ({
        ...item,
        name: `Updated ${item.name}`,
        value: item.value + 1,
    }));
    const sourceJson = JSON.stringify(source);
    const targetJson = JSON.stringify(target);

    console.log(`\n📊 Size: ${size}`);

    // 测试 JSON 解析
    const parseStart = performance.now();
    for (let i = 0; i < 100; i++) {
        JSON.parse(sourceJson);
        JSON.parse(targetJson);
    }
    const parseTime = (performance.now() - parseStart) / 100;
    console.log(`  JSON 解析: ${parseTime.toFixed(2)}ms`);

    // 测试完整生成
    const genStart = performance.now();
    for (let i = 0; i < 10; i++) {
        generatePatches(testSchema, sourceJson, targetJson);
    }
    const genTime = (performance.now() - genStart) / 10;
    console.log(`  总耗时: ${genTime.toFixed(2)}ms`);
    console.log(`  核心逻辑: ${(genTime - parseTime).toFixed(2)}ms`);

    // 计算补丁数量
    const patches = generatePatches(testSchema, sourceJson, targetJson);
    console.log(`  生成补丁数: ${patches.length}`);
    console.log(`  每补丁耗时: ${(((genTime - parseTime) * 1000) / patches.length).toFixed(2)}μs`);
}

console.log(
    '\n💡 分析：如果每补丁耗时随 size 增长，说明 optimizePatches 或 handledPaths 查找是瓶颈\n'
);
