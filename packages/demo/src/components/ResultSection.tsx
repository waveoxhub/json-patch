import React from 'react';
import { Card, Button, Divider, Space, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import JsonEditor from './JsonEditor';
import { usePatchContext } from '../context/PatchContext';

const { Title, Text } = Typography;

/**
 * 结果展示部分组件，显示补丁应用后的结果
 */
const ResultSection: React.FC = () => {
  const { 
    sourceJson, 
    resultJson, 
    error, 
    resetWorkflow 
  } = usePatchContext();

  if (!resultJson) {
    return (
      <div className="result-empty">
        <Text>尚未应用补丁，请先生成并应用补丁。</Text>
      </div>
    );
  }

  return (
    <div className="result-section">
      <Card title="补丁应用结果" className="result-card">
        <Typography>
          <Text>
            以下是应用补丁后的结果。您可以比较源JSON和结果JSON之间的差异。
          </Text>
        </Typography>

        <Divider orientation="left">源数据</Divider>
        <JsonEditor
          value={sourceJson}
          onChange={() => {}}
          readOnly={true}
          height="200px"
        />

        <Divider orientation="left">应用补丁后的结果</Divider>
        <JsonEditor
          value={resultJson}
          onChange={() => {}}
          readOnly={true}
          height="200px"
        />

        {error && (
          <div className="error-message">
            <Text type="danger">{error}</Text>
          </div>
        )}

        <Divider />

        <div className="actions">
          <Space>
            <Button 
              type="primary" 
              onClick={resetWorkflow}
              icon={<ReloadOutlined />}
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
