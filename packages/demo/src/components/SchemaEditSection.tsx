import React, { useEffect } from 'react';
import { Card, Button, Space, Typography } from 'antd';
import { RightOutlined, InfoCircleOutlined } from '@ant-design/icons';
import JsonEditor from './JsonEditor';
import { usePatchContext } from '../context/PatchContext';

const { Title, Text, Paragraph } = Typography;

/**
 * Schema编辑部分组件，用于编辑JSON模型
 */
const SchemaEditSection: React.FC = () => {
  const { 
    schemaString, 
    updateSchema, 
    error, 
    setActiveTab 
  } = usePatchContext();

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
          >
            下一步
          </Button>
        }
      >
        <Space direction="vertical" className="schema-content" size="large">
          <div>
            <Paragraph>
              <InfoCircleOutlined /> 请定义您的数据模型，用于指导补丁的生成和应用。
            </Paragraph>
            
            <Paragraph>
              模型描述了您的数据结构，包括主键、字段类型等信息，这些信息将用于更精确地生成和应用补丁。
            </Paragraph>
          </div>

          <JsonEditor
            value={schemaString}
            onChange={updateSchema}
            title="Schema JSON"
            height="400px"
          />
          
          {error && error.includes('Schema') && (
            <Text type="danger">{error}</Text>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default SchemaEditSection;
