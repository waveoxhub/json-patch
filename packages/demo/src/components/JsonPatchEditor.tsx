import React from 'react';
import { Card, Button, Tabs, Divider, Space, Typography } from 'antd';
import { PlusOutlined, ThunderboltOutlined } from '@ant-design/icons';
import JsonEditor from './JsonEditor';
import { usePatchContext } from '../context/PatchContext';

const { Text } = Typography;

/**
 * JSON补丁编辑器组件，用于编辑源和目标JSON
 */
const JsonPatchEditor: React.FC = () => {
    const {
        sourceJson,
        setSourceJson,
        targetJsons,
        activeTargetIndex,
        setActiveTargetIndex,
        addTargetJson,
        updateTargetJson,
        removeTargetJson,
        generatePatchesCallback,
        setActiveTab,
        error,
    } = usePatchContext();

    const handleSourceChange = (value: string) => {
        setSourceJson(value);
    };

    const handleTargetChange = (index: number, value: string) => {
        updateTargetJson(index, value);
    };

    const handleGeneratePatches = () => {
        generatePatchesCallback();
        setActiveTab('patches');
    };

    return (
        <div className="json-patch-editor">
            <Card
                title="JSON编辑"
                className="editor-card"
                extra={
                    <Button
                        type="primary"
                        onClick={handleGeneratePatches}
                        icon={<ThunderboltOutlined />}
                        size="middle"
                        disabled={!sourceJson.trim() || !targetJsons.some(json => json.trim())}
                    >
                        生成补丁
                    </Button>
                }
            >
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <div className="source-editor">
                        <JsonEditor
                            value={sourceJson}
                            onChange={handleSourceChange}
                            height="200px"
                            placeholder="请输入源JSON数据"
                            title="源JSON"
                            showSaveIndicator={true}
                        />
                    </div>

                    <Divider style={{ margin: '24px 0 16px' }}>目标JSON</Divider>

                    <div className="target-editors">
                        <div className="target-actions" style={{ marginBottom: '16px' }}>
                            <Button
                                type="dashed"
                                icon={<PlusOutlined />}
                                onClick={addTargetJson}
                                size="middle"
                            >
                                添加目标
                            </Button>
                        </div>

                        <Tabs
                            type="editable-card"
                            activeKey={activeTargetIndex.toString()}
                            onChange={key => setActiveTargetIndex(parseInt(key))}
                            className="modern-tabs"
                            destroyInactiveTabPane={true}
                            onEdit={(targetKey, action) => {
                                if (action === 'remove' && typeof targetKey === 'string') {
                                    removeTargetJson(parseInt(targetKey));
                                }
                            }}
                            items={targetJsons.map((json, index) => ({
                                key: index.toString(),
                                label: `目标 ${index + 1}`,
                                closable: targetJsons.length > 1,
                                children: (
                                    <div className="target-editor">
                                        <JsonEditor
                                            value={json}
                                            onChange={value => handleTargetChange(index, value)}
                                            height="200px"
                                            placeholder="请输入目标JSON数据"
                                            title={`目标 ${index + 1} JSON`}
                                            showSaveIndicator={true}
                                        />
                                    </div>
                                ),
                            }))}
                        />
                    </div>

                    {error && !error.includes('Schema') && (
                        <div
                            className="error-message"
                            style={{
                                padding: '8px 12px',
                                backgroundColor: '#fff2f0',
                                borderRadius: '4px',
                            }}
                        >
                            <Text type="danger">{error}</Text>
                        </div>
                    )}
                </Space>
            </Card>
        </div>
    );
};

export default JsonPatchEditor;
