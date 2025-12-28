import React, { useState, useCallback, useEffect } from 'react';
import { Copy, Check, Maximize2, Minimize2 } from 'lucide-react';
import Editor from '@monaco-editor/react';

interface JsonEditorProps {
    value: string;
    onChange: (value: string) => void;
    height?: string;
    placeholder?: string;
    readOnly?: boolean;
    /** 编辑器的唯一标识路径，用于关联 JSON Schema（例如 'schema.json'）*/
    modelPath?: string;
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
    modelPath,
}) => {
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [theme, setTheme] = useState<'vs' | 'vs-dark'>('vs');
    const [expanded, setExpanded] = useState(false);

    // 计算实际高度
    const actualHeight = expanded ? '400px' : height;

    useEffect(() => {
        const updateTheme = () => {
            const isDark = document.documentElement.classList.contains('dark');
            setTheme(isDark ? 'vs-dark' : 'vs');
        };
        updateTheme();
        const observer = new MutationObserver(updateTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
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
        <div className={`relative rounded-md overflow-hidden border ${error ? 'border-red-500 shadow-[0_0_0_2px_rgba(220,38,38,0.1)]' : 'border-neutral-200 dark:border-neutral-700'}`}>
            {/* 展开/收起按钮 */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="absolute top-1.5 right-1.5 z-10 p-1 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-100 opacity-0 hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
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
                    path={modelPath}
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
                <div className="absolute top-4 left-3.5 text-neutral-500 dark:text-neutral-400 pointer-events-none text-sm">
                    {placeholder}
                </div>
            )}

            {/* 复制按钮 (只读模式) */}
            {readOnly && value && (
                <button
                    onClick={handleCopy}
                    className="absolute top-2 right-8 px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? '已复制' : '复制'}
                </button>
            )}
        </div>
    );
};

export default JsonEditor;
