import React from 'react';
import { Card, Button, Space, Tabs, Divider, Typography } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { usePatchContext } from '../context/PatchContext';
import JsonEditor from './JsonEditor';

const { Text } = Typography;

/**
 * 补丁预览部分组件，显示生成的补丁
 */
const PatchPreviewSection: React.FC = () => {
    const {
        patches,
        patchStrings,
        activeTargetIndex,
        setActiveTargetIndex,
        checkForConflicts,
        targetJsons,
    } = usePatchContext();

    const hasPatches = patches.length > 0 && patches.some(p => p.length > 0);

    // 处理标签切换
    const handleTabChange = (key: string) => {
        setActiveTargetIndex(parseInt(key));
    };

    return (
        <div className="patch-preview-section">
            <Card title="补丁预览" className="preview-card">
                <Text>
                    以下是根据源JSON和目标JSON生成的补丁。您可以检查生成的补丁，然后检测冲突并应用。
                </Text>

                {targetJsons.length > 1 && (
                    <Tabs
                        type="card"
                        activeKey={activeTargetIndex.toString()}
                        onChange={handleTabChange}
                        className="modern-tabs"
                        destroyInactiveTabPane={true}
                        style={{ marginTop: '16px' }}
                        items={patchStrings.map((patchString, index) => ({
                            key: index.toString(),
                            label: `目标 ${index + 1} 的补丁`,
                            children: (
                                <div className="patch-content">
                                    <JsonEditor
                                        value={patchString}
                                        onChange={() => {}}
                                        readOnly={true}
                                        height="300px"
                                        title="补丁内容"
                                    />
                                </div>
                            ),
                        }))}
                    />
                )}

                {targetJsons.length === 1 && (
                    <div className="patch-content" style={{ marginTop: '16px' }}>
                        <JsonEditor
                            value={patchStrings[0] || '[]'}
                            onChange={() => {}}
                            readOnly={true}
                            height="300px"
                            title="补丁内容"
                        />
                    </div>
                )}

                <Divider style={{ margin: '24px 0' }} />

                <div className="actions">
                    <Space>
                        <Button
                            type="primary"
                            onClick={checkForConflicts}
                            disabled={!hasPatches}
                            icon={<CheckOutlined />}
                            size="middle"
                        >
                            检测冲突并应用
                        </Button>
                    </Space>
                </div>
            </Card>
        </div>
    );
};

export default PatchPreviewSection;
