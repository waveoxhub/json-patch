import React, { useState, useCallback } from 'react';
import { Typography, Tag, Button, message } from 'antd';
import { SaveOutlined, CopyOutlined } from '@ant-design/icons';
import { JsonEditorProps } from '../types/types';
import { escapeJsonString } from '../utils/jsonUtils';
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
> = ({
    value,
    onChange,
    height = '150px',
    placeholder,
    readOnly = false,
    title,
    style = {},
    showSaveIndicator = false,
}) => {
    const [error, setError] = useState<string | null>(null);

    const handleEditorChange = useCallback(
        (newValue?: string) => {
            const newText = newValue ?? '';
            onChange(newText);
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

    // 复制内容到剪贴板
    const handleCopy = async () => {
        try {
            if (!value.trim()) {
                message.warning('没有内容可复制');
                return;
            }

            // 使用工具函数进行JSON字符串转义
            const escapedValue = escapeJsonString(value);

            await navigator.clipboard.writeText(escapedValue);
            message.success('内容已复制到剪贴板（已转义）');
        } catch (error) {
            message.error('复制失败：JSON格式错误');
        }
    };

    // 使用 Monaco 内置格式化能力，无需额外按钮

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
                {readOnly && value.trim() && (
                    <Button
                        type="text"
                        icon={<CopyOutlined />}
                        onClick={handleCopy}
                        size="small"
                        title="复制内容"
                    >
                        复制
                    </Button>
                )}
            </div>

            {error && (
                <div style={{ padding: '8px 12px', backgroundColor: '#fff2f0' }}>
                    <Text type="danger">{error}</Text>
                </div>
            )}

            <div style={{ width: '100%', height, position: 'relative' }}>
                <Editor
                    language="json"
                    value={value}
                    onChange={value => handleEditorChange(value)}
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
                {!value && !readOnly && placeholder && (
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
