import React from 'react';
import { Card, Button, Alert, Space, Tabs } from 'antd';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';
import { copyToClipboard } from './utils';
import type { TabsProps } from 'antd';

interface PatchPreviewSectionProps {
    patchStrings: string[];
    onApplyPatches: () => void;
    onBack: () => void;
}

const PatchPreviewSection: React.FC<PatchPreviewSectionProps> = ({
    patchStrings,
    onApplyPatches,
    onBack,
}) => {
    if (!patchStrings.length || patchStrings.every(p => !p)) {
        return (
            <Alert
                message="没有有效的补丁"
                description="没有发现有效的补丁数据，请返回编辑页面重新生成补丁。"
                type="info"
                showIcon
            />
        );
    }

    const items: TabsProps['items'] = patchStrings
        .map((patchString, index) => {
            if (!patchString) {
                return null;
            }

            return {
                key: index.toString(),
                label: `补丁 ${index + 1}`,
                children: (
                    <Card
                        title={`从源到目标 ${index + 1} 的补丁`}
                        size="small"
                        extra={
                            <Button
                                icon={<CopyOutlined />}
                                size="small"
                                onClick={() => copyToClipboard(patchString)}
                                title="复制补丁"
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
                            {patchString}
                        </pre>
                    </Card>
                ),
            };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

    return (
        <>
            <Tabs defaultActiveKey="0" items={items} />

            <div style={{ textAlign: 'center', margin: '24px 0' }}>
                <Space>
                    <Button type="primary" icon={<CheckOutlined />} onClick={onApplyPatches}>
                        检测冲突并应用
                    </Button>
                    <Button onClick={onBack}>返回编辑</Button>
                </Space>
            </div>
        </>
    );
};

export default PatchPreviewSection;
