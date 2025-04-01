import React, { useState } from 'react';
import { Card, Button, Row, Col, Space, Typography, Tabs } from 'antd';
import type { TabsProps } from 'antd';
import { PlusOutlined, DeleteOutlined, SyncOutlined, CheckCircleOutlined } from '@ant-design/icons';
import JsonEditor from './JsonEditor';
import { Patch } from '@waveox/schema-json-patch';

const { Text } = Typography;

interface JsonPatchEditorProps {
    sourceJson: string;
    onSourceChange: (value: string) => void;
    targetJsons: string[];
    onTargetChange: (index: number, value: string) => void;
    activeTargetIndex: number;
    onTargetSelect: (index: number) => void;
    onTargetAdd: () => void;
    onTargetRemove: (index: number) => void;
    onGeneratePatches: () => void;
    onCheckForConflicts?: () => void;
    patchStrings?: string[];
}

const JsonPatchEditor: React.FC<JsonPatchEditorProps> = ({
    sourceJson,
    onSourceChange,
    targetJsons,
    onTargetChange,
    activeTargetIndex,
    onTargetSelect,
    onTargetAdd,
    onTargetRemove,
    onGeneratePatches,
    onCheckForConflicts,
    patchStrings = [],
}) => {
    // 渲染补丁内容
    const renderPatchContent = (patchStr: string) => {
        try {
            const patches = JSON.parse(patchStr) as Patch[];

            return patches.map((patch: Patch, index: number) => {
                const { op, path, value } = patch;

                // 根据操作类型格式化值的展示
                let valueDisplay = '';
                if (op === 'add' || op === 'replace') {
                    if (typeof value === 'object') {
                        valueDisplay = JSON.stringify(value).slice(0, 80);
                        if (JSON.stringify(value).length > 80) valueDisplay += '...';
                    } else {
                        valueDisplay = JSON.stringify(value);
                    }
                }

                return (
                    <div
                        key={index}
                        style={{
                            marginBottom: '8px',
                            padding: '8px',
                            borderRadius: '4px',
                            backgroundColor: '#f5f5f5',
                        }}
                    >
                        <div style={{ fontWeight: 'bold' }}>
                            {index}. {op.toUpperCase()} {path}
                        </div>
                        {valueDisplay && (
                            <div style={{ marginTop: '4px', wordBreak: 'break-all' }}>
                                <Text code>{valueDisplay}</Text>
                            </div>
                        )}
                    </div>
                );
            });
        } catch {
            return <pre>{patchStr}</pre>;
        }
    };

    // 创建目标JSON标签页的items配置
    const targetTabItems: TabsProps['items'] = targetJsons.map((targetJson, index) => ({
        key: index.toString(),
        label: `目标 ${index + 1}`,
        children: (
            <JsonEditor
                value={targetJson}
                onChange={value => onTargetChange(index, value)}
                placeholder={`请输入目标 ${index + 1} 的JSON数据`}
            />
        ),
    }));

    // 创建补丁预览标签页的items配置
    const patchTabItems: TabsProps['items'] = patchStrings
        .map((patchString, index) => {
            if (!patchString) return null;
            return {
                key: index.toString(),
                label: `目标 ${index + 1} 的补丁`,
                children: (
                    <div
                        style={{
                            maxHeight: '250px',
                            overflow: 'auto',
                        }}
                    >
                        {renderPatchContent(patchString)}
                    </div>
                ),
            };
        })
        .filter(Boolean) as TabsProps['items'];

    // 有效的补丁
    const hasValidPatches = patchStrings.some(p => p);

    return (
        <Row gutter={[16, 16]}>
            <Col span={24}>
                <Card
                    title="JSON补丁编辑器"
                    size="small"
                    extra={
                        <Space>
                            <Button
                                type="primary"
                                icon={<SyncOutlined />}
                                onClick={onGeneratePatches}
                            >
                                生成补丁
                            </Button>
                            {hasValidPatches && onCheckForConflicts && (
                                <Button
                                    type="primary"
                                    icon={<CheckCircleOutlined />}
                                    onClick={onCheckForConflicts}
                                >
                                    检测冲突并应用
                                </Button>
                            )}
                        </Space>
                    }
                >
                    <Row gutter={[16, 16]}>
                        <Col span={12}>
                            <Card title="源JSON" size="small">
                                <JsonEditor
                                    value={sourceJson}
                                    onChange={onSourceChange}
                                    placeholder="请输入源JSON数据"
                                />
                            </Card>
                        </Col>

                        <Col span={12}>
                            <Card title="目标JSON" size="small">
                                <Tabs
                                    activeKey={activeTargetIndex.toString()}
                                    onChange={key => onTargetSelect(parseInt(key))}
                                    type="card"
                                    size="small"
                                    items={targetTabItems}
                                    tabBarExtraContent={
                                        <Space>
                                            <Button
                                                type="primary"
                                                size="small"
                                                icon={<PlusOutlined />}
                                                onClick={onTargetAdd}
                                            >
                                                添加目标
                                            </Button>
                                            {targetJsons.length > 1 && (
                                                <Button
                                                    danger
                                                    size="small"
                                                    icon={<DeleteOutlined />}
                                                    onClick={() =>
                                                        onTargetRemove(activeTargetIndex)
                                                    }
                                                >
                                                    删除当前
                                                </Button>
                                            )}
                                        </Space>
                                    }
                                />
                            </Card>
                        </Col>
                    </Row>

                    {hasValidPatches && (
                        <Card title="补丁预览" size="small" style={{ marginTop: '16px' }}>
                            <Tabs type="card" size="small" items={patchTabItems} />
                        </Card>
                    )}
                </Card>
            </Col>
        </Row>
    );
};

export default JsonPatchEditor;
