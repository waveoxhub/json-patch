import React from 'react';
import { Card, Space, Typography, Collapse, Tag } from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    WarningOutlined,
    SafetyCertificateOutlined,
} from '@ant-design/icons';
import {
    validatePatches,
    validatePatchApplication,
    Patch,
    Schema,
} from '@waveox/schema-json-patch';

const { Text } = Typography;

interface ValidationPanelProps {
    patches: Patch[];
    sourceJson: string;
    schema: Schema;
}

interface ValidationStatus {
    label: string;
    status: 'success' | 'warning' | 'error';
    message?: string;
}

/**
 * 验证状态面板组件
 * 展示补丁的各项验证结果
 */
const ValidationPanel: React.FC<ValidationPanelProps> = ({
    patches,
    sourceJson,
    schema,
}) => {
    // 执行各项验证
    const getValidationResults = (): ValidationStatus[] => {
        const results: ValidationStatus[] = [];

        // 1. 补丁结构验证
        if (patches.length === 0) {
            results.push({
                label: '补丁结构',
                status: 'warning',
                message: '暂无补丁',
            });
        } else {
            const structureResult = validatePatches(patches);
            results.push({
                label: '补丁结构',
                status: structureResult.isValid ? 'success' : 'error',
                message: structureResult.isValid
                    ? `${patches.length} 个补丁均有效`
                    : structureResult.errors.join('; '),
            });
        }

        // 2. 补丁可应用性验证
        if (patches.length > 0 && sourceJson) {
            try {
                const applicationResult = validatePatchApplication(
                    sourceJson,
                    patches,
                    schema
                );
                results.push({
                    label: '可应用性',
                    status: applicationResult.isValid ? 'success' : 'error',
                    message: applicationResult.isValid
                        ? '所有补丁可成功应用'
                        : applicationResult.errors.join('; '),
                });
            } catch (err) {
                results.push({
                    label: '可应用性',
                    status: 'error',
                    message: err instanceof Error ? err.message : '验证失败',
                });
            }
        }

        return results;
    };

    const validationResults = getValidationResults();
    const allPassed = validationResults.every(r => r.status === 'success');
    const hasErrors = validationResults.some(r => r.status === 'error');

    const getStatusIcon = (status: 'success' | 'warning' | 'error') => {
        switch (status) {
            case 'success':
                return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
            case 'warning':
                return <WarningOutlined style={{ color: '#faad14' }} />;
            case 'error':
                return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
        }
    };

    const getStatusColor = (status: 'success' | 'warning' | 'error') => {
        switch (status) {
            case 'success':
                return 'success';
            case 'warning':
                return 'warning';
            case 'error':
                return 'error';
        }
    };

    return (
        <Card
            size="small"
            className="validation-panel"
            style={{
                marginBottom: 16,
                background: hasErrors
                    ? 'linear-gradient(135deg, #fff2f0 0%, #fff 100%)'
                    : allPassed
                      ? 'linear-gradient(135deg, #f6ffed 0%, #fff 100%)'
                      : 'linear-gradient(135deg, #fffbe6 0%, #fff 100%)',
                border: hasErrors
                    ? '1px solid #ffccc7'
                    : allPassed
                      ? '1px solid #b7eb8f'
                      : '1px solid #ffe58f',
            }}
        >
            <Space size="middle" wrap>
                <Space size={4}>
                    <SafetyCertificateOutlined
                        style={{
                            fontSize: 16,
                            color: hasErrors
                                ? '#ff4d4f'
                                : allPassed
                                  ? '#52c41a'
                                  : '#faad14',
                        }}
                    />
                    <Text strong style={{ fontSize: 13 }}>
                        验证状态
                    </Text>
                </Space>

                {validationResults.map((result, index) => (
                    <Tag
                        key={index}
                        icon={getStatusIcon(result.status)}
                        color={getStatusColor(result.status)}
                        style={{ margin: 0 }}
                    >
                        {result.label}
                        {result.status === 'success' && ': 通过'}
                        {result.status === 'warning' && ': 待定'}
                        {result.status === 'error' && ': 失败'}
                    </Tag>
                ))}
            </Space>

            {hasErrors && (
                <Collapse
                    ghost
                    size="small"
                    style={{ marginTop: 8 }}
                    items={[
                        {
                            key: 'errors',
                            label: (
                                <Text type="danger" style={{ fontSize: 12 }}>
                                    查看错误详情
                                </Text>
                            ),
                            children: (
                                <ul
                                    style={{
                                        margin: 0,
                                        paddingLeft: 20,
                                        fontSize: 12,
                                    }}
                                >
                                    {validationResults
                                        .filter(r => r.status === 'error')
                                        .map((r, i) => (
                                            <li key={i}>
                                                <Text type="danger">
                                                    {r.label}: {r.message}
                                                </Text>
                                            </li>
                                        ))}
                                </ul>
                            ),
                        },
                    ]}
                />
            )}
        </Card>
    );
};

export default ValidationPanel;
