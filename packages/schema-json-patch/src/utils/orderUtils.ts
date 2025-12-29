/**
 * 计算最长递增子序列的索引
 * 使用二分查找优化，时间复杂度 O(n log n)
 *
 * @param arr - 输入数组
 * @returns 最长递增子序列中元素的索引数组
 */
export const longestIncreasingSubsequence = (arr: number[]): number[] => {
    if (arr.length === 0) return [];

    const n = arr.length;
    // tails[i] 存储长度为 i+1 的递增子序列的最小末尾元素的索引
    const tails: number[] = [];
    // parent[i] 存储在最长递增子序列中，索引 i 之前的元素索引
    const parent: number[] = new Array(n).fill(-1);

    // 二分查找：找到第一个 >= target 的位置
    const binarySearch = (target: number): number => {
        let left = 0;
        let right = tails.length;
        while (left < right) {
            const mid = (left + right) >>> 1;
            if (arr[tails[mid]] < target) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }
        return left;
    };

    for (let i = 0; i < n; i++) {
        const pos = binarySearch(arr[i]);
        if (pos > 0) {
            parent[i] = tails[pos - 1];
        }
        if (pos === tails.length) {
            tails.push(i);
        } else {
            tails[pos] = i;
        }
    }

    // 回溯找到所有 LIS 元素的索引
    const lisIndices: number[] = [];
    let current = tails[tails.length - 1];
    while (current !== -1) {
        lisIndices.unshift(current);
        current = parent[current];
    }

    return lisIndices;
};

/**
 * 检测数组元素顺序变化，返回需要移动的元素
 *
 * @param sourceOrder - 源数组中元素的主键顺序
 * @param targetOrder - 目标数组中元素的主键顺序
 * @returns 需要移动的元素主键数组
 */
export const detectOrderChanges = (sourceOrder: string[], targetOrder: string[]): string[] => {
    // 只考虑两边都存在的元素
    const sourceSet = new Set(sourceOrder);
    const common = targetOrder.filter(id => sourceSet.has(id));

    if (common.length <= 1) return [];

    // 计算公共元素在源数组中的相对位置
    const sourcePositions = common.map(id => sourceOrder.indexOf(id));

    // 使用 LIS 找到不需要移动的元素索引
    const lisIndices = longestIncreasingSubsequence(sourcePositions);
    const stableIndices = new Set(lisIndices);

    // 需要移动的元素（不在 LIS 中的元素）
    return common.filter((_, index) => !stableIndices.has(index));
};
