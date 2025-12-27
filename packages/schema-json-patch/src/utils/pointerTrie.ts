import { escapePathComponent, parseJsonPath } from './pathUtils.js';

/**
 * Trie 节点结构
 */
type TrieNode = {
    /** 子节点映射 */
    readonly children: Map<string, TrieNode>;
    /** 是否为终端节点（表示完整路径） */
    isTerminal: boolean;
};

/**
 * JSON Pointer 前缀树
 * 用于高效判断路径之间的覆盖关系（祖先/后代关系）
 */
export class PointerTrie {
    private readonly root: TrieNode = { children: new Map(), isTerminal: false };

    /**
     * 添加路径到前缀树
     * @param path - JSON Pointer 路径
     */
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
     * 检查是否存在目标路径的祖先
     * @param target - 目标路径
     * @returns 是否存在覆盖目标的祖先路径
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
     * 检查是否存在目标路径的后代
     * @param target - 目标路径
     * @returns 是否存在被目标覆盖的后代路径
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

    /**
     * 递归检查节点及其子树中是否存在终端节点
     */
    private hasAnyTerminal(node: TrieNode): boolean {
        if (node.isTerminal) return true;
        for (const child of node.children.values()) {
            if (this.hasAnyTerminal(child)) return true;
        }
        return false;
    }
}
