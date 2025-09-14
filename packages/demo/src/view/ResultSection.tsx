import React from 'react';
import { Card, Button, Divider, Space, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import JsonEditor from '../components/JsonEditor';
import { usePatchContext } from '../context/PatchContext';

const { Text } = Typography;

/**
 * 结果展示部分组件，显示补丁应用后的结果
 */
const ResultSection: React.FC = () => {
    const { sourceJson, resultJson, error, resetWorkflow } = usePatchContext();

    if (!resultJson) {
        return (
            <div className="result-empty">
                <Text>尚未应用补丁，请先生成并应用补丁。</Text>
            </div>
        );
    }

    return (
        <div className="result-section">
            <Card
                title="补丁应用结果"
                className="result-card"
                bordered={false}
                style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}
            >
                <Typography>
                    <Text>以下是应用补丁后的结果。您可以比较源JSON和结果JSON之间的差异。</Text>
                </Typography>

                <Divider orientation="left" style={{ margin: '24px 0 16px' }}>
                    源数据
                </Divider>
                <JsonEditor
                    value={sourceJson}
                    onChange={() => {}}
                    readOnly={true}
                    height="200px"
                    title="源JSON"
                />

                <Divider orientation="left" style={{ margin: '24px 0 16px' }}>
                    应用补丁后的结果
                </Divider>
                <JsonEditor
                    value={resultJson}
                    onChange={() => {}}
                    readOnly={true}
                    height="200px"
                    title="结果JSON"
                />

                {error && (
                    <div
                        className="error-message"
                        style={{
                            marginTop: '16px',
                            padding: '8px 12px',
                            backgroundColor: '#fff2f0',
                            borderRadius: '4px',
                        }}
                    >
                        <Text type="danger">{error}</Text>
                    </div>
                )}

                <Divider style={{ margin: '24px 0' }} />

                <div className="actions">
                    <Space>
                        <Button
                            type="primary"
                            onClick={resetWorkflow}
                            icon={<ReloadOutlined />}
                            size="middle"
                        >
                            重新开始
                        </Button>
                    </Space>
                </div>
            </Card>
        </div>
    );
};

export default ResultSection;
