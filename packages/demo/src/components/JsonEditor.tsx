import React, { useState, useCallback, useEffect } from 'react';
import { Copy, Check, Maximize2, Minimize2 } from 'lucide-react';
import Editor from '@monaco-editor/react';

interface JsonEditorProps {
    value: string;
    onChange: (value: string) => void;
    height?: string;
    placeholder?: string;
    readOnly?: boolean;
}

/**
 * JSON 编辑器组件（基于 Monaco Editor）
 * 支持点击展开/收起
 */
const JsonEditor: React.FC<JsonEditorProps> = ({
    value,
    onChange,
    height = '200px',
    placeholder = '',
    readOnly = false,
}) => {
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [theme, setTheme] = useState<'vs' | 'vs-dark'>('vs');
    const [expanded, setExpanded] = useState(false);

    // 计算实际高度
    const actualHeight = expanded ? '400px' : height;

    useEffect(() => {
        const updateTheme = () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            setTheme(isDark ? 'vs-dark' : 'vs');
        };
        updateTheme();
        const observer = new MutationObserver(updateTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    const handleEditorChange = useCallback((val: string | undefined) => {
        const newValue = val || '';
        onChange(newValue);
        if (newValue.trim()) {
            try {
                JSON.parse(newValue);
                setError(null);
            } catch (e) {
                setError(e instanceof Error ? e.message : '无效 JSON');
            }
        } else {
            setError(null);
        }
    }, [onChange]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {}
    };

    return (
        <div className={`editor-wrapper ${error ? 'error' : ''}`} style={{ position: 'relative' }}>
            {/* 展开/收起按钮 */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="editor-expand-btn"
                title={expanded ? '收起' : '展开'}
            >
                {expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>

            <div style={{ height: actualHeight, transition: 'height 0.2s ease' }}>
                <Editor
                    language="json"
                    value={value}
                    onChange={handleEditorChange}
                    height="100%"
                    theme={theme}
                    options={{
                        readOnly,
                        minimap: { enabled: false },
                        wordWrap: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        formatOnPaste: true,
                        formatOnType: true,
                        tabSize: 2,
                        fontSize: 13,
                        lineNumbers: 'off',
                        folding: false,
                        renderLineHighlight: 'none',
                        overviewRulerBorder: false,
                        hideCursorInOverviewRuler: true,
                        padding: { top: 8, bottom: 8 },
                        scrollbar: {
                            verticalScrollbarSize: 8,
                            horizontalScrollbarSize: 8,
                        },
                    }}
                />
            </div>

            {/* 占位符 */}
            {!value && !readOnly && placeholder && (
                <div
                    style={{
                        position: 'absolute',
                        top: 16,
                        left: 14,
                        color: 'var(--color-text-muted)',
                        pointerEvents: 'none',
                        fontSize: 13,
                    }}
                >
                    {placeholder}
                </div>
            )}

            {/* 复制按钮 (只读模式) */}
            {readOnly && value && (
                <button
                    onClick={handleCopy}
                    style={{
                        position: 'absolute',
                        top: 8,
                        right: 32,
                        background: 'var(--color-bg-elevated)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 4,
                        padding: '4px 8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        color: 'var(--color-text-muted)',
                        fontSize: 11,
                    }}
                >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? '已复制' : '复制'}
                </button>
            )}
        </div>
    );
};

export default JsonEditor;
