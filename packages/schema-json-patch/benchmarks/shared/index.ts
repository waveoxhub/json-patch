import { Schema } from '../../src/types/schema.js';

/**
 * Standard test schema for benchmarks
 */
export const testSchema: Schema = {
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

/**
 * Simple schema for lightweight tests
 */
export const simpleSchema: Schema = {
    $type: 'array',
    $item: {
        $type: 'object',
        $pk: 'id',
        $fields: {
            id: { $type: 'string' },
            name: { $type: 'string' },
            value: { $type: 'number' },
        },
    },
};

export interface TestItem {
    id: string;
    name: string;
    description: string;
    value: number;
    tags?: string[];
    metadata?: {
        createdAt: string;
        updatedAt: string;
    };
}

/**
 * Generate test data array of specified size
 */
export const generateTestData = (size: number, withMetadata = true): TestItem[] => {
    const items: TestItem[] = [];
    for (let i = 0; i < size; i++) {
        const item: TestItem = {
            id: `item_${i}`,
            name: `Item ${i}`,
            description: `Description for item ${i}`,
            value: i * 100,
        };
        if (withMetadata) {
            item.tags = ['tag1', 'tag2', 'tag3'];
            item.metadata = {
                createdAt: '2024-01-01',
                updatedAt: '2024-01-02',
            };
        }
        items.push(item);
    }
    return items;
};

/**
 * Fisher-Yates shuffle algorithm
 */
export const shuffle = <T>(arr: T[]): T[] => {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
};

/**
 * Modify items at specified indices
 */
export const modifyItems = (
    items: TestItem[],
    modifyFn: (item: TestItem, index: number) => TestItem,
    indices?: number[]
): TestItem[] => {
    return items.map((item, i) => {
        if (indices === undefined || indices.includes(i)) {
            return modifyFn(item, i);
        }
        return item;
    });
};

/**
 * Modify every nth item
 */
export const modifyEveryNth = (
    items: TestItem[],
    n: number,
    modifyFn: (item: TestItem) => TestItem
): TestItem[] => {
    return items.map((item, i) => (i % n === 0 ? modifyFn(item) : item));
};

/**
 * Standard test sizes
 */
export const SIZES = {
    tiny: 10,
    small: 50,
    medium: 100,
    large: 500,
    xlarge: 1000,
};

/**
 * Run benchmark with warmup and multiple iterations
 */
export const runBenchmark = (
    fn: () => void,
    options: { warmup?: number; iterations?: number } = {}
): { avgMs: number; opsPerSec: number; minMs: number; maxMs: number } => {
    const { warmup = 3, iterations = 10 } = options;

    // Warmup
    for (let i = 0; i < warmup; i++) {
        fn();
    }

    // Measure
    const times: number[] = [];
    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        fn();
        times.push(performance.now() - start);
    }

    const avgMs = times.reduce((a, b) => a + b, 0) / times.length;
    return {
        avgMs,
        opsPerSec: Math.round(1000 / avgMs),
        minMs: Math.min(...times),
        maxMs: Math.max(...times),
    };
};
