import React, { useEffect, useRef } from 'react';
import { Card, Button, Row, Col, Space, Typography } from 'antd';
import {
    FormatPainterOutlined,
    PlusOutlined,
    DeleteOutlined,
    CheckOutlined,
} from '@ant-design/icons';
import JsonEditor from './JsonEditor';
import { formatJson } from './utils';

const { Text } = Typography;

interface JsonEditSectionProps {
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
    error: string | null;
    patchStrings?: string[];
}

// 定义补丁对象的类型
interface PatchOperation {
    op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
    path: string;
    value?: unknown;
    from?: string;
}

const JsonEditSection: React.FC<JsonEditSectionProps> = ({
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
    // 使用ref记录上一次的值，避免不必要的更新
    const prevSourceJsonRef = useRef<string>('');
    const prevTargetJsonsRef = useRef<string[]>([]);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 使用useEffect在源或目标JSON变化时自动生成补丁，添加防抖
    useEffect(() => {
        // 如果源为空或所有目标为空，不生成补丁
        if (!sourceJson.trim() || !targetJsons.some(t => t.trim())) {
            return;
        }

        // 检查是否需要更新
        const hasSourceChanged = sourceJson !== prevSourceJsonRef.current;
        const hasTargetsChanged =
            targetJsons.length !== prevTargetJsonsRef.current.length ||
            targetJsons.some((json, i) => json !== (prevTargetJsonsRef.current[i] || ''));

        if (!hasSourceChanged && !hasTargetsChanged) {
            return;
        }

        // 更新refs
        prevSourceJsonRef.current = sourceJson;
        prevTargetJsonsRef.current = [...targetJsons];

        // 清除现有的超时
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // 设置2000毫秒延迟，显著提高防抖时间以减少CPU使用
        timeoutRef.current = setTimeout(() => {
            let sourceValid = false;
            let targetValid = false;

            // 尝试解析JSON，确保它们是有效的，避免处理无效数据
            try {
                JSON.parse(sourceJson);
                sourceValid = true;
            } catch {
                // 源JSON无效，不处理
                return;
            }

            const validTargets = targetJsons.filter(json => {
                if (!json.trim()) return false;

                try {
                    JSON.parse(json);
                    targetValid = true;
                    return true;
                } catch {
                    return false;
                }
            });

            if (validTargets.length > 0 && targetValid && sourceValid) {
                onGeneratePatches();
            }
        }, 2000);

        // 清除效果
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [sourceJson, targetJsons, onGeneratePatches]);

    // 将JSON补丁转换为更紧凑的显示格式
    const renderCompactPatch = (patchStr: string) => {
        try {
            const patches = JSON.parse(patchStr) as PatchOperation[];

            return patches.map((patch: PatchOperation, index: number) => {
                const { op, path, value, from } = patch;

                // 根据操作类型格式化值的展示
                let valueDisplay = '';
                if (op === 'add' || op === 'replace') {
                    if (typeof value === 'object') {
                        valueDisplay = JSON.stringify(value).slice(0, 80);
                        if (JSON.stringify(value).length > 80) valueDisplay += '...';
                    } else {
                        valueDisplay = JSON.stringify(value);
                    }
                } else if (op === 'copy' || op === 'move') {
                    valueDisplay = `from: ${from}`;
                }

                // 创建一行紧凑的补丁信息
                return (
                    <div
                        key={index}
                        style={{
                            marginBottom: '4px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <Text type="secondary" style={{ width: '30px' }}>
                                {index}.
                            </Text>
                            <Text style={{ fontWeight: 'bold' }}>{op}</Text>
                        </div>
                        <div style={{ marginLeft: '30px', wordBreak: 'break-all' }}>
                            <Text code>{path}</Text>
                        </div>
                        {valueDisplay && (
                            <div style={{ marginLeft: '30px', wordBreak: 'break-all' }}>
                                <Text>{valueDisplay}</Text>
                            </div>
                        )}
                    </div>
                );
            });
        } catch {
            // 如果解析失败则原样显示
            return <pre>{patchStr}</pre>;
        }
    };

    return (
        <Row gutter={[16, 16]}>
            {/* 左侧：源JSON和目标JSON */}
            <Col span={12}>
                <Card
                    title="源JSON"
                    size="small"
                    extra={
                        <Button
                            icon={<FormatPainterOutlined />}
                            size="small"
                            onClick={() => formatJson(sourceJson, onSourceChange)}
                            title="格式化JSON"
                        />
                    }
                    style={{ marginBottom: '16px' }}
                >
                    <JsonEditor
                        value={sourceJson}
                        onChange={onSourceChange}
                        placeholder="输入源JSON"
                    />
                </Card>

                <Card
                    title={
                        <Space>
                            目标JSON列表
                            <Button
                                type="primary"
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={onTargetAdd}
                                title="添加目标JSON"
                            >
                                添加
                            </Button>
                        </Space>
                    }
                    size="small"
                    style={{ marginBottom: '16px' }}
                >
                    <Row gutter={[8, 8]}>
                        {targetJsons.map((_, index) => (
                            <Col key={index} span={8}>
                                <Button
                                    type={activeTargetIndex === index ? 'primary' : 'default'}
                                    onClick={() => onTargetSelect(index)}
                                    style={{ width: '100%' }}
                                >
                                    目标 {index + 1}
                                </Button>
                            </Col>
                        ))}
                    </Row>
                </Card>

                {targetJsons.length > 0 && (
                    <Card
                        title={
                            <Space>
                                {`目标 ${activeTargetIndex + 1}`}
                                {targetJsons.length > 1 && (
                                    <Button
                                        danger
                                        size="small"
                                        icon={<DeleteOutlined />}
                                        onClick={() => onTargetRemove(activeTargetIndex)}
                                        title="删除目标JSON"
                                    >
                                        删除
                                    </Button>
                                )}
                            </Space>
                        }
                        size="small"
                        extra={
                            <Button
                                icon={<FormatPainterOutlined />}
                                size="small"
                                onClick={() =>
                                    formatJson(targetJsons[activeTargetIndex], value =>
                                        onTargetChange(activeTargetIndex, value)
                                    )
                                }
                                title="格式化JSON"
                            />
                        }
                    >
                        <JsonEditor
                            value={targetJsons[activeTargetIndex]}
                            onChange={value => onTargetChange(activeTargetIndex, value)}
                            placeholder={`输入目标JSON ${activeTargetIndex + 1}`}
                        />
                    </Card>
                )}
            </Col>

            {/* 右侧：所有补丁预览 */}
            <Col span={12}>
                <Card title="补丁预览" size="small" style={{ height: '100%' }}>
                    {patchStrings.length > 0 ? (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px',
                                maxHeight: 'calc(100vh - 200px)',
                                overflow: 'auto',
                            }}
                        >
                            {patchStrings.map((patchString, index) =>
                                patchString ? (
                                    <div key={index}>
                                        <Card
                                            title={`源到目标 ${index + 1} 的补丁`}
                                            size="small"
                                            style={{ marginBottom: '8px' }}
                                        >
                                            <div
                                                style={{
                                                    backgroundColor: '#f5f5f5',
                                                    padding: '12px',
                                                    borderRadius: '4px',
                                                    maxHeight: '250px',
                                                    overflow: 'auto',
                                                    fontFamily: 'monospace',
                                                    fontSize: '13px',
                                                }}
                                            >
                                                {renderCompactPatch(patchString)}
                                            </div>
                                        </Card>
                                    </div>
                                ) : null
                            )}
                        </div>
                    ) : (
                        <div
                            style={{
                                textAlign: 'center',
                                padding: '40px 0',
                                color: '#999',
                            }}
                        >
                            修改源或目标JSON以生成补丁
                        </div>
                    )}
                </Card>
            </Col>

            {/* 底部：检测冲突按钮 */}
            {patchStrings.some(p => p) && onCheckForConflicts && (
                <Col span={24} style={{ textAlign: 'center', marginTop: '16px' }}>
                    <Button type="primary" icon={<CheckOutlined />} onClick={onCheckForConflicts}>
                        检测冲突并应用
                    </Button>
                </Col>
            )}
        </Row>
    );
};

export default JsonEditSection;
