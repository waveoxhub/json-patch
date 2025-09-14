import React from 'react';
import { Card, Button, Space, Typography } from 'antd';
import { RightOutlined, InfoCircleOutlined } from '@ant-design/icons';
import JsonEditor from '../components/JsonEditor';
import { usePatchContext } from '../context/PatchContext';

const { Text, Paragraph } = Typography;

/**
 * Schema编辑部分组件，用于编辑JSON模型
 */
const SchemaEditSection: React.FC = () => {
    const { schemaString, updateSchema, error, setActiveTab } = usePatchContext();

    return (
        <div className="schema-edit-section">
            <Card
                title="数据模型定义"
                className="schema-card"
                extra={
                    <Button
                        type="primary"
                        onClick={() => setActiveTab('editor')}
                        icon={<RightOutlined />}
                        size="middle"
                    >
                        下一步
                    </Button>
                }
            >
                <Space direction="vertical" className="schema-content" size="large">
                    <div
                        style={{ backgroundColor: '#f0f7ff', padding: '12px', borderRadius: '6px' }}
                    >
                        <Paragraph style={{ marginBottom: '8px' }}>
                            <InfoCircleOutlined style={{ color: '#1677ff', marginRight: '8px' }} />
                            本模型用于告诉 <code>@waveox/schema-json-patch</code> 如何在 JSON
                            中“定位与解释”数据，以生成语义化路径、产出补丁，并在应用/冲突检测时做类型校验。
                        </Paragraph>

                        <Paragraph style={{ marginBottom: 0 }}>
                            <ul style={{ paddingLeft: 16, margin: 0 }}>
                                <li>
                                    根仅支持 <code>object</code> 或 <code>array</code>；对象通过{' '}
                                    <code>$fields</code> 描述子结构，数组通过 <code>$item</code>{' '}
                                    描述元素类型。
                                </li>
                                <li>
                                    当 <code>$item.$type === 'object'</code> 时，必须提供{' '}
                                    <code>$pk</code>{' '}
                                    作为对象数组的主键，补丁路径以主键而非索引定位元素（如：
                                    <code>/contacts/contact-1/email</code>）。
                                </li>
                                <li>仅对 Schema 覆盖的字段生成补丁；纯数组重排不会产生补丁。</li>
                                <li>
                                    补丁生成、应用以及冲突检测均依赖此
                                    Schema，请确保其与实际数据结构保持一致。
                                </li>
                            </ul>
                        </Paragraph>
                    </div>

                    <JsonEditor
                        value={schemaString}
                        onChange={updateSchema}
                        title="Schema JSON"
                        height="400px"
                        showSaveIndicator={true}
                    />

                    {error && error.includes('Schema') && (
                        <div
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

export default SchemaEditSection;
