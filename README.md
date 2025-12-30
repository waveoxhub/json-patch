![JSON-Patch](./banner.svg)

# JSON-Patch

> Schema-driven JSON patching with semantic paths, conflict detection, and multi-user collaboration support.

[![npm version](https://img.shields.io/npm/v/@waveox/schema-json-patch.svg?style=flat)](https://www.npmjs.com/package/@waveox/schema-json-patch)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)

[English](./README.md) | [中文](./README.zh-CN.md)

## ✨ Why Schema-JSON-Patch?

Traditional JSON Patch (RFC 6902) uses array indices like `/items/0/name`. When array order changes, patches break.

**Schema-JSON-Patch** solves this with **semantic paths**:

```diff
- Traditional: /items/0/name     ← Breaks when array order changes
+ Semantic:    /items/id1/name   ← Always targets the right object
```

### Key Differentiators

| Feature                  | Traditional JSON Patch | Schema-JSON-Patch                  |
| ------------------------ | ---------------------- | ---------------------------------- |
| Array element targeting  | Index-based (fragile)  | Primary key-based (stable)         |
| Multi-user collaboration | ❌                     | ✅ Conflict detection & resolution |
| Patch validation         | ❌                     | ✅ Schema-aware validation         |

## ⚡ Performance

Benchmark results for core operations with 100 items:

| Feature                     | Scenario              | Performance (ops/sec) |
| :-------------------------- | :-------------------- | :-------------------- |
| **generatePatches**         | 100 Items, 20% Change | **~1,500**            |
| **generatePatchesFromData** | 500 Items, 10% Change | **~1,500** ⚡         |
| **applyPatches**            | 100 Items, Sparse     | **~3,000**            |
| **detectConflicts**         | 2 Groups, Mixed       | **~10,900**           |
| **resolveConflicts**        | 10 Conflicts          | **~270,000**          |

> [!NOTE]
> For the full benchmark report, please see [BENCHMARKS](./packages/schema-json-patch/docs/BENCHMARKS.md).

## 📝 Demo

Try the interactive demo: **[https://waveoxhub.github.io/json-patch/](https://waveoxhub.github.io/json-patch/)**

## 📦 Installation

```bash
# npm
npm install @waveox/schema-json-patch

# yarn
yarn add @waveox/schema-json-patch

# pnpm
pnpm add @waveox/schema-json-patch
```

## 🚀 Quick Start

```typescript
import { generatePatches, applyPatches, Schema } from '@waveox/schema-json-patch';

// Define your data structure
const schema: Schema = {
    $type: 'object',
    $fields: {
        users: {
            $type: 'array',
            $item: {
                $type: 'object',
                $pk: 'id', // Primary key for semantic paths
                $fields: {
                    id: { $type: 'string' },
                    name: { $type: 'string' },
                },
            },
        },
    },
};

const original = { users: [{ id: 'u1', name: 'Alice' }] };
const modified = { users: [{ id: 'u1', name: 'Alice Updated' }] };

// Generate semantic patches
const patches = generatePatches(schema, JSON.stringify(original), JSON.stringify(modified));
// → [{ op: "replace", path: "users/u1/name", value: "Alice Updated", hash: "..." }]

// Apply patches
const result = applyPatches(JSON.stringify(original), patches, schema);
```

For detailed API documentation, see [@waveox/schema-json-patch](./packages/schema-json-patch/README.md).

## 🤝 Contributing

```bash
git clone https://github.com/waveoxhub/json-patch
cd json-patch
pnpm install
pnpm build
pnpm test
```

## 📄 License

[MIT](LICENSE)
