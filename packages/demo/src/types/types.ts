import {
    Patch,
    ConflictResolutions,
    ConflictDetail,
    UnresolvedConflicts,
} from '@waveox/schema-json-patch';

/**
 * 自定义冲突输入类型
 * - 可以是直接替换的任意JSON值
 * - 或者是包含自定义路径与值的对象
 */
export type CustomResolutionInput = { path: string; value: unknown } | unknown;

/**
 * JSON补丁编辑器属性
 */
export interface JsonPatchEditorProps {
    sourceJson: string;
    targetJsons: string[];
    activeTargetIndex: number;
    onSourceChange: (value: string) => void;
    onTargetChange: (index: number, value: string) => void;
    onAddTarget: () => void;
    onRemoveTarget: (index: number) => void;
    onTargetSelect: (index: number) => void;
    generatePatches: () => void;
    error: string | null;
}

/**
 * 冲突解决部分属性
 */
export interface ConflictResolutionSectionProps {
    conflicts: Array<ConflictDetail>;
    hasConflicts: boolean;
    unresolvedConflicts: UnresolvedConflicts;
    resolvedPatches: Array<Patch>;
    conflictResolutions: ConflictResolutions;
    onResolutionSelect: (path: string, selectedHash: string) => void;
    onCustomResolution: (conflictIndex: number, customValue: CustomResolutionInput) => void;
    onApplyResolutions: () => void;
}

/**
 * 结果部分属性
 */
export interface ResultSectionProps {
    resultJson: string;
    error: string | null;
}

/**
 * Schema编辑部分属性
 */
export interface SchemaEditSectionProps {
    schema: string;
    onSchemaChange: (value: string) => void;
    error: string | null;
}

/**
 * JSON编辑器属性
 */
export interface JsonEditorProps {
    value: string;
    onChange: (value: string) => void;
    height?: string;
    placeholder?: string;
    readOnly?: boolean;
}

/**
 * 补丁预览部分属性
 */
export interface PatchPreviewSectionProps {
    patches: Patch[][];
    patchStrings: string[];
    activeTargetIndex: number;
    onCheckConflicts: () => void;
}
