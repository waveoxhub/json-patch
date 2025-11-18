import { escapePathComponent, parseJsonPath } from './pathUtils.js';

type TrieNode = {
    readonly children: Map<string, TrieNode>;
    isTerminal: boolean;
};

/**
 * 简单 JSON Pointer 前缀树用于覆盖判定
 */
export class PointerTrie {
    private readonly root: TrieNode = { children: new Map(), isTerminal: false };

    add(path: string): void {
        const parts = parseJsonPath(path);
        let node = this.root;
        for (const part of parts) {
            const key = escapePathComponent(part);
            let child = node.children.get(key);
            if (!child) {
                child = { children: new Map(), isTerminal: false };
                node.children.set(key, child);
            }
            node = child;
        }
        node.isTerminal = true;
    }

    /**
     * 是否存在某个前缀覆盖 target（即某祖先存在）
     */
    hasAncestorOf(target: string): boolean {
        const parts = parseJsonPath(target);
        let node = this.root;
        for (const part of parts) {
            if (node.isTerminal) return true;
            const key = escapePathComponent(part);
            const child = node.children.get(key);
            if (!child) return false;
            node = child;
        }
        return node.isTerminal; // 相同路径也算覆盖
    }

    /**
     * 是否存在被 target 覆盖的路径（即 target 是某已存在路径的祖先）
     */
    hasDescendantOf(target: string): boolean {
        const parts = parseJsonPath(target);
        let node = this.root;
        for (const part of parts) {
            const key = escapePathComponent(part);
            const child = node.children.get(key);
            if (!child) return false;
            node = child;
        }
        return this.hasAnyTerminal(node);
    }

    private hasAnyTerminal(node: TrieNode): boolean {
        if (node.isTerminal) return true;
        for (const child of node.children.values()) {
            if (this.hasAnyTerminal(child)) return true;
        }
        return false;
    }
}
