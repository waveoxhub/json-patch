import React from 'react';
import { Card, Button, Alert, Space } from 'antd';
import { CopyOutlined, SyncOutlined } from '@ant-design/icons';
import { copyToClipboard } from './utils';

interface ResultSectionProps {
    result: string;
    error: string | null;
    onReset: () => void;
}

const ResultSection: React.FC<ResultSectionProps> = ({ result, error, onReset }) => {
    let formattedResult = result;
    try {
        if (result) {
            const parsed = JSON.parse(result);
            formattedResult = JSON.stringify(parsed, null, 2);
        }
    } catch {
        // 如果解析失败，使用原始文本
    }

    if (!result && !error) {
        return (
            <Alert
                message="未生成结果"
                description="尚未应用补丁或处理过程中遇到错误。"
                type="info"
                showIcon
            />
        );
    }

    if (error) {
        return <Alert message="处理出错" description={error} type="error" showIcon />;
    }

    return (
        <>
            <Alert
                message="补丁应用成功"
                description="补丁已成功应用到源JSON。"
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
            />

            <Card
                title="应用结果"
                size="small"
                extra={
                    <Button
                        icon={<CopyOutlined />}
                        size="small"
                        onClick={() => copyToClipboard(result)}
                        title="复制结果"
                    >
                        复制
                    </Button>
                }
            >
                <pre
                    style={{
                        backgroundColor: '#f5f5f5',
                        padding: '8px',
                        borderRadius: '4px',
                        maxHeight: '400px',
                        overflow: 'auto',
                    }}
                >
                    {formattedResult}
                </pre>
            </Card>

            <div style={{ textAlign: 'center', margin: '24px 0' }}>
                <Space>
                    <Button type="primary" icon={<SyncOutlined />} onClick={onReset}>
                        重新开始
                    </Button>
                </Space>
            </div>
        </>
    );
};

export default ResultSection;
