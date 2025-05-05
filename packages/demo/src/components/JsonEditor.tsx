import React, { useState, useCallback } from 'react';
import { Input, Typography, Button } from 'antd';
import { FormatPainterOutlined } from '@ant-design/icons';
import { JsonEditorProps } from '../types/types';
import { formatJson } from '../utils/jsonUtils';

const { TextArea } = Input;
const { Text } = Typography;

/**
 * JSON编辑器组件，支持JSON格式化和错误检测
 */
const JsonEditor: React.FC<JsonEditorProps & {
    title?: string;
    showFormatButton?: boolean;
    style?: React.CSSProperties;
}> = ({
    value,
    onChange,
    height = '150px',
    placeholder,
    readOnly = false,
    title,
    showFormatButton = true,
    style = {},
}) => {
    const [error, setError] = useState<string | null>(null);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        onChange(newValue);

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
        const formatted = formatJson(value);
        onChange(formatted);
    }, [value, onChange]);

    return (
        <div style={{ ...style }}>
            {(title || showFormatButton) && (
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 8,
                    }}
                >
                    {title && <Text strong>{title}</Text>}
                    {showFormatButton && !readOnly && (
                        <Button
                            icon={<FormatPainterOutlined />}
                            size="small"
                            onClick={handleFormat}
                            title="格式化JSON"
                        />
                    )}
                </div>
            )}

            {error && (
                <div style={{ marginBottom: 8 }}>
                    <Text type="danger">{error}</Text>
                </div>
            )}
            
            <TextArea
                value={value}
                onChange={handleChange}
                placeholder={placeholder}
                readOnly={readOnly}
                style={{
                    width: '100%',
                    height,
                    fontFamily: 'monospace',
                }}
                status={error ? 'error' : ''}
                autoSize={{ minRows: 6, maxRows: 12 }}
            />
        </div>
    );
};

export default JsonEditor;
