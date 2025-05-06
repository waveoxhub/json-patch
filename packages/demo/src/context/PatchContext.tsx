import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
    Patch,
    ConflictResolutions,
    ConflictDetail,
    Schema,
    generatePatches,
    applyPatches,
    detectConflicts,
    initializeResolutions,
    generateResolvedPatch,
    CustomConflictResolution,
    UnresolvedConflicts,
} from '@waveox/schema-json-patch';
import { defaultSchemaData, original, version1, version2, version3 } from '../data/sampleJsonData';
import { isValidJson } from '../utils/jsonUtils';

interface PatchContextType {
    // 源数据相关
    sourceJson: string;
    setSourceJson: (json: string) => void;

    // 目标数据相关
    targetJsons: string[];
    activeTargetIndex: number;
    addTargetJson: () => void;
    updateTargetJson: (index: number, json: string) => void;
    removeTargetJson: (index: number) => void;
    setActiveTargetIndex: (index: number) => void;

    // Schema相关
    schema: Schema;
    schemaString: string;
    updateSchema: (newSchemaString: string) => void;

    // 补丁相关
    patches: Patch[][];
    patchStrings: string[];
    generatePatchesCallback: () => void;

    // 冲突相关
    conflicts: Array<ConflictDetail>;
    hasConflicts: boolean;
    unresolvedConflicts: UnresolvedConflicts;
    resolvedPatches: Array<Patch>;
    conflictResolutions: ConflictResolutions;
    customResolutions: CustomConflictResolution[];
    checkForConflicts: () => void;
    handleConflictResolution: (path: string, selectedHash: string) => void;
    handleCustomResolution: (conflictIndex: number, customValue: any) => void;
    applyResolutions: () => void;

    // 结果相关
    resultJson: string;
    error: string | null;
    activeTab: string;
    setActiveTab: (tab: string) => void;

    // 其他操作
    resetWorkflow: () => void;
    loadExampleData: () => void;
}

// 创建上下文
const PatchContext = createContext<PatchContextType | undefined>(undefined);

// 提供者组件
export const PatchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // 源JSON
    const [sourceJson, setSourceJson] = useState<string>('');

    // 目标JSON列表
    const [targetJsons, setTargetJsons] = useState<string[]>(['']);
    const [activeTargetIndex, setActiveTargetIndex] = useState<number>(0);

    // 补丁相关数据
    const [patches, setPatches] = useState<Patch[][]>([]);
    const [patchStrings, setPatchStrings] = useState<string[]>([]);

    // 冲突相关
    const [hasConflicts, setHasConflicts] = useState<boolean>(false);
    const [conflicts, setConflicts] = useState<Array<ConflictDetail>>([]);
    const [unresolvedConflicts, setUnresolvedConflicts] = useState<UnresolvedConflicts>([]);
    const [resolvedPatches, setResolvedPatches] = useState<Array<Patch>>([]);
    const [conflictResolutions, setConflictResolutions] = useState<ConflictResolutions>([]);
    const [customResolutions, setCustomResolutions] = useState<CustomConflictResolution[]>([]);

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
    const updateSchema = useCallback((newSchemaString: string) => {
        try {
            const parsedSchema = JSON.parse(newSchemaString);
            setSchema(parsedSchema);
            setSchemaString(newSchemaString);
            setError(null);
        } catch (err) {
            setError(`Schema解析错误: ${err instanceof Error ? err.message : '未知错误'}`);
        }
    }, []);

    // 生成补丁
    const generatePatchesCallback = useCallback(() => {
        try {
            // 校验源JSON
            if (!isValidJson(sourceJson)) {
                setError('源JSON无效');
                return;
            }

            const newPatches: Patch[][] = [];
            const newPatchStrings: string[] = [];
            let hasError = false;

            // 为每个目标生成补丁
            targetJsons.forEach((targetJson, index) => {
                try {
                    // 校验目标JSON
                    if (!isValidJson(targetJson)) {
                        newPatches[index] = [];
                        newPatchStrings[index] = '';
                        return;
                    }

                    // 生成补丁
                    const generatedPatches = generatePatches(schema, sourceJson, targetJson);
                    console.log(
                        `目标 ${index + 1} 生成的补丁:`,
                        JSON.stringify(generatedPatches, null, 2)
                    );
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
    const checkForConflicts = useCallback(() => {
        try {
            // 检测补丁间的冲突
            const detectedConflicts = detectConflicts(patches);
            console.log('检测到的冲突:', JSON.stringify(detectedConflicts, null, 2));

            setConflicts([...detectedConflicts]);
            setHasConflicts(detectedConflicts.length > 0);

            if (detectedConflicts.length === 0) {
                // 没有冲突，直接应用补丁
                applyAllPatches(patches.flat());
                return;
            }

            // 初始化冲突解决方案（默认选择第一个选项）
            const initialResolutions = initializeResolutions(detectedConflicts);
            console.log('初始化的冲突解决方案:', JSON.stringify(initialResolutions, null, 2));
            setConflictResolutions(initialResolutions);

            // 生成初始结果
            const result = generateResolvedPatch(patches, detectedConflicts, initialResolutions);
            setUnresolvedConflicts([...result.unresolvedConflicts]);
            setResolvedPatches([...result.resolvedPatches]);

            // 切换到冲突解决界面
            setActiveTab('conflicts');
        } catch (err) {
            setError(err instanceof Error ? err.message : '检测冲突失败');
        }
    }, [patches]);

    // 应用所有补丁
    const applyAllPatches = useCallback(
        (patchesToApply: ReadonlyArray<Patch>) => {
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
        },
        [sourceJson, schema]
    );

    // 选择冲突解决方案
    const handleConflictResolution = useCallback((path: string, selectedHash: string) => {
        // 更新冲突解决方案
        setConflictResolutions(prevResolutions => {
            const newResolutions = prevResolutions.filter(res => res.path !== path);
            newResolutions.push({
                path,
                selectedHash,
            });
            return newResolutions;
        });

        // 如果不是自定义选项，移除该路径的自定义解决方案（如果有的话）
        setCustomResolutions(prev => prev.filter(item => item.path !== path));
    }, []);

    // 处理自定义解决方案
    const handleCustomResolution = useCallback(
        (conflictIndex: number, customValue: any) => {
            const conflict = conflicts[conflictIndex];
            if (!conflict) return;

            // 创建自定义解决方案补丁
            const customPatch: Patch = {
                op: 'replace', // 默认使用替换操作
                path: conflict.path,
                value: customValue,
                hash: `custom-${conflict.path}-${Date.now()}`, // 生成唯一的哈希值
            };

            // 更新自定义解决方案
            setCustomResolutions(prev => {
                // 移除此冲突路径的任何现有解决方案
                const filtered = prev.filter(item => item.path !== conflict.path);

                // 添加新的解决方案
                return [
                    ...filtered,
                    {
                        path: conflict.path,
                        patch: customPatch,
                    },
                ];
            });

            // 也移除该路径上的常规解决方案选择
            setConflictResolutions(prev => prev.filter(res => res.path !== conflict.path));
        },
        [conflicts]
    );

    // 应用解决方案
    const applyResolutions = useCallback(() => {
        try {
            if (conflicts.length === 0) {
                // 没有冲突，直接应用所有补丁
                applyAllPatches(patches.flat());
                return;
            }

            // 生成解决后的补丁集
            const result = generateResolvedPatch(
                patches,
                conflicts,
                conflictResolutions,
                customResolutions
            );

            // 更新未解决的冲突和解决后的补丁
            setUnresolvedConflicts([...result.unresolvedConflicts]);
            setResolvedPatches([...result.resolvedPatches]);

            if (result.unresolvedConflicts.length === 0) {
                // 所有冲突已解决，应用补丁
                applyAllPatches(result.resolvedPatches);
            } else {
                setError('仍有未解决的冲突');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '应用解决方案失败');
        }
    }, [patches, conflicts, conflictResolutions, customResolutions, applyAllPatches]);

    // 重置工作流
    const resetWorkflow = useCallback(() => {
        setSourceJson('');
        setTargetJsons(['']);
        setActiveTargetIndex(0);
        setPatches([]);
        setPatchStrings([]);
        setConflicts([]);
        setHasConflicts(false);
        setUnresolvedConflicts([]);
        setResolvedPatches([]);
        setConflictResolutions([]);
        setCustomResolutions([]);
        setResultJson('');
        setError(null);
        setActiveTab('schema');
    }, []);

    // 加载示例数据
    const loadExampleData = useCallback(() => {
        setSourceJson(original);
        setTargetJsons([version1, version2, version3]);
        setActiveTargetIndex(0);
        setActiveTab('editor');
    }, []);

    return (
        <PatchContext.Provider
            value={{
                sourceJson,
                setSourceJson,
                targetJsons,
                activeTargetIndex,
                addTargetJson: () => setTargetJsons([...targetJsons, '']),
                updateTargetJson: (index, json) => {
                    const newTargets = [...targetJsons];
                    newTargets[index] = json;
                    setTargetJsons(newTargets);
                },
                removeTargetJson: index => {
                    const newTargets = targetJsons.filter((_, i) => i !== index);
                    setTargetJsons(newTargets);
                    if (activeTargetIndex >= newTargets.length) {
                        setActiveTargetIndex(Math.max(0, newTargets.length - 1));
                    }
                },
                setActiveTargetIndex,
                schema,
                schemaString,
                updateSchema,
                patches,
                patchStrings,
                generatePatchesCallback,
                conflicts,
                hasConflicts,
                unresolvedConflicts,
                resolvedPatches,
                conflictResolutions,
                customResolutions,
                checkForConflicts,
                handleConflictResolution,
                handleCustomResolution,
                applyResolutions,
                resultJson,
                error,
                activeTab,
                setActiveTab,
                resetWorkflow,
                loadExampleData,
            }}
        >
            {children}
        </PatchContext.Provider>
    );
};

// 使用上下文的钩子
export const usePatchContext = (): PatchContextType => {
    const context = useContext(PatchContext);
    if (!context) {
        throw new Error('usePatchContext必须在PatchProvider内部使用');
    }
    return context;
};
