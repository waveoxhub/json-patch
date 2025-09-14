![SchemaJSONPatch](./banner.svg)

# Schema-JSON-Patch

[![npm version](https://img.shields.io/npm/v/@waveox/schema-json-patch.svg?style=flat)](https://www.npmjs.com/package/@waveox/schema-json-patch)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Test Coverage](https://img.shields.io/badge/coverage-91%25-brightgreen.svg)](coverage)

[中文文档](./README.zh-CN.md)

A modern patch library designed for **fixed-structure JSON data**, like RFC 6902, providing patch generation, conflict handling, and patch application capabilities.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage Guide](#usage-guide)
    - [Define Schema](#define-schema)
    - [Generate Patches](#generate-patches)
    - [Apply Patches](#apply-patches)
    - [Conflict Detection and Resolution](#conflict-detection-and-resolution)
    - [Validation](#validation)
- [Path Features](#path-features)
- [API Reference](#api-reference)
- [Demo](#demo)
- [Development & Contribution](#development--contribution)
- [License](#license)

## Features

- 🔍 **Schema-Based** - Define data structure through schema, generate semantic paths
- 🔄 **Structured Array Handling** - Use primary key ($pk) to locate objects in arrays, no need to worry about order changes
- 🛠️ **Conflict Detection & Resolution** - Automatically detect conflicts between multiple patches and support conflict resolution
- 🔒 **Type Safety** - Fully developed using TypeScript, providing type definitions
- ✅ **Validation** - Validate JSON data, patches, and patch application against schema

## Installation

```bash
# NPM
npm install @waveox/schema-json-patch

# Yarn
yarn add @waveox/schema-json-patch

# PNPM
pnpm add @waveox/schema-json-patch
```

## Usage Guide

### Define Schema

First, you need to define the schema structure of your data:

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
                $pk: 'id', // Primary key, used to identify objects in the array
                $fields: {
                    id: { $type: 'string' },
                    name: { $type: 'string' },
                },
            },
        },
    },
};
```

### Generate Patches

```typescript
import { generatePatches } from '@waveox/schema-json-patch';

const original = {
    city: 'Beijing',
    items: [{ id: '1', name: 'Project A' }],
};

const modified = {
    city: 'Shanghai',
    items: [{ id: '1', name: 'Project A Modified' }],
};

// Generate patches from original to modified
const patches = generatePatches(schema, JSON.stringify(original), JSON.stringify(modified));

console.log(patches);
// Output:
// [
//   { op: "replace", path: "city", value: "Shanghai" },
//   { op: "replace", path: "items/id1/name", value: "Project A Modified" }
// ]
```

### Apply Patches

```typescript
import { applyPatches } from '@waveox/schema-json-patch';

// Apply patches to the original data
const result = applyPatches(JSON.stringify(original), patches, schema);
// result is now a JSON string, can be converted to an object with JSON.parse(result)
```

### Conflict Detection and Resolution

Handle conflicts between patches from different sources:

```typescript
import { detectConflicts, resolveConflicts } from '@waveox/schema-json-patch';

// Two different sets of patches
const patches1 = [{ op: 'replace', path: 'city', value: 'Shanghai' }];
const patches2 = [{ op: 'replace', path: 'city', value: 'Guangzhou' }];

// Detect conflicts
const conflicts = detectConflicts([patches1, patches2]);

if (conflicts.length > 0) {
    // Resolve conflicts by choosing which patch to apply
    const resolutions = conflicts.map(conflict => ({
        path: conflict.path,
        selectedHash: conflict.options[1], // Choose the second option
    }));

    // Optional custom resolutions
    const customResolutions = [];

    // Apply resolution
    const resolvedPatches = resolveConflicts(
        [patches1, patches2],
        conflicts,
        resolutions,
        customResolutions // Optional parameter
    );

    // Apply the resolved patches
    const result = applyPatches(JSON.stringify(original), resolvedPatches, schema);
}
```

### Validation

Validate JSON data, patches, and conflict resolutions:

```typescript
import { validateJson, validatePatches, validatePatchApplication } from '@waveox/schema-json-patch';

// Validate JSON string
const jsonResult = validateJson(jsonString);
if (!jsonResult.isValid) {
    console.error('JSON validation errors:', jsonResult.errors);
}

// Validate patches
const patchesResult = validatePatches(patches);
if (!patchesResult.isValid) {
    console.error('Patch validation errors:', patchesResult.errors);
}

// Validate patch application against schema
const applicationResult = validatePatchApplication(jsonString, patches, schema);
if (!applicationResult.isValid) {
    console.error('Patch application errors:', applicationResult.errors);
}
```

## Path Features

SchemaJSONPatch uses semantic paths. For object members in arrays, it uses the specified `$pk` as the path identifier instead of array indices.

For example, to modify the `name` field:

- Traditional JSON Patch path: `/items/0/name`
- SchemaJSONPatch path: `/items/id1/name`

**Advantage**: Even if the order of array elements changes, the patch can still be applied to the target object correctly.

## API Reference

### Core Functions

| Function                                                                   | Description                                            |
| -------------------------------------------------------------------------- | ------------------------------------------------------ |
| `generatePatches(schema, sourceJson, targetJson)`                          | Generate patches from source state to target state     |
| `applyPatches(sourceJson, patches, schema)`                                | Apply patches to data state                            |
| `detectConflicts(patchGroups)`                                             | Detect conflicts between multiple sets of patches      |
| `resolveConflicts(patchGroups, conflicts, resolutions, customResolutions)` | Merge conflicting patches according to resolution plan |

### Validation Functions

| Function                                                                        | Description                                                      |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `validateJson(jsonString)`                                                      | Validate if a JSON string is valid                               |
| `validatePatches(patches)`                                                      | Validate if a patch array is valid                               |
| `validatePatchGroups(patchGroups)`                                              | Validate if a patch group array is valid                         |
| `validateResolutions(conflicts, resolutions, customResolutions)`                | Validate if resolutions are valid                                |
| `validateResolvedConflicts(patches, conflicts, resolutions, customResolutions)` | Validate if there are still conflicts after applying resolutions |
| `validatePatchApplication(jsonString, patches, schema)`                         | Validate if JSON patch operations can be applied to a JSON       |

### Type Definitions

| Type                  | Description                              |
| --------------------- | ---------------------------------------- |
| `Schema`              | Data structure definition                |
| `Patch`               | Patch operation object                   |
| `UnresolvedConflicts` | Array of unresolved conflict hash values |
| `ConflictResolutions` | Conflict resolution plan                 |
| `ValidationResult`    | Result of validation operations          |

## Development & Contribution

You're welcome to participate in project development:

```bash
# Clone repository
git clone https://github.com/waveoxhub/json-patch
cd json-patch/schema-json-patch

# Install dependencies
pnpm install

# Build project
pnpm build

# Run tests
pnpm test

# View test coverage
pnpm coverage
```

## Demo

Try the live demo: [https://waveoxhub.github.io/json-patch/](https://waveoxhub.github.io/json-patch/)

## License

[MIT](LICENSE)
