import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Tabs } from 'antd';
import type { TabsProps } from 'antd';
import { EditOutlined, CheckOutlined, WarningOutlined, AppstoreOutlined } from '@ant-design/icons';
import {
    Patch,
    ConflictResolutions,
    ConflictResult,
    Schema,
    generatePatches,
    applyPatches,
    detectConflicts,
    processConflicts,
    initializeResolutions,
    generateResolvedPatch,
    ConflictDetail,
    CustomResolution,
} from '@waveox/schema-json-patch';
import JsonPatchEditor from './JsonPatchEditor';
import ConflictResolutionSection from './ConflictResolutionSection';
import ResultSection from './ResultSection';
import SchemaEditSection from './SchemaEditSection';
import { original, version1, version2, version3, defaultSchemaData } from '../data/sampleJsonData';

const { Title } = Typography;

/**
 * 补丁工作流组件，集成所有补丁操作功能到一个流程
 */
const JsonPatchDemo: React.FC = () => {
    // 源JSON
    const [sourceJson, setSourceJson] = useState<string>('');

    // 目标JSON列表
    const [targetJsons, setTargetJsons] = useState<string[]>(['']);
    const [activeTargetIndex, setActiveTargetIndex] = useState<number>(0);

    // 补丁相关数据
    const [patches, setPatches] = useState<Patch[][]>([]);
    const [patchStrings, setPatchStrings] = useState<string[]>([]);

    // 冲突相关
    const [conflictResult, setConflictResult] = useState<ConflictResult>({
        hasConflicts: false,
        conflicts: [],
        resolvedPatches: [],
    });
    const [conflictResolutions, setConflictResolutions] = useState<ConflictResolutions>({});

    // 添加自定义解决方案状态
    const [customResolutions, setCustomResolutions] = useState<CustomResolution[]>([]);

    // 结果相关
    const [resultJson, setResultJson] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>('schema');

    // 基础数据模型定义
    const defaultSchema: Schema = defaultSchemaData;

    const [schema, setSchema] = useState<Schema>(defaultSchema);
    const [schemaString, setSchemaString] = useState<string>(
        JSON.stringify(defaultSchema, null, 2)
    );

    // 更新Schema
    const updateSchema = (newSchemaString: string) => {
        try {
            const parsedSchema = JSON.parse(newSchemaString);
            setSchema(parsedSchema);
            setSchemaString(newSchemaString);
            setError(null);
        } catch (err) {
            setError(`Schema解析错误: ${err instanceof Error ? err.message : '未知错误'}`);
        }
    };

    // 生成补丁 - 使用useCallback包装
    const generatePatchesCallback = useCallback(() => {
        try {
            // 校验源JSON
            if (!sourceJson.trim()) {
                return;
            }

            JSON.parse(sourceJson);

            const newPatches: Patch[][] = [];
            const newPatchStrings: string[] = [];
            let hasError = false;

            // 为每个目标生成补丁
            targetJsons.forEach((targetJson, index) => {
                try {
                    // 校验目标JSON
                    if (!targetJson.trim()) {
                        newPatches[index] = [];
                        newPatchStrings[index] = '';
                        return;
                    }

                    JSON.parse(targetJson);

                    // 生成补丁
                    const generatedPatches = generatePatches(schema, sourceJson, targetJson);
                    newPatches[index] = [...generatedPatches];
                    newPatchStrings[index] = JSON.stringify(generatedPatches, null, 2);
                } catch (err) {
                    hasError = true;
                    newPatches[index] = [];
                    newPatchStrings[index] = '';
                    setError(
                        `目标 ${index + 1} 的补丁生成失败: ${err instanceof Error ? err.message : '未知错误'}`
                    );
                }
            });

            if (!hasError) {
                setPatches(newPatches);
                setPatchStrings(newPatchStrings);
                setError(null);
            } else {
                // 即使有错误也保存已成功生成的补丁
                setPatches(newPatches);
                setPatchStrings(newPatchStrings);
            }
        } catch (err) {
            setError(`源JSON无效: ${err instanceof Error ? err.message : '未知错误'}`);
        }
    }, [sourceJson, targetJsons, schema]);

    // 检测冲突
    const checkForConflicts = () => {
        try {
            // 检测补丁间的冲突
            const conflicts = detectConflicts(patches);

            // 处理冲突结果
            const result = processConflicts(patches, conflicts);
            setConflictResult(result);

            if (!result.hasConflicts) {
                // 没有冲突，直接应用补丁
                applyAllPatches(result.resolvedPatches);
                return;
            }

            // 初始化冲突解决方案（默认选择第一个选项）
            const initialResolutions = initializeResolutions(conflicts);
            setConflictResolutions(initialResolutions);

            // 切换到冲突解决界面
            setActiveTab('conflicts');
        } catch (err) {
            setError(err instanceof Error ? err.message : '检测冲突失败');
        }
    };

    // 应用所有补丁
    const applyAllPatches = (patchesToApply: ReadonlyArray<Patch>) => {
        try {
            if (!patchesToApply.length) {
                setError('没有有效的补丁可应用');
                return;
            }

            // 应用补丁
            const result = applyPatches(sourceJson, patchesToApply, schema);
            setResultJson(result);
            setError(null);
            setActiveTab('result');
        } catch (err) {
            setError(err instanceof Error ? err.message : '应用补丁失败');
        }
    };

    // 选择冲突解决方案
    const handleConflictResolution = (conflictIndex: number, resolution: number) => {
        const newResolutions = { ...conflictResolutions };
        newResolutions[conflictIndex.toString()] = resolution;
        setConflictResolutions(newResolutions);

        // 如果不是选择自定义，则移除该冲突的自定义解决方案（如果有的话）
        if (resolution !== -1) {
            setCustomResolutions(prev =>
                prev.filter(
                    item => !item.path.startsWith(conflictResult.conflicts[conflictIndex].path)
                )
            );
        }
    };

    // 处理自定义解决方案
    const handleCustomResolution = (conflictIndex: number, customValue: any) => {
        const conflict = conflictResult.conflicts[conflictIndex];
        if (!conflict) return;

        // 创建自定义解决方案补丁
        const customPatch: Patch = {
            op: 'replace', // 默认使用替换操作
            path: conflict.path,
            value: customValue,
        };

        // 更新自定义解决方案
        setCustomResolutions(prev => {
            // 移除此冲突路径的任何现有解决方案
            const filtered = prev.filter(item => !item.path.startsWith(conflict.path));

            // 添加新的解决方案
            return [
                ...filtered,
                {
                    path: conflict.path,
                    patch: customPatch,
                },
            ];
        });
    };

    // 应用冲突解决方案
    const applyResolutions = () => {
        try {
            // 生成解决方案后的补丁
            const resolvedResult = generateResolvedPatch(
                patches,
                conflictResult.conflicts,
                conflictResolutions,
                customResolutions // 传入自定义解决方案
            );

            if (resolvedResult.resolvedPatches.length === 0) {
                setError('解决冲突后没有有效的补丁可应用');
                return;
            }

            // 应用解决后的补丁
            applyAllPatches(resolvedResult.resolvedPatches);
        } catch (err) {
            setError(err instanceof Error ? err.message : '应用补丁失败');
        }
    };

    // 重置工作流
    const resetWorkflow = () => {
        setSourceJson('');
        setTargetJsons(['']);
        setActiveTargetIndex(0);
        setPatches([]);
        setPatchStrings([]);
        setConflictResult({
            hasConflicts: false,
            conflicts: [],
            resolvedPatches: [],
        });
        setConflictResolutions({});
        setCustomResolutions([]); // 重置自定义解决方案
        setResultJson('');
        setError(null);
        setSchemaString(JSON.stringify(defaultSchema, null, 2));
        setSchema(defaultSchema);
        setActiveTab('schema');
    };

    // 初始化示例数据
    useEffect(() => {
        setSchema(defaultSchema);
        setSchemaString(JSON.stringify(defaultSchema, null, 2));

        setSourceJson(original);
        setTargetJsons([version1, version2, version3]);
    }, [defaultSchema]);

    // 添加新的编辑项
    const addTargetJson = () => {
        setTargetJsons([...targetJsons, '']);
        setActiveTargetIndex(targetJsons.length);
    };

    // 更新目标JSON
    const updateTargetJson = (index: number, value: string) => {
        const newTargetJsons = [...targetJsons];
        newTargetJsons[index] = value;
        setTargetJsons(newTargetJsons);
    };

    // 删除目标JSON
    const removeTargetJson = (index: number) => {
        if (targetJsons.length <= 1) {
            return;
        }

        const newTargetJsons = [...targetJsons];
        newTargetJsons.splice(index, 1);
        setTargetJsons(newTargetJsons);

        // 同时删除对应的补丁
        const newPatches = [...patches];
        newPatches.splice(index, 1);
        setPatches(newPatches);

        const newPatchStrings = [...patchStrings];
        newPatchStrings.splice(index, 1);
        setPatchStrings(newPatchStrings);

        if (activeTargetIndex >= newTargetJsons.length) {
            setActiveTargetIndex(newTargetJsons.length - 1);
        }
    };

    // 构建标签页配置
    const tabItems: TabsProps['items'] = [
        {
            key: 'schema',
            label: (
                <span>
                    <AppstoreOutlined />
                    数据模型
                </span>
            ),
            children: (
                <SchemaEditSection
                    schema={schemaString}
                    onSchemaChange={updateSchema}
                    onNext={() => setActiveTab('edit')}
                />
            ),
        },
        {
            key: 'edit',
            label: (
                <span>
                    <EditOutlined />
                    编辑与预览
                </span>
            ),
            children: (
                <JsonPatchEditor
                    sourceJson={sourceJson}
                    targetJsons={targetJsons}
                    activeTargetIndex={activeTargetIndex}
                    onSourceChange={setSourceJson}
                    onTargetChange={updateTargetJson}
                    onTargetSelect={setActiveTargetIndex}
                    onTargetAdd={addTargetJson}
                    onTargetRemove={removeTargetJson}
                    onGeneratePatches={generatePatchesCallback}
                    onCheckForConflicts={checkForConflicts}
                    patchStrings={patchStrings}
                />
            ),
        },
        {
            key: 'conflicts',
            label: (
                <span>
                    <WarningOutlined />
                    冲突解决
                </span>
            ),
            children: (
                <ConflictResolutionSection
                    conflicts={conflictResult.conflicts.map((conflict: ConflictDetail) => ({
                        ...conflict,
                        patches: (conflict.patches || []) as Patch[],
                    }))}
                    resolutions={conflictResolutions}
                    onResolutionChange={handleConflictResolution}
                    onApply={applyResolutions}
                    onBack={() => setActiveTab('edit')}
                    targetLabels={targetJsons.map((_, index) => `目标 ${index + 1}`)}
                    customResolutions={customResolutions}
                    onCustomResolutionChange={handleCustomResolution}
                />
            ),
        },
        {
            key: 'result',
            label: (
                <span>
                    <CheckOutlined />
                    最终结果
                </span>
            ),
            children: <ResultSection result={resultJson} error={error} onReset={resetWorkflow} />,
        },
    ];

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2}>Schema JSON Patch 演示</Title>

            <Tabs
                activeKey={activeTab}
                items={tabItems}
                onChange={setActiveTab}
                destroyInactiveTabPane
            />
        </div>
    );
};

export default JsonPatchDemo;
