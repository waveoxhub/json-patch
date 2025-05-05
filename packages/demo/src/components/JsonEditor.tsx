import React, { useState, useCallback } from 'react';
import { Input, Typography, Button, Space, Tooltip } from 'antd';
import { FormatPainterOutlined, MinusSquareOutlined } from '@ant-design/icons';
import { JsonEditorProps } from '../types/types';
import { formatJson } from '../utils/jsonUtils';

const { TextArea } = Input;
const { Text } = Typography;

/**
 * JSON编辑器组件，支持JSON格式化和错误检测
 */
const JsonEditor: React.FC<JsonEditorProps & {
    title?: string;
    style?: React.CSSProperties;
}> = ({
    value,
    onChange,
    height = '150px',
    placeholder,
    readOnly = false,
    title,
    style = {},
}) => {
    const [error, setError] = useState<string | null>(null);
    const [displayValue, setDisplayValue] = useState<string | null>(null);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        onChange(newValue);
        setDisplayValue(null);

        if (newValue.trim()) {
            try {
                JSON.parse(newValue);
                setError(null);
            } catch {
                setError('JSON格式错误');
            }
        } else {
            setError(null);
        }
    }, [onChange]);

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
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderBottom: '1px solid #f0f0f0',
                    backgroundColor: '#fafafa',
                }}
            >
                {title && <Text strong style={{ fontSize: '14px' }}>{title}</Text>}
                
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
                            <Button
                                size="small"
                                onClick={handleResetDisplay}
                                type="text"
                            >
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
            
            <TextArea
                value={actualValue}
                onChange={handleChange}
                placeholder={placeholder}
                readOnly={readOnly}
                style={{
                    width: '100%',
                    height,
                    fontFamily: 'monospace',
                    border: 'none',
                    padding: '12px',
                    borderRadius: 0,
                    resize: 'vertical',
                }}
                status={error ? 'error' : ''}
                autoSize={{ minRows: 6, maxRows: 12 }}
            />
        </div>
    );
};

export default JsonEditor;
