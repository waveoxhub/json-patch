import React from 'react';
import { Alert, Collapse, Row, Col, Radio, Space, Button } from 'antd';
import { WarningOutlined, CheckOutlined } from '@ant-design/icons';
import { ConflictDetail, Patch } from '@waveox/schema-json-patch';

interface ConflictResolutionSectionProps {
    conflicts: Array<ConflictDetail & { patches: Array<Patch> }>;
    resolutions: Record<string, number>;
    onResolutionChange: (conflictIndex: number, selectedOperationIndex: number) => void;
    onApply: () => void;
    onBack: () => void;
    targetLabels?: string[];
}

const ConflictResolutionSection: React.FC<ConflictResolutionSectionProps> = ({
    conflicts,
    resolutions,
    onResolutionChange,
    onApply,
    onBack,
    targetLabels = [],
}) => {
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

    const collapseItems = conflicts.map((conflict, index) => {
        const resolution = resolutions[index.toString()] ?? 0;

        return {
            key: index.toString(),
            header: `冲突 ${index + 1}: 路径 "${conflict.path}"`,
            children: (
                <Row gutter={[16, 16]}>
                    <Col span={24}>
                        <div>选择要保留的操作:</div>
                        <Radio.Group
                            value={resolution}
                            onChange={e => onResolutionChange(index, e.target.value)}
                            style={{ marginTop: 16, marginBottom: 16 }}
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
                                                        操作 {getTargetLabel(operation.groupIndex)}:{' '}
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
