# Performance Benchmarks

Detailed performance benchmarks for `@waveox/schema-json-patch`.

## Summary

| Function             | Scenario                  | Performance        |
| -------------------- | ------------------------- | ------------------ |
| **generatePatches**  | 10 items, few changes     | ~15,005 ops/sec    |
| **generatePatches**  | 100 items, 20% changes    | ~1,617 ops/sec     |
| **generatePatches**  | 500 items, 10% changes    | ~314 ops/sec       |
| **applyPatches**     | 10 items, few patches     | ~29,173 ops/sec    |
| **applyPatches**     | 100 items, sparse patches | ~3,089 ops/sec     |
| **detectConflicts**  | 2 groups, few overlaps    | ~10,949 ops/sec    |
| **detectConflicts**  | 5 groups with overlaps    | ~5,825 ops/sec     |
| **resolveConflicts** | 3 conflicts               | ~652,499 ops/sec   |
| **resolveConflicts** | 10 conflicts              | ~274,235 ops/sec   |
| **validatePatches**  | 10 patches                | ~2,487,973 ops/sec |
| **validateJson**     | 100 items                 | ~6,657 ops/sec     |

---

## Detailed Results

### Generate Patches (`generatePatches`)

| Dataset      | Scenario     | ops/sec | Mean (ms) |
| ------------ | ------------ | ------- | --------- |
| Small (10)   | Few changes  | 15,005  | 0.06      |
| Small (10)   | All modified | 7,654   | 0.13      |
| Medium (100) | Sparse 20%   | 1,617   | 0.61      |
| Medium (100) | Dense 50%    | 1,154   | 0.86      |
| Large (500)  | Sparse 10%   | 314     | 3.18      |
| Large (500)  | Bulk all     | 185     | 5.40      |

**Order Changes (100 items):**

| Scenario        | ops/sec | Mean (ms) |
| --------------- | ------- | --------- |
| Fully shuffled  | 1,288   | 0.77      |
| Reversed        | 1,364   | 0.73      |
| Partial reorder | 1,618   | 0.61      |

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
| 10   | 0.06      | 6.0                | 1.00x          |
| 100  | 0.61      | 6.1                | 1.01x          |
| 500  | 3.18      | 6.4                | 1.06x          |

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
_Last updated: 2025-12-29_
