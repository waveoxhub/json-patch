import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
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
  CustomResolution,
} from '@waveox/schema-json-patch';
import { defaultSchemaData, original, version1, version2 } from '../data/sampleJsonData';
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
  conflictResult: ConflictResult;
  conflictResolutions: ConflictResolutions;
  customResolutions: CustomResolution[];
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
  const [conflictResult, setConflictResult] = useState<ConflictResult>({
    hasConflicts: false,
    conflicts: [],
    resolvedPatches: [],
  });
  const [conflictResolutions, setConflictResolutions] = useState<ConflictResolutions>([]);
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
          console.log(`目标 ${index + 1} 生成的补丁:`, JSON.stringify(generatedPatches, null, 2));
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
      const conflicts = detectConflicts(patches);
      console.log('检测到的冲突:', JSON.stringify(conflicts, null, 2));

      // 处理冲突结果
      const result = processConflicts(patches, conflicts);
      console.log('处理后的冲突结果:', JSON.stringify(result, null, 2));
      setConflictResult(result);

      if (!result.hasConflicts) {
        // 没有冲突，直接应用补丁
        applyAllPatches(result.resolvedPatches);
        return;
      }

      // 初始化冲突解决方案（默认选择第一个选项）
      const initialResolutions = initializeResolutions(conflicts);
      console.log('初始化的冲突解决方案:', JSON.stringify(initialResolutions, null, 2));
      setConflictResolutions(initialResolutions);

      // 切换到冲突解决界面
      setActiveTab('conflicts');
    } catch (err) {
      setError(err instanceof Error ? err.message : '检测冲突失败');
    }
  }, [patches]);

  // 应用所有补丁
  const applyAllPatches = useCallback((patchesToApply: ReadonlyArray<Patch>) => {
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
  }, [sourceJson, schema]);

  // 选择冲突解决方案
  const handleConflictResolution = useCallback((path: string, selectedHash: string) => {
    // 更新冲突解决方案
    setConflictResolutions(prevResolutions => {
      const newResolutions = prevResolutions.filter(res => res.path !== path);
      newResolutions.push({
        path,
        selectedHash
      });
      return newResolutions;
    });

    // 如果不是自定义选项，移除该路径的自定义解决方案（如果有的话）
    setCustomResolutions(prev =>
      prev.filter(item => item.path !== path)
    );
  }, []);

  // 处理自定义解决方案
  const handleCustomResolution = useCallback((conflictIndex: number, customValue: any) => {
    const conflict = conflictResult.conflicts[conflictIndex];
    if (!conflict) return;

    // 创建自定义解决方案补丁
    const customPatch: Patch = {
      op: 'replace', // 默认使用替换操作
      path: conflict.path,
      value: customValue,
      hash: `custom-${conflict.path}-${Date.now()}` // 生成唯一的哈希值
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
  }, [conflictResult.conflicts]);

  // 应用冲突解决方案
  const applyResolutions = useCallback(() => {
    try {
      // 生成解决方案后的补丁
      const resolvedResult = generateResolvedPatch(
        patches,
        conflictResult.conflicts,
        conflictResolutions,
        customResolutions
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
  }, [patches, conflictResult.conflicts, conflictResolutions, customResolutions, applyAllPatches]);

  // 重置工作流
  const resetWorkflow = useCallback(() => {
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
    setConflictResolutions([]);
    setCustomResolutions([]);
    setResultJson('');
    setError(null);
    setActiveTab('schema');
  }, []);

  // 加载示例数据
  const loadExampleData = useCallback(() => {
    try {
      // 直接使用导入的示例数据
      setSourceJson(original);
      setTargetJsons([version1, version2]);
      setActiveTargetIndex(0);
      setError(null);
    } catch (err) {
      setError(`加载示例数据失败: ${err instanceof Error ? err.message : '未知错误'}`);
    }
  }, []);

  // 添加目标JSON
  const addTargetJson = useCallback(() => {
    setTargetJsons([...targetJsons, '']);
  }, [targetJsons]);

  // 更新目标JSON
  const updateTargetJson = useCallback((index: number, value: string) => {
    const newTargetJsons = [...targetJsons];
    newTargetJsons[index] = value;
    setTargetJsons(newTargetJsons);
  }, [targetJsons]);

  // 移除目标JSON
  const removeTargetJson = useCallback((index: number) => {
    if (targetJsons.length <= 1) {
      return; // 至少保留一个目标
    }
    
    const newTargetJsons = targetJsons.filter((_, i) => i !== index);
    setTargetJsons(newTargetJsons);
    
    // 如果当前活动目标被删除，调整活动目标索引
    if (activeTargetIndex >= index && activeTargetIndex > 0) {
      setActiveTargetIndex(activeTargetIndex - 1);
    }
  }, [targetJsons, activeTargetIndex]);

  const contextValue: PatchContextType = {
    sourceJson,
    setSourceJson,
    targetJsons,
    activeTargetIndex,
    addTargetJson,
    updateTargetJson,
    removeTargetJson,
    setActiveTargetIndex,
    schema,
    schemaString,
    updateSchema,
    patches,
    patchStrings,
    generatePatchesCallback,
    conflictResult,
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
  };

  return (
    <PatchContext.Provider value={contextValue}>
      {children}
    </PatchContext.Provider>
  );
};

// 自定义Hook，用于访问上下文
export const usePatchContext = (): PatchContextType => {
  const context = useContext(PatchContext);
  if (!context) {
    throw new Error('usePatchContext必须在PatchProvider内使用');
  }
  return context;
}; 