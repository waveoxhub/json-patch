import { Patch } from '../types/patch.js';
import { normalizePointer } from './pathUtils.js';
import { PointerTrie } from './pointerTrie.js';

export type Coverage = {
    readonly writeSet: ReadonlySet<string>;
    readonly ancestorWrite: ReadonlySet<string>;
    readonly trie: PointerTrie;
};

/**
 * 计算补丁组 coverage，仅处理写集合（read 可按需扩展）
 */
export const computeCoverage = (patches: ReadonlyArray<Patch>): Coverage => {
    const write = new Set<string>();
    const anc = new Set<string>();
    const trie = new PointerTrie();

    for (const p of patches) {
        const path = normalizePointer(p.path);
        if (path === undefined) continue;
        write.add(path);
        trie.add(path);
        // 收集祖先
        const segments = path === '' ? [] : path.slice(1).split('/');
        let acc: string[] = [];
        for (let i = 0; i < segments.length - 1; i++) {
            acc.push(segments[i]);
            anc.add('/' + acc.join('/'));
        }
    }

    return { writeSet: write, ancestorWrite: anc, trie };
};

/**
 * 组间是否存在覆盖关系，快速候选过滤
 */
export const hasWriteOverlap = (a: Coverage, b: Coverage): boolean => {
    // 任一路径与对方祖先/后代覆盖均算候选
    for (const p of a.writeSet) {
        if (b.trie.hasAncestorOf(p) || b.trie.hasDescendantOf(p)) return true;
    }
    for (const p of b.writeSet) {
        if (a.trie.hasAncestorOf(p) || a.trie.hasDescendantOf(p)) return true;
    }
    return false;
};
