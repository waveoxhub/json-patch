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
    - [验证功能](#验证功能)
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
- ✅ **验证功能** - 验证JSON数据、补丁和基于Schema的补丁应用

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
const patches = generatePatches(schema, JSON.stringify(original), JSON.stringify(modified));

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
const result = applyPatches(JSON.stringify(original), patches, schema);
```

### 冲突检测与解决

处理来自不同来源的补丁之间的冲突：

```typescript
import { detectConflicts, resolveConflicts } from '@waveox/schema-json-patch';

// 两组不同的补丁
const patches1 = [{ op: 'replace', path: 'city', value: '上海' }];
const patches2 = [{ op: 'replace', path: 'city', value: '广州' }];

// 检测冲突
const conflicts = detectConflicts([patches1, patches2]);

if (conflicts.length > 0) {
    // 解决冲突，选择要应用的补丁
    const resolutions = conflicts.map(conflict => ({
        path: conflict.path,
        selectedHash: conflict.options[1], // 选择第二个选项
    }));

    // 自定义解决方案（可选）
    const customResolutions = [];

    // 应用解决方案
    const resolvedPatches = resolveConflicts(
        patches1.concat(patches2),
        conflicts,
        resolutions,
        customResolutions // 可选参数
    );

    // 应用解决后的补丁
    const result = applyPatches(JSON.stringify(original), resolvedPatches, schema);
}
```

### 验证功能

验证JSON数据、补丁和冲突解决方案：

```typescript
import { validateJson, validatePatches, validatePatchApplication } from '@waveox/schema-json-patch';

// 验证JSON字符串
const jsonResult = validateJson(jsonString);
if (!jsonResult.isValid) {
    console.error('JSON验证错误:', jsonResult.errors);
}

// 验证补丁
const patchesResult = validatePatches(patches);
if (!patchesResult.isValid) {
    console.error('补丁验证错误:', patchesResult.errors);
}

// 验证补丁应用是否符合Schema
const applicationResult = validatePatchApplication(jsonString, patches, schema);
if (!applicationResult.isValid) {
    console.error('补丁应用错误:', applicationResult.errors);
}
```

## 路径特性

SchemaJSONPatch使用语义化路径，对于数组中的对象成员，使用指定的`$pk`作为路径标识符，而不是数组索引。

以修改`name`字段为例：

- 传统JSON Patch路径: `/items/0/name`
- SchemaJSONPatch路径: `/items/id1/name`

**优势**：即使数组元素顺序发生变化，补丁仍能正确应用到目标对象。

## API参考

### 核心函数

| 函数                                                                   | 描述                         |
| ---------------------------------------------------------------------- | ---------------------------- |
| `generatePatches(schema, sourceJson, targetJson)`                      | 生成从源状态到目标状态的补丁 |
| `applyPatches(sourceJson, patches, schema)`                            | 将补丁应用到数据状态         |
| `detectConflicts(patchGroups)`                                         | 检测多组补丁间的冲突         |
| `resolveConflicts(patches, conflicts, resolutions, customResolutions)` | 根据解决方案合并冲突补丁     |

### 验证函数

| 函数                                                                            | 描述                               |
| ------------------------------------------------------------------------------- | ---------------------------------- |
| `validateJson(jsonString)`                                                      | 验证JSON字符串是否有效             |
| `validatePatches(patches)`                                                      | 验证补丁数组是否有效               |
| `validatePatchGroups(patchGroups)`                                              | 验证补丁组数组是否有效             |
| `validateResolutions(conflicts, resolutions, customResolutions)`                | 验证解决方案是否有效               |
| `validateResolvedConflicts(patches, conflicts, resolutions, customResolutions)` | 验证应用解决方案后是否仍有冲突     |
| `validatePatchApplication(jsonString, patches, schema)`                         | 验证JSON补丁操作是否可以应用于JSON |

### 类型定义

| 类型                  | 描述                   |
| --------------------- | ---------------------- |
| `Schema`              | 数据结构定义           |
| `Patch`               | 补丁操作对象           |
| `UnresolvedConflicts` | 未解决的冲突哈希值数组 |
| `ConflictResolutions` | 冲突解决方案           |
| `ValidationResult`    | 验证操作结果           |

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
