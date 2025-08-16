import React, { useState, useCallback, useEffect } from 'react';
import { Typography, Button, Space, Tooltip, Tag } from 'antd';
import { FormatPainterOutlined, MinusSquareOutlined, SaveOutlined } from '@ant-design/icons';
import { JsonEditorProps } from '../types/types';
import { formatJson } from '../utils/jsonUtils';
import Editor from '@monaco-editor/react';

const { Text } = Typography;

/**
 * JSON编辑器组件，支持JSON格式化和错误检测
 */
const JsonEditor: React.FC<
    JsonEditorProps & {
        title?: string;
        style?: React.CSSProperties;
        showSaveIndicator?: boolean;
    }
> = ({ value, onChange, height = '150px', placeholder, readOnly = false, title, style = {}, showSaveIndicator = false }) => {
    const [error, setError] = useState<string | null>(null);
    const [displayValue, setDisplayValue] = useState<string | null>(null);

    // 默认压缩显示
    useEffect(() => {
        if (value && value.trim()) {
            try {
                const parsed = JSON.parse(value);
                const compressed = JSON.stringify(parsed);
                setDisplayValue(compressed);
            } catch {
                // 如果解析失败，使用原始值
                setDisplayValue(null);
            }
        }
    }, [value]);

    const handleEditorChange = useCallback(
        (newValue?: string) => {
            const newText = newValue ?? '';
            onChange(newText);
            setDisplayValue(null);

            if (newText.trim()) {
                try {
                    JSON.parse(newText);
                    setError(null);
                } catch {
                    setError('JSON格式错误');
                }
            } else {
                setError(null);
            }
        },
        [onChange]
    );

    const handleFormat = useCallback(() => {
        try {
            const formatted = formatJson(value);
            if (readOnly) {
                setDisplayValue(formatted);
            } else {
                onChange(formatted);
                setDisplayValue(null);
            }
        } catch {
            // 如果解析失败，保持原状
        }
    }, [value, onChange, readOnly]);

    const handleCompress = useCallback(() => {
        if (!value.trim()) return;

        try {
            const parsed = JSON.parse(value);
            const compressed = JSON.stringify(parsed);
            if (readOnly) {
                setDisplayValue(compressed);
            } else {
                onChange(compressed);
                setDisplayValue(null);
            }
        } catch {
            // 如果解析失败，保持原状
        }
    }, [value, onChange, readOnly]);

    // 重置展示值回原始值
    const handleResetDisplay = useCallback(() => {
        setDisplayValue(null);
    }, []);

    // 实际显示的值
    const actualValue = displayValue !== null ? displayValue : value;

    return (
        <div
            style={{
                ...style,
                borderRadius: '6px',
                overflow: 'hidden',
                border: '1px solid #d9d9d9',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderBottom: '1px solid #d9d9d9',
                    backgroundColor: '#fafafa',
                }}
            >
                <div className="editor-header-left">
                    {title && (
                        <Text strong style={{ fontSize: '14px' }}>
                            {title}
                        </Text>
                    )}
                    {showSaveIndicator && value.trim() && (
                        <Tag color="green" icon={<SaveOutlined />}>
                            自动保存
                        </Tag>
                    )}
                </div>

                <Space>
                    <Tooltip title="格式化JSON">
                        <Button
                            icon={<FormatPainterOutlined />}
                            size="small"
                            onClick={handleFormat}
                            type="text"
                        />
                    </Tooltip>
                    <Tooltip title="压缩为单行">
                        <Button
                            icon={<MinusSquareOutlined />}
                            size="small"
                            onClick={handleCompress}
                            type="text"
                        />
                    </Tooltip>
                    {readOnly && displayValue !== null && (
                        <Tooltip title="还原显示">
                            <Button size="small" onClick={handleResetDisplay} type="text">
                                还原
                            </Button>
                        </Tooltip>
                    )}
                </Space>
            </div>

            {error && (
                <div style={{ padding: '8px 12px', backgroundColor: '#fff2f0' }}>
                    <Text type="danger">{error}</Text>
                </div>
            )}

            <div style={{ width: '100%', height, position: 'relative' }}>
                <Editor
                    language="json"
                    value={actualValue}
                    onChange={(value) => handleEditorChange(value)}
                    height={height}
                    options={{
                        readOnly,
                        minimap: { enabled: false },
                        wordWrap: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        formatOnPaste: true,
                        formatOnType: true,
                        tabSize: 2,
                    }}
                />
                {/* 占位符逻辑：只在为空且非只读时显示 */}
                {!actualValue && !readOnly && placeholder && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 8,
                            left: 12,
                            right: 12,
                            color: '#999',
                            pointerEvents: 'none',
                        }}
                    >
                        {placeholder}
                    </div>
                )}
            </div>
        </div>
    );
};

export default JsonEditor;
