import React, { useState, useEffect } from 'react';
import { Card, Button, List, Radio, Space, Divider, Input, Typography, Empty, Tag } from 'antd';
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
        patches,
    } = usePatchContext();

    const [customValues, setCustomValues] = useState<Record<string, string>>({});
    const [customPaths, setCustomPaths] = useState<Record<string, string>>({});

    // 调试信息（仅在开发环境输出）
    useEffect(() => {
        if (import.meta.env.DEV) {
            console.log('冲突数据:', conflicts);
            console.log('解决方案:', conflictResolutions);
            console.log('补丁数据:', patches);
        }
    }, [conflicts, conflictResolutions, patches]);

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
                <div className="flex flex-col gap-6 w-full">
                    <div className="conflict-intro">
                        <Paragraph>
                            以下是检测到的冲突。对于每个冲突的路径，请选择一个解决方案。
                        </Paragraph>
                    </div>

                    <List
                        dataSource={conflicts}
                        renderItem={(conflict, index) => {
                            const { path, options } = conflict;
                            const selectedHash = conflictResolutions.find(
                                res => res.path === path
                            )?.selectedHash;

                            return (
                                <List.Item className="conflict-item">
                                    <div className="conflict-content w-full">
                                        <Title level={5}>
                                            冲突 {index + 1}: {path}
                                        </Title>

                                        <Divider orientation="left">选择一个解决方案</Divider>

                                        <Radio.Group
                                            onChange={e =>
                                                handleConflictResolution(path, e.target.value)
                                            }
                                            value={selectedHash}
                                            className="resolution-options"
                                        >
                                            <div className="flex flex-col gap-4 w-full">
                                                {options &&
                                                    options.map(hash => {
                                                        const patch = findPatchByHash(hash);
                                                        return (
                                                            <Radio
                                                                key={hash}
                                                                value={hash}
                                                            >
                                                                <div className="resolution-option rounded-md border border-gray-200 bg-gray-50 p-3 hover:bg-gray-100">
                                                                    <div className="mb-2">
                                                                        <Text strong>
                                                                            {getTargetLabelFromHash(
                                                                                hash,
                                                                                patches
                                                                            )}
                                                                        </Text>
                                                                        <Tag color="blue" style={{ marginLeft: '8px' }}>
                                                                            hash: {hash.substring(0, 8)}
                                                                        </Tag>
                                                                        {patch && (
                                                                            <>
                                                                                <Tag color="green" style={{ marginLeft: '8px' }}>
                                                                                    {patch.op}
                                                                                </Tag>
                                                                                <Tag color="purple" style={{ marginLeft: '8px' }}>
                                                                                    路径: {patch.path}
                                                                                </Tag>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                    <div className="value-display">
                                                                        <Text type="secondary">
                                                                            值:
                                                                        </Text>
                                                                        <pre>
                                                                            {getConflictValueDisplay(
                                                                                patch?.value
                                                                            )}
                                                                        </pre>
                                                                    </div>
                                                                </div>
                                                            </Radio>
                                                        );
                                                    })}

                                                <Radio value="custom">
                                                    <div className="custom-resolution rounded-md border border-dashed border-gray-300 p-3 bg-white">
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
                                                                    value={
                                                                        customValues[index] || ''
                                                                    }
                                                                    onChange={e =>
                                                                        handleCustomInputChange(
                                                                            index,
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    rows={4}
                                                                    placeholder="输入自定义JSON值"
                                                                    style={{ fontFamily: 'monospace', marginTop: 4 }}
                                                                />
                                                            </div>
                                                            <Button
                                                                size="small"
                                                                onClick={() =>
                                                                    applyCustomValue(index)
                                                                }
                                                                disabled={!customValues[index]}
                                                            >
                                                                应用自定义值
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </Radio>
                                            </div>
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
                </div>
            </Card>
        </div>
    );
};

export default ConflictResolutionSection;
