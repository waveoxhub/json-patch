# Performance Benchmarks

Detailed performance benchmarks for `@waveox/schema-json-patch`.

## Summary

| Function             | Scenario                  | Performance        |
| -------------------- | ------------------------- | ------------------ |
| **generatePatches**  | 10 items, few changes     | ~10,750 ops/sec    |
| **generatePatches**  | 100 items, 20% changes    | ~1,430 ops/sec     |
| **generatePatches**  | 500 items, 10% changes    | ~310 ops/sec       |
| **applyPatches**     | 10 items, few patches     | ~12,088 ops/sec    |
| **applyPatches**     | 100 items, sparse patches | ~326 ops/sec       |
| **detectConflicts**  | 2 groups, few overlaps    | ~13,672 ops/sec    |
| **detectConflicts**  | 5 groups with overlaps    | ~6,088 ops/sec     |
| **resolveConflicts** | 3 conflicts               | ~658,760 ops/sec   |
| **resolveConflicts** | 10 conflicts              | ~274,781 ops/sec   |
| **validatePatches**  | 10 patches                | ~2,601,370 ops/sec |
| **validateJson**     | 100 items                 | ~6,947 ops/sec     |

---

## Detailed Results

### Generate Patches (`generatePatches`)

| Dataset      | Scenario     | ops/sec | Mean (ms) |
| ------------ | ------------ | ------- | --------- |
| Small (10)   | Few changes  | 10,750  | 0.09      |
| Small (10)   | All modified | 5,961   | 0.17      |
| Medium (100) | Sparse 20%   | 1,430   | 0.70      |
| Medium (100) | Dense 50%    | 1,061   | 0.94      |
| Large (500)  | Sparse 10%   | 310     | 3.20      |
| Large (500)  | Bulk all     | 182     | 5.50      |

**Order Changes (100 items):**

| Scenario        | ops/sec | Mean (ms) |
| --------------- | ------- | --------- |
| Fully shuffled  | 1,253   | 0.80      |
| Reversed        | 1,302   | 0.77      |
| Partial reorder | 1,556   | 0.64      |

---

### Apply Patches (`applyPatches`)

| Dataset      | Scenario    | ops/sec | Mean (ms) |
| ------------ | ----------- | ------- | --------- |
| Small (10)   | Few patches | 12,088  | 0.08      |
| Medium (100) | Sparse (20) | 326     | 3.07      |
| Medium (100) | Dense (all) | 34      | 29.70     |
| Large (500)  | 50 patches  | 25      | 39.70     |

**Complex Operations (100 items):**

| Scenario         | ops/sec | Mean (ms) |
| ---------------- | ------- | --------- |
| Add 20 items     | 303     | 3.30      |
| Remove 20 items  | 327     | 3.06      |
| Mixed operations | 98      | 10.20     |

---

### Detect Conflicts (`detectConflicts`)

| Scenario                  | ops/sec | Mean (ms) |
| ------------------------- | ------- | --------- |
| 2 groups, no conflicts    | 13,672  | 0.07      |
| 2 groups, partial overlap | 14,091  | 0.07      |
| 2 groups, full overlap    | 17,327  | 0.06      |
| 3 groups with overlaps    | 8,163   | 0.12      |
| 5 groups with overlaps    | 6,088   | 0.16      |

**Large Patches (60 patches each):**

| Scenario     | ops/sec | Mean (ms) |
| ------------ | ------- | --------- |
| No conflicts | 2,508   | 0.40      |
| 30 conflicts | 2,577   | 0.39      |

---

### Resolve Conflicts (`resolveConflicts`)

| Scenario           | ops/sec | Mean (μs) |
| ------------------ | ------- | --------- |
| 3 conflicts        | 658,760 | 1.5       |
| 10 conflicts       | 274,781 | 3.6       |
| 3 groups           | 464,680 | 2.2       |
| With custom values | 457,968 | 2.2       |

---

### Validation Functions

**validateJson:**

| Scenario           | ops/sec | Mean (ms) |
| ------------------ | ------- | --------- |
| Small (10 items)   | 65,744  | 0.015     |
| Medium (100 items) | 6,947   | 0.144     |
| Large (500 items)  | 1,366   | 0.732     |
| Invalid JSON       | 89,915  | 0.011     |

**validatePatches:**

| Scenario    | ops/sec   |
| ----------- | --------- |
| 10 patches  | 2,601,370 |
| 100 patches | 372,355   |

---

## Scaling Analysis

| Size | Time (ms) | Time per item (μs) | Scaling Factor |
| ---- | --------- | ------------------ | -------------- |
| 10   | 0.09      | 9.4                | 1.00x          |
| 100  | 0.70      | 7.0                | 0.74x          |
| 500  | 3.20      | 6.4                | 0.68x          |

> [!TIP]
> The scaling factor decreases as data size grows, indicating the per-item processing time actually **reduces** with larger datasets, demonstrating **O(n) linear complexity**.

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
