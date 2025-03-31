import { useState } from 'react';
import { Input, Typography } from 'antd';

const { TextArea } = Input;
const { Text } = Typography;

interface JsonEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    style?: React.CSSProperties;
}

const JsonEditor: React.FC<JsonEditorProps> = ({ value, onChange, placeholder, style = {} }) => {
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

    return (
        <div style={{ ...style }}>
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
