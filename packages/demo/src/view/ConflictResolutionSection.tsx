import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Divider, Input, Typography, Empty, Tag, Collapse } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { usePatchContext } from '../context/PatchContext';
import OptionSelect from '../components/OptionSelect';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

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
    } = usePatchContext();

    const [customValues, setCustomValues] = useState<Record<string, string>>({});
    const [customPaths, setCustomPaths] = useState<Record<string, string>>({});
    const [customErrors, setCustomErrors] = useState<Record<string, string | null>>({});

    // 调试信息（仅在开发环境输出）
    useEffect(() => {
        if (import.meta.env.DEV) {
            console.log('冲突数据:', conflicts);
            console.log('解决方案:', conflictResolutions);
        }
    }, [conflicts, conflictResolutions]);

    if (!hasConflicts) {
        return (
            <div className="no-conflicts">
                <Empty description="没有检测到冲突" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
        );
    }

    const handleCustomInputChange = (conflictIndex: number, value: string) => {
        setCustomValues(prev => ({
            ...prev,
            [conflictIndex]: value,
        }));

        // 实时校验 JSON
        if (!value.trim()) {
            setCustomErrors(prev => ({ ...prev, [conflictIndex]: null }));
            return;
        }
        try {
            JSON.parse(value);
            setCustomErrors(prev => ({ ...prev, [conflictIndex]: null }));
        } catch (e) {
            setCustomErrors(prev => ({ ...prev, [conflictIndex]: 'JSON格式错误' }));
        }
    };

    const handleCustomPathChange = (conflictIndex: number, path: string) => {
        setCustomPaths(prev => ({
            ...prev,
            [conflictIndex]: path,
        }));
    };

    const applyCustomValue = (conflictIndex: number) => {
        try {
            const value = customValues[conflictIndex];
            if (!value) return;

            const parsedValue = JSON.parse(value);
            const customPath = customPaths[conflictIndex];

            // 如果提供了自定义路径，则创建包含路径和值的对象
            if (customPath) {
                handleCustomResolution(conflictIndex, {
                    path: customPath,
                    value: parsedValue,
                });
            } else {
                // 否则使用原始冲突路径
                handleCustomResolution(conflictIndex, parsedValue);
            }
        } catch (err) {
            // 处理解析错误
            console.error('无法解析自定义值', err);
        }
    };

    const getConflictValueDisplay = (value: unknown) => {
        if (value === undefined) return '(未定义)';
        if (value === null) return 'null';
        try {
            return JSON.stringify(value, null, 2);
        } catch {
            return String(value);
        }
    };

    const getTargetLabel = (groupIndex: number): string => {
        return `目标 ${groupIndex + 1}`;
    };

    return (
        <div className="conflict-resolution-section">
            <Card title="冲突解决" className="conflict-card">
                <div className="flex flex-col gap-6 w-full">
                    <div className="conflict-intro">
                        <Paragraph>
                            以下是检测到的冲突。对于每个冲突的路径，请选择一个解决方案。
                        </Paragraph>
                    </div>

                    <Collapse
                        items={conflicts.map((conflict, index) => {
                            const { path, options } = conflict;
                            const selectedHash = conflictResolutions.find(
                                res => res.path === path
                            )?.selectedHash;

                            // 获取已选选项的标签（用于显示）
                            const selectedOption = options.find(opt => opt.hash === selectedHash);
                            const selectedLabel = selectedOption
                                ? getTargetLabel(selectedOption.groupIndex)
                                : undefined;

                            // 直接使用 options 生成选项
                            const resolutionOptions = options.map(option => ({
                                value: option.hash,
                                title: (
                                    <>
                                        <Text strong>{getTargetLabel(option.groupIndex)}</Text>
                                        <Tag color="blue" style={{ marginLeft: '8px' }}>
                                            hash: {option.hash.substring(0, 8)}
                                        </Tag>
                                        <Tag color="green" style={{ marginLeft: '8px' }}>
                                            {option.patch.op}
                                        </Tag>
                                        <Tag color="purple" style={{ marginLeft: '8px' }}>
                                            路径: {option.patch.path}
                                        </Tag>
                                    </>
                                ),
                                content: (
                                    <div className="value-display">
                                        <Text type="secondary">值:</Text>
                                        <pre>{getConflictValueDisplay(option.patch.value)}</pre>
                                    </div>
                                ),
                            }));

                            return {
                                key: String(index),
                                label: (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Text strong style={{ wordBreak: 'break-all' }}>
                                            {path}
                                        </Text>
                                        <Tag color="geekblue">选项 {resolutionOptions.length}</Tag>
                                        {selectedLabel && (
                                            <Tag color="green">已选 {selectedLabel}</Tag>
                                        )}
                                    </div>
                                ),
                                children: (
                                    <div className="conflict-content w-full">
                                        <Divider orientation="left">选择一个解决方案</Divider>
                                        <div className="resolution-options">
                                            <OptionSelect
                                                value={selectedHash}
                                                onChange={val =>
                                                    handleConflictResolution(path, val)
                                                }
                                                options={resolutionOptions}
                                            />

                                            {/* 自定义选项 */}
                                            <div
                                                className="custom-resolution rounded-md border border-dashed border-gray-300 p-3 bg-white"
                                                style={{ marginTop: 12 }}
                                            >
                                                <div className="flex flex-col gap-3 w-full">
                                                    <div>
                                                        <Text strong>自定义路径:</Text>
                                                        <Input
                                                            value={customPaths[index] || ''}
                                                            onChange={e =>
                                                                handleCustomPathChange(
                                                                    index,
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder={`输入自定义路径，留空则使用 ${path}`}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Text strong>自定义值:</Text>
                                                        <TextArea
                                                            value={customValues[index] || ''}
                                                            onChange={e =>
                                                                handleCustomInputChange(
                                                                    index,
                                                                    e.target.value
                                                                )
                                                            }
                                                            rows={4}
                                                            placeholder="输入自定义JSON值"
                                                            style={{
                                                                fontFamily: 'monospace',
                                                                marginTop: 4,
                                                            }}
                                                        />
                                                        {customErrors[index] && (
                                                            <div style={{ marginTop: 6 }}>
                                                                <Text type="danger">
                                                                    {customErrors[index]}
                                                                </Text>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <Button
                                                        size="small"
                                                        onClick={() => applyCustomValue(index)}
                                                        disabled={
                                                            !customValues[index] ||
                                                            !!customErrors[index]
                                                        }
                                                    >
                                                        应用自定义值
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ),
                            };
                        })}
                    />

                    <div className="actions actions--sticky">
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
                </div>
            </Card>
        </div>
    );
};

export default ConflictResolutionSection;
