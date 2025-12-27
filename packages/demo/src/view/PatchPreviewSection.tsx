import React, { useState } from 'react';
import { Card, Button, Space, Tabs, Divider, Typography, message, Segmented } from 'antd';
import { CheckOutlined, CopyOutlined, CodeOutlined, AppstoreOutlined } from '@ant-design/icons';
import { usePatchContext } from '../context/PatchContext';
import { escapeJsonString } from '../utils/jsonUtils';
import JsonEditor from '../components/JsonEditor';
import ValidationPanel from '../components/ValidationPanel';
import PatchCard from '../components/PatchCard';

const { Text } = Typography;

type ViewMode = 'visual' | 'json';

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
        sourceJson,
        schema,
    } = usePatchContext();

    const [viewMode, setViewMode] = useState<ViewMode>('visual');

    const hasPatches = patches.length > 0 && patches.some(p => p.length > 0);
    const currentPatches = patches[activeTargetIndex] || [];

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
            const escapedPatch = escapeJsonString(currentPatch);
            await navigator.clipboard.writeText(escapedPatch);
            message.success(`目标 ${activeTargetIndex + 1} 的补丁已复制到剪贴板`);
        } catch {
            message.error('复制失败：补丁格式错误');
        }
    };

    // 渲染补丁内容
    const renderPatchContent = (patchList: typeof currentPatches, patchString: string) => {
        if (viewMode === 'visual') {
            if (patchList.length === 0) {
                return (
                    <div
                        style={{
                            padding: 24,
                            textAlign: 'center',
                            color: '#8c8c8c',
                            background: '#fafafa',
                            borderRadius: 8,
                        }}
                    >
                        <Text type="secondary">暂无补丁</Text>
                    </div>
                );
            }
            return (
                <div style={{ maxHeight: 400, overflow: 'auto' }}>
                    {patchList.map((patch, index) => (
                        <PatchCard key={patch.hash || index} patch={patch} index={index} />
                    ))}
                </div>
            );
        }

        return (
            <JsonEditor
                value={patchString || '[]'}
                onChange={() => {}}
                readOnly={true}
                height="300px"
                title=""
            />
        );
    };

    return (
        <div className="patch-preview-section">
            {/* 验证状态面板 */}
            {hasPatches && (
                <ValidationPanel
                    patches={patches.flat()}
                    sourceJson={sourceJson}
                    schema={schema}
                />
            )}

            <Card
                title="补丁预览"
                className="preview-card"
                extra={
                    <Space>
                        <Segmented
                            size="small"
                            value={viewMode}
                            onChange={v => setViewMode(v as ViewMode)}
                            options={[
                                {
                                    value: 'visual',
                                    icon: <AppstoreOutlined />,
                                    label: '可视化',
                                },
                                {
                                    value: 'json',
                                    icon: <CodeOutlined />,
                                    label: 'JSON',
                                },
                            ]}
                        />
                        {hasPatches && (
                            <Button
                                type="text"
                                icon={<CopyOutlined />}
                                onClick={handleCopyCurrentPatch}
                                size="small"
                            >
                                复制
                            </Button>
                        )}
                    </Space>
                }
            >
                <Text type="secondary" style={{ fontSize: 13 }}>
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
                        items={patches.map((patchList, index) => ({
                            key: index.toString(),
                            label: (
                                <span>
                                    目标 {index + 1}
                                    {patchList.length > 0 && (
                                        <span
                                            style={{
                                                marginLeft: 6,
                                                fontSize: 11,
                                                color: '#8c8c8c',
                                            }}
                                        >
                                            ({patchList.length})
                                        </span>
                                    )}
                                </span>
                            ),
                            children: (
                                <div className="patch-content">
                                    {renderPatchContent(patchList, patchStrings[index])}
                                </div>
                            ),
                        }))}
                    />
                )}

                {targetJsons.length === 1 && (
                    <div className="patch-content" style={{ marginTop: '16px' }}>
                        {renderPatchContent(currentPatches, patchStrings[0] || '[]')}
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
