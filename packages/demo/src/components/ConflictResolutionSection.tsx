import React, { useState, useEffect } from 'react';
import { Card, Button, List, Radio, Space, Divider, Input, Typography, Empty } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { usePatchContext } from '../context/PatchContext';
import { Patch } from '@waveox/schema-json-patch';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

/**
 * 从hash中匹配目标索引，返回对应的目标标签
 */
const getTargetLabelFromHash = (hash: string, patches: Patch[][]): string => {
  for (let i = 0; i < patches.length; i++) {
    const patchGroup = patches[i];
    if (patchGroup.some(patch => patch.hash === hash)) {
      return `目标 ${i + 1}`;
    }
  }
  return '未知';
};

/**
 * 冲突解决部分组件，用于解决补丁冲突
 */
const ConflictResolutionSection: React.FC = () => {
  const {
    conflicts,
    hasConflicts,
    conflictResolutions,
    handleConflictResolution,
    handleCustomResolution,
    applyResolutions,
    patches
  } = usePatchContext();

  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  
  // 调试信息
  useEffect(() => {
    console.log('冲突数据:', conflicts);
    console.log('解决方案:', conflictResolutions);
    console.log('补丁数据:', patches);
  }, [conflicts, conflictResolutions, patches]);

  if (!hasConflicts) {
    return (
      <div className="no-conflicts">
        <Empty
          description="没有检测到冲突"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }

  const handleCustomInputChange = (conflictIndex: number, value: string) => {
    setCustomValues(prev => ({
      ...prev,
      [conflictIndex]: value
    }));
  };

  const applyCustomValue = (conflictIndex: number) => {
    try {
      const value = customValues[conflictIndex];
      if (!value) return;

      const parsedValue = JSON.parse(value);
      handleCustomResolution(conflictIndex, parsedValue);
    } catch (err) {
      // 处理解析错误
      console.error('无法解析自定义值', err);
    }
  };

  const getConflictValueDisplay = (value: any) => {
    if (value === undefined) return '(未定义)';
    if (value === null) return 'null';
    
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  };

  // 查找给定哈希对应的补丁
  const findPatchByHash = (hash: string): Patch | undefined => {
    for (const patchGroup of patches) {
      for (const patch of patchGroup) {
        if (patch.hash === hash) {
          return patch;
        }
      }
    }
    return undefined;
  };

  return (
    <div className="conflict-resolution-section">
      <Card title="冲突解决" className="conflict-card">
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div className="conflict-intro">
            <Paragraph>
              以下是检测到的冲突。对于每个冲突的路径，请选择一个解决方案。
            </Paragraph>
          </div>

          <List
            dataSource={conflicts}
            renderItem={(conflict, index) => {
              const { path, options } = conflict;
              const selectedHash = conflictResolutions.find(res => res.path === path)?.selectedHash;
              
              return (
                <List.Item className="conflict-item">
                  <div className="conflict-content" style={{ width: '100%' }}>
                    <Title level={5}>冲突 {index + 1}: {path}</Title>
                    
                    <Divider orientation="left">选择一个解决方案</Divider>
                    
                    <Radio.Group
                      onChange={e => handleConflictResolution(path, e.target.value)}
                      value={selectedHash}
                      className="resolution-options"
                    >
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {options && options.map((hash, i) => {
                          const patch = findPatchByHash(hash);
                          return (
                            <Radio key={hash} value={hash} style={{ marginBottom: '16px' }}>
                              <div className="resolution-option">
                                <Text>{getTargetLabelFromHash(hash, patches)}:</Text>
                                <div className="value-display">
                                  <pre>{getConflictValueDisplay(patch?.value)}</pre>
                                </div>
                              </div>
                            </Radio>
                          );
                        })}
                        
                        <Radio value="custom" style={{ marginBottom: '8px' }}>
                          <div className="custom-resolution">
                            <Text>自定义值:</Text>
                            <TextArea
                              value={customValues[index] || ''}
                              onChange={e => handleCustomInputChange(index, e.target.value)}
                              rows={4}
                              placeholder="输入自定义JSON值"
                              style={{ fontFamily: 'monospace' }}
                            />
                            <Button 
                              size="small" 
                              onClick={() => applyCustomValue(index)}
                              disabled={!customValues[index]}
                            >
                              应用自定义值
                            </Button>
                          </div>
                        </Radio>
                      </Space>
                    </Radio.Group>
                  </div>
                </List.Item>
              );
            }}
          />

          <div className="actions">
            <Space>
              <Button
                type="primary"
                onClick={applyResolutions}
                icon={<CheckOutlined />}
              >
                应用解决方案
              </Button>
            </Space>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default ConflictResolutionSection;

