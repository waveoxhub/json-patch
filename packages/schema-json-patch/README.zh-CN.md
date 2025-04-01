![SchemaJSONPatch](./banner.svg)

# SchemaJSONPatch

[![npm version](https://img.shields.io/npm/v/@waveox/schema-json-patch.svg?style=flat)](https://www.npmjs.com/package/@waveox/schema-json-patch)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Test Coverage](https://img.shields.io/badge/coverage-91%25-brightgreen.svg)](coverage)

专为**固定结构JSON数据**设计的现代化补丁库，类RFC 6902规范，提供补丁生成、冲突处理和补丁应用能力。

## 目录

- [特性](#特性)
- [安装](#安装)
- [使用指南](#使用指南)
    - [定义Schema](#定义schema)
    - [生成补丁](#生成补丁)
    - [应用补丁](#应用补丁)
    - [冲突检测与解决](#冲突检测与解决)
- [路径特性](#路径特性)
- [API参考](#api参考)
- [功能体验](#功能体验)
- [开发与贡献](#开发与贡献)
- [许可证](#许可证)

## 特性

- 🔍 **基于Schema** - 通过Schema定义数据结构，生成语义化路径
- 🔄 **结构化数组处理** - 使用主键($pk)定位数组中的对象，无需关心顺序变化
- 🛠️ **冲突检测与解决** - 自动检测多补丁间的冲突并支持解决冲突
- 🔒 **类型安全** - 完全使用TypeScript开发，提供类型定义

## 安装

```bash
# NPM
npm install @waveox/schema-json-patch

# Yarn
yarn add @waveox/schema-json-patch

# PNPM
pnpm add @waveox/schema-json-patch
```

## 使用指南

### 定义Schema

首先，您需要定义数据的Schema结构：

```typescript
import { Schema } from '@waveox/schema-json-patch';

const schema: Schema = {
    $type: 'object',
    $fields: {
        city: { $type: 'string' },
        items: {
            $type: 'array',
            $item: {
                $type: 'object',
                $pk: 'id', // 主键，用于标识数组中的对象
                $fields: {
                    id: { $type: 'string' },
                    name: { $type: 'string' },
                },
            },
        },
    },
};
```

### 生成补丁

```typescript
import { generatePatches } from '@waveox/schema-json-patch';

const original = {
    city: '北京',
    items: [{ id: '1', name: '项目A' }],
};

const modified = {
    city: '上海',
    items: [{ id: '1', name: '项目A修改版' }],
};

// 生成从original到modified的补丁
const patches = generatePatches(original, modified, schema);

console.log(patches);
// 输出:
// [
//   { op: "replace", path: "city", value: "上海" },
//   { op: "replace", path: "items/id1/name", value: "项目A修改版" }
// ]
```

### 应用补丁

```typescript
import { applyPatches } from '@waveox/schema-json-patch';

// 将补丁应用到原始数据上
const result = applyPatches(original, patches, schema);
// result 现在等于 modified
```

### 冲突检测与解决

处理来自不同来源的补丁之间的冲突：

```typescript
import { detectConflicts, resolveConflicts } from '@waveox/schema-json-patch';

// 两组不同的补丁
const patches1 = [{ op: 'replace', path: 'city', value: '上海' }];
const patches2 = [{ op: 'replace', path: 'city', value: '广州' }];

// 检测冲突
const conflictResult = detectConflicts([patches1, patches2]);

if (conflictResult.hasConflicts) {
    // 解决冲突，选择第二组补丁的方案
    const resolutions = {
        city: 1, // 选择第二个补丁组(索引从0开始)的方案
    };

    // 应用解决方案
    const resolvedPatches = resolveConflicts(conflictResult, resolutions);

    // 应用解决后的补丁
    const result = applyPatches(original, resolvedPatches, schema);
}
```

## 路径特性

SchemaJSONPatch使用语义化路径，对于数组中的对象成员，使用指定的`$pk`作为路径标识符，而不是数组索引。

以修改`name`字段为例：

- 传统JSON Patch路径: `items/0/name`
- SchemaJSONPatch路径: `items/id1/name`

**优势**：即使数组元素顺序发生变化，补丁仍能正确应用到目标对象。

## API参考

### 核心函数

- **generatePatches(original, modified, schema)** - 生成从源状态到目标状态的补丁
- **applyPatches(state, patches, schema)** - 将补丁应用到数据状态
- **detectConflicts(patchGroups)** - 检测多组补丁间的冲突
- **resolveConflicts(conflictResult, resolutions)** - 根据解决方案合并冲突补丁

### 类型定义

- **Schema** - 数据结构定义
- **Patch** - 补丁操作对象
- **PatchConflictResult** - 冲突检测结果
- **ConflictResolutions** - 冲突解决方案

## 开发与贡献

欢迎参与项目开发：

```bash
# 克隆仓库
git clone https://github.com/waveoxhub/json-patch
cd json-patch/schema-json-patch

# 安装依赖
pnpm install

# 构建项目
pnpm build

# 运行测试
pnpm test

# 查看测试覆盖率
pnpm coverage
```

## 功能体验

点击查看功能演示: [https://waveoxhub.github.io/json-patch/](https://waveoxhub.github.io/json-patch/)

## 许可证

[MIT](LICENSE)
