import React from 'react';
import { Typography, Input, Card, Alert, Button, Space } from 'antd';
import { RightOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

interface SchemaEditSectionProps {
    schema: string;
    onSchemaChange: (schema: string) => void;
    onNext?: () => void;
}

/**
 * 用于编辑数据模型定义的组件
 */
const SchemaEditSection: React.FC<SchemaEditSectionProps> = ({
    schema,
    onSchemaChange,
    onNext,
}) => {
    // 处理Schema变更
    const handleSchemaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onSchemaChange(e.target.value);
    };

    return (
        <div style={{ padding: '16px 0' }}>
            <Card>
                <Title level={4}>数据模型(Schema)定义</Title>

                <Alert
                    type="info"
                    showIcon
                    message="数据模型定义说明"
                    description={
                        <div>
                            <Paragraph>
                                在这里定义JSON数据的结构模型，用于指导补丁生成算法如何处理数据差异。
                            </Paragraph>
                            <Paragraph>
                                基本语法:
                                <ul>
                                    <li>
                                        <Text code>$type</Text>: 定义数据类型，可以是 "string",
                                        "number", "boolean", "array", "object"
                                    </li>
                                    <li>
                                        <Text code>$pk</Text>:
                                        定义对象的主键属性名，用于识别同一对象
                                    </li>
                                    <li>
                                        <Text code>$fields</Text>: 定义对象的子字段结构
                                    </li>
                                    <li>
                                        <Text code>$item</Text>: 定义数组的子项结构
                                    </li>
                                </ul>
                            </Paragraph>
                        </div>
                    }
                    style={{ marginBottom: 16 }}
                />

                <TextArea
                    value={schema}
                    onChange={handleSchemaChange}
                    rows={12}
                    placeholder="请输入JSON格式的数据模型定义"
                    style={{ fontFamily: 'monospace', marginBottom: 16 }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Space>
                        <Button type="primary" onClick={onNext} icon={<RightOutlined />}>
                            下一步：编辑数据
                        </Button>
                    </Space>
                </div>
            </Card>
        </div>
    );
};

export default SchemaEditSection;
