import { useState } from 'react';
import { Input, Typography, Button } from 'antd';
import { FormatPainterOutlined } from '@ant-design/icons';
import { formatJson } from './utils';

const { TextArea } = Input;
const { Text } = Typography;

interface JsonEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    style?: React.CSSProperties;
    title?: string;
    showFormatButton?: boolean;
}

const JsonEditor: React.FC<JsonEditorProps> = ({
    value,
    onChange,
    placeholder,
    style = {},
    title,
    showFormatButton = true,
}) => {
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
    };

    const handleFormat = () => {
        formatJson(value, onChange);
    };

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
                    {showFormatButton && (
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
                style={{
                    width: '100%',
                    height: '150px',
                    fontFamily: 'monospace',
                }}
                status={error ? 'error' : ''}
                autoSize={{ minRows: 6, maxRows: 12 }}
            />
        </div>
    );
};

export default JsonEditor;
