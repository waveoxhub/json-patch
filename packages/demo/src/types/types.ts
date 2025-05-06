import {
    Patch,
    ConflictResolutions,
    ConflictDetail,
    UnresolvedConflicts,
} from '@waveox/schema-json-patch';

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
    onCustomResolution: (conflictIndex: number, customValue: any) => void;
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
