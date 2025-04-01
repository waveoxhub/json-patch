import React, { useState, useEffect } from 'react';
import { Alert, Collapse, Row, Col, Radio, Space, Button, Input, Tabs, Typography } from 'antd';
import { WarningOutlined, CheckOutlined, MergeCellsOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { ConflictDetail, Patch, CustomResolution } from '@waveox/schema-json-patch';

const { Text } = Typography;

interface ConflictResolutionSectionProps {
    conflicts: Array<ConflictDetail & { patches: Array<Patch> }>;
    resolutions: Record<string, number>;
    onResolutionChange: (conflictIndex: number, selectedOperationIndex: number) => void;
    onApply: () => void;
    onBack: () => void;
    targetLabels?: string[];
    customResolutions?: CustomResolution[];
    onCustomResolutionChange?: (conflictIndex: number, customValue: any) => void;
}

const ConflictResolutionSection: React.FC<ConflictResolutionSectionProps> = ({
    conflicts,
    resolutions,
    onResolutionChange,
    onApply,
    onBack,
    targetLabels = [],
    onCustomResolutionChange = () => {},
}) => {
    // 用于存储合并编辑视图的文本值
    const [mergeTexts, setMergeTexts] = useState<Record<string, string>>({});

    // 初始化合并文本
    useEffect(() => {
        const initialMergeTexts: Record<string, string> = {};
        
        conflicts.forEach((conflict, index) => {
            // 生成类似Git冲突标记的文本
            let mergeText = '';
            conflict.operations.forEach((operation, opIndex) => {
                const patch = conflict.patches[opIndex] || { value: null };
                const label = getTargetLabel(operation.groupIndex);
                
                if (opIndex === 0) {
                    mergeText += `<<<<<<< ${label}\n`;
                    mergeText += JSON.stringify(patch.value, null, 2);
                    mergeText += '\n=======\n';
                } else if (opIndex === conflict.operations.length - 1) {
                    mergeText += JSON.stringify(patch.value, null, 2);
                    mergeText += `\n>>>>>>> ${label}\n`;
                } else {
                    mergeText += JSON.stringify(patch.value, null, 2);
                    mergeText += '\n=======\n';
                }
            });
            
            initialMergeTexts[index.toString()] = mergeText;
        });
        
        setMergeTexts(initialMergeTexts);
    }, [conflicts]);

    if (!conflicts.length) {
        return (
            <Alert
                message="没有检测到冲突"
                description="没有发现补丁冲突，您可以直接应用补丁。"
                type="info"
                showIcon
            />
        );
    }

    const getTargetLabel = (groupIndex: number) => {
        return targetLabels[groupIndex] || `目标 ${groupIndex + 1}`;
    };

    // 处理合并文本的变化
    const handleMergeTextChange = (conflictIndex: number, value: string) => {
        setMergeTexts({
            ...mergeTexts,
            [conflictIndex.toString()]: value,
        });
        
        // 尝试解析修改后的文本作为JSON
        try {
            // 移除冲突标记并只保留编辑后的内容
            const cleanedValue = cleanMergeText(value);
            const parsedValue = JSON.parse(cleanedValue);
            
            // 更新为自定义解决方案
            onResolutionChange(conflictIndex, -1); // 选择自定义选项
            onCustomResolutionChange(conflictIndex, parsedValue);
        } catch (err) {
            // 如果格式不正确，不进行处理
        }
    };
    
    // 清理合并文本，移除冲突标记
    const cleanMergeText = (mergeText: string): string => {
        // 这里实现一个简单的解析器，移除Git风格的冲突标记
        // 在真实场景中，可能需要更复杂的处理
        try {
            // 先尝试检测是否还有冲突标记
            if (!/<<<<<<< |=======|>>>>>>> /.test(mergeText)) {
                // 如果没有冲突标记，直接返回
                return mergeText;
            }
            
            // 否则，尝试提取用户选择的部分（最后一个冲突标记之后的内容）
            const lastMarkerIndex = mergeText.lastIndexOf('>>>>>>> ');
            if (lastMarkerIndex !== -1) {
                const lineEndIndex = mergeText.indexOf('\n', lastMarkerIndex);
                const selectedContent = mergeText.substring(lineEndIndex + 1);
                return selectedContent.trim();
            }
            
            // 如果无法确定，返回原始内容
            return mergeText;
        } catch (err) {
            return mergeText;
        }
    };

    const collapseItems = conflicts.map((conflict, index) => {
        const resolution = resolutions[index.toString()] ?? 0;
        const mergeText = mergeTexts[index.toString()] || '';

        return {
            key: index.toString(),
            header: `冲突 ${index + 1}: 路径 "${conflict.path}"`,
            children: (
                <Row gutter={[16, 16]}>
                    <Col span={24}>
                        <Tabs 
                            defaultActiveKey="1"
                            items={[
                                {
                                    key: "1",
                                    label: (
                                        <span>
                                            <CheckCircleOutlined />
                                            选择版本
                                        </span>
                                    ),
                                    children: (
                                        <>
                                            <div style={{ marginBottom: 8 }}>
                                                <Text type="secondary">
                                                    从现有版本中选择一个作为解决方案。
                                                </Text>
                                            </div>
                                            <Radio.Group
                                                value={resolution}
                                                onChange={e => onResolutionChange(index, e.target.value)}
                                                style={{ marginBottom: 16 }}
                                            >
                                                <Space direction="vertical">
                                                    {conflict.operations.map(
                                                        (
                                                            operation: { groupIndex: number; operation: string },
                                                            opIndex: number
                                                        ) => {
                                                            const patch = conflict.patches[opIndex];
                                                            return (
                                                                <Radio key={opIndex} value={opIndex}>
                                                                    <div>
                                                                        <div>
                                                                            {getTargetLabel(operation.groupIndex)}的版本:{' '}
                                                                            {operation.operation}
                                                                        </div>
                                                                        <div
                                                                            style={{
                                                                                color: '#666',
                                                                                fontSize: '13px',
                                                                                marginLeft: '23px',
                                                                            }}
                                                                        >
                                                                            路径: {patch.path}
                                                                        </div>
                                                                        <div
                                                                            style={{
                                                                                color: '#666',
                                                                                fontSize: '13px',
                                                                                marginLeft: '23px',
                                                                            }}
                                                                        >
                                                                            值: {JSON.stringify(patch.value)}
                                                                        </div>
                                                                    </div>
                                                                </Radio>
                                                            );
                                                        }
                                                    )}
                                                </Space>
                                            </Radio.Group>
                                        </>
                                    )
                                },
                                {
                                    key: "2",
                                    label: (
                                        <span>
                                            <MergeCellsOutlined />
                                            手动合并
                                        </span>
                                    ),
                                    children: (
                                        <>
                                            <div style={{ marginBottom: 8 }}>
                                                <Text type="secondary">
                                                    您可以直接编辑下方内容，解决冲突后的最终值将用于应用补丁。
                                                    保留需要的部分，移除冲突标记(<Text code>{"<<<<<<< "}</Text>, 
                                                    <Text code>=======</Text>, <Text code>{">>>>>>> "}</Text>)。
                                                </Text>
                                            </div>
                                            <Input.TextArea
                                                value={mergeText}
                                                onChange={e => handleMergeTextChange(index, e.target.value)}
                                                autoSize={{ minRows: 10, maxRows: 20 }}
                                                style={{ 
                                                    fontFamily: 'monospace',
                                                    width: '100%'
                                                }}
                                            />
                                        </>
                                    )
                                }
                            ]}
                        />
                    </Col>
                </Row>
            ),
        };
    });

    return (
        <>
            <Alert
                message="检测到补丁冲突"
                description={`发现 ${conflicts.length} 个补丁冲突，请选择如何解决每个冲突。`}
                type="warning"
                showIcon
                icon={<WarningOutlined />}
                style={{ marginBottom: 16 }}
            />

            <Collapse
                defaultActiveKey={conflicts.map((_, index) => index.toString())}
                items={collapseItems}
            />

            <div style={{ textAlign: 'center', margin: '24px 0' }}>
                <Space>
                    <Button type="primary" icon={<CheckOutlined />} onClick={onApply}>
                        应用解决方案
                    </Button>
                    <Button onClick={onBack}>返回补丁查看</Button>
                </Space>
            </div>
        </>
    );
};

export default ConflictResolutionSection;
