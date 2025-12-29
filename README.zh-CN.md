![JSON-Patch](./banner.svg)

# JSON-Patch

> 基于 Schema 驱动的 JSON 补丁库，支持语义路径、冲突检测与多人协作。

[![npm version](https://img.shields.io/npm/v/@waveox/schema-json-patch.svg?style=flat)](https://www.npmjs.com/package/@waveox/schema-json-patch)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)

[English](./README.md) | [中文](./README.zh-CN.md)

## ✨ 为什么选择 Schema-JSON-Patch？

传统 JSON Patch (RFC 6902) 使用数组索引如 `/items/0/name`。当数组顺序改变时，补丁就会失效。

**Schema-JSON-Patch** 通过 **语义路径** 解决了这个问题：

```diff
- 传统方式: /items/0/name     ← 数组顺序变化时失效
+ 语义路径: /items/id1/name   ← 始终定位正确对象
```

### 核心差异

| 特性         | 传统 JSON Patch | Schema-JSON-Patch   |
| ------------ | --------------- | ------------------- |
| 数组元素定位 | 基于索引 (脆弱) | 基于主键 (稳定)     |
| 多人协作     | ❌              | ✅ 冲突检测与解决   |
| 补丁验证     | ❌              | ✅ 基于 Schema 验证 |

## 📝 在线演示

试用交互式演示：**[https://waveoxhub.github.io/json-patch/](https://waveoxhub.github.io/json-patch/)**

## 📦 安装

```bash
# npm
npm install @waveox/schema-json-patch

# yarn
yarn add @waveox/schema-json-patch

# pnpm
pnpm add @waveox/schema-json-patch
```

## 🚀 快速开始

```typescript
import { generatePatches, applyPatches, Schema } from '@waveox/schema-json-patch';

// 定义数据结构
const schema: Schema = {
    $type: 'object',
    $fields: {
        users: {
            $type: 'array',
            $item: {
                $type: 'object',
                $pk: 'id', // 主键，用于语义路径
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

// 生成语义化补丁
const patches = generatePatches(schema, JSON.stringify(original), JSON.stringify(modified));
// → [{ op: "replace", path: "users/u1/name", value: "Alice Updated", hash: "..." }]

// 应用补丁
const result = applyPatches(JSON.stringify(original), patches, schema);
```

详细 API 文档请查看 [@waveox/schema-json-patch](./packages/schema-json-patch/README.zh-CN.md)。

## 🤝 参与贡献

```bash
git clone https://github.com/waveoxhub/json-patch
cd json-patch
pnpm install
pnpm build
pnpm test
```

## 📄 许可证

[MIT](LICENSE)
