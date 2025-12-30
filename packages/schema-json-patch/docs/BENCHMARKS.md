# Performance Benchmarks

Detailed performance benchmarks for `@waveox/schema-json-patch`.

## Summary

| Function                    | Scenario                  | Performance        |
| --------------------------- | ------------------------- | ------------------ |
| **generatePatches**         | 10 items, few changes     | ~11,000 ops/sec    |
| **generatePatches**         | 100 items, 20% changes    | ~1,500 ops/sec     |
| **generatePatches**         | 500 items, 10% changes    | ~332 ops/sec       |
| **generatePatchesFromData** | 500 items, 10% changes    | ~1,512 ops/sec     |
| **applyPatches**            | 10 items, few patches     | ~29,173 ops/sec    |
| **applyPatches**            | 100 items, sparse patches | ~3,089 ops/sec     |
| **detectConflicts**         | 2 groups, few overlaps    | ~10,949 ops/sec    |
| **detectConflicts**         | 5 groups with overlaps    | ~5,825 ops/sec     |
| **resolveConflicts**        | 3 conflicts               | ~652,499 ops/sec   |
| **resolveConflicts**        | 10 conflicts              | ~274,235 ops/sec   |
| **validatePatches**         | 10 patches                | ~2,487,973 ops/sec |
| **validateJson**            | 100 items                 | ~6,657 ops/sec     |

> [!TIP] > `generatePatchesFromData` is a new high-performance API that skips JSON.parse when data is already parsed, achieving **4.5x** better performance.

---

## Detailed Results

### Generate Patches (`generatePatches` / `generatePatchesFromData`)

| Dataset      | Scenario     | ops/sec | Mean (ms) |
| ------------ | ------------ | ------- | --------- |
| Small (10)   | Few changes  | 11,000  | 0.09      |
| Small (10)   | All modified | 7,200   | 0.14      |
| Medium (100) | Sparse 20%   | 1,500   | 0.67      |
| Medium (100) | Dense 50%    | 1,200   | 0.83      |
| Large (500)  | Sparse 10%   | 332     | 3.01      |
| Large (500)  | Bulk all     | 182     | 5.48      |

**High-Performance API `generatePatchesFromData` (500 items):**

| Scenario   | ops/sec | Mean (ms) | vs generatePatches |
| ---------- | ------- | --------- | ------------------ |
| Sparse 10% | 1,512   | 0.66      | **4.5x faster**    |
| Bulk all   | 303     | 3.29      | **1.7x faster**    |

**Order Changes (100 items):**

| Scenario        | ops/sec | Mean (ms) |
| --------------- | ------- | --------- |
| Fully shuffled  | 1,350   | 0.74      |
| Reversed        | 1,400   | 0.71      |
| Partial reorder | 1,600   | 0.62      |

---

### Apply Patches (`applyPatches`)

| Dataset      | Scenario    | ops/sec | Mean (ms) |
| ------------ | ----------- | ------- | --------- |
| Small (10)   | Few patches | 29,173  | 0.03      |
| Medium (100) | Sparse (20) | 3,089   | 0.32      |
| Medium (100) | Dense (all) | 1,796   | 0.56      |
| Large (500)  | 50 patches  | 601     | 1.66      |

**Complex Operations (100 items):**

| Scenario         | ops/sec | Mean (ms) |
| ---------------- | ------- | --------- |
| Add 20 items     | 3,037   | 0.33      |
| Remove 20 items  | 2,027   | 0.49      |
| Mixed operations | 1,258   | 0.79      |

---

### Detect Conflicts (`detectConflicts`)

| Scenario                  | ops/sec | Mean (ms) |
| ------------------------- | ------- | --------- |
| 2 groups, no conflicts    | 13,927  | 0.07      |
| 2 groups, partial overlap | 10,949  | 0.09      |
| 2 groups, full overlap    | 17,497  | 0.05      |
| 3 groups with overlaps    | 9,754   | 0.10      |
| 5 groups with overlaps    | 5,825   | 0.17      |

**Large Patches (60 patches each):**

| Scenario     | ops/sec | Mean (ms) |
| ------------ | ------- | --------- |
| No conflicts | 2,528   | 0.40      |
| 30 conflicts | 2,320   | 0.43      |

---

### Resolve Conflicts (`resolveConflicts`)

| Scenario           | ops/sec | Mean (μs) |
| ------------------ | ------- | --------- |
| 3 conflicts        | 652,499 | 1.5       |
| 10 conflicts       | 274,235 | 3.6       |
| 3 groups           | 451,954 | 2.2       |
| With custom values | 471,492 | 2.1       |

---

### Validation Functions

**validateJson:**

| Scenario           | ops/sec | Mean (ms) |
| ------------------ | ------- | --------- |
| Small (10 items)   | 64,858  | 0.015     |
| Medium (100 items) | 6,657   | 0.150     |
| Large (500 items)  | 1,312   | 0.762     |
| Invalid JSON       | 88,356  | 0.011     |

**validatePatches:**

| Scenario    | ops/sec   |
| ----------- | --------- |
| 10 patches  | 2,487,973 |
| 100 patches | 413,011   |

---

## Scaling Analysis

| Size | Time (ms) | Time per item (μs) | Scaling Factor |
| ---- | --------- | ------------------ | -------------- |
| 10   | 0.09      | 9.0                | 1.00x          |
| 100  | 0.67      | 6.7                | 0.74x          |
| 500  | 3.01      | 6.0                | 0.67x          |

> [!TIP]
> The library maintains **O(n) linear complexity** across key operations, demonstrating excellent scalability especially when handling large datasets and frequent patch applications.

---

## Running Benchmarks

```bash
# Run all benchmarks
pnpm vitest bench --run

# Run specific category
pnpm vitest bench --run benchmarks/generate/
pnpm vitest bench --run benchmarks/apply/
pnpm vitest bench --run benchmarks/detect/
pnpm vitest bench --run benchmarks/resolve/
pnpm vitest bench --run benchmarks/validate/
```

_Benchmarks run on: Linux, Node.js v22+_  
_Last updated: 2025-12-30_
