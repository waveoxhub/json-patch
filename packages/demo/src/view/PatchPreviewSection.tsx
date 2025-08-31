import React from 'react';
import { Card, Button, Space, Tabs, Divider, Typography, message } from 'antd';
import { CheckOutlined, CopyOutlined } from '@ant-design/icons';
import { usePatchContext } from '../context/PatchContext';
import { escapeJsonString } from '../utils/jsonUtils';
import JsonEditor from '../components/JsonEditor';

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

    // 复制当前激活的补丁到剪贴板
    const handleCopyCurrentPatch = async () => {
        const currentPatch = patchStrings[activeTargetIndex];
        if (!currentPatch || !currentPatch.trim()) {
            message.warning('没有可复制的补丁内容');
            return;
        }

        try {
            // 使用工具函数进行JSON字符串转义
            const escapedPatch = escapeJsonString(currentPatch);
            
            await navigator.clipboard.writeText(escapedPatch);
            message.success(`目标 ${activeTargetIndex + 1} 的补丁已复制到剪贴板（已转义）`);
        } catch (error) {
            message.error('复制失败：补丁格式错误');
        }
    };

    return (
        <div className="patch-preview-section">
            <Card 
                title="补丁预览" 
                className="preview-card"
                extra={
                    hasPatches && (
                        <Button
                            type="text"
                            icon={<CopyOutlined />}
                            onClick={handleCopyCurrentPatch}
                            size="small"
                        >
                            复制当前补丁
                        </Button>
                    )
                }
            >
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
                                        title=""
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
                            title=""
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


