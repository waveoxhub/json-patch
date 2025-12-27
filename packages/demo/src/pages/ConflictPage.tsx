import React, { useState, useCallback } from 'react';
import { GitMerge, Zap, Plus, Trash2, CheckCircle, AlertTriangle, Copy, Check } from 'lucide-react';
import {
    detectConflicts,
    generateResolvedPatch,
    Patch,
    ConflictDetail,
    ConflictResolutions,
} from '@waveox/schema-json-patch';
import JsonEditor from '../components/JsonEditor';
import PatchCard from '../components/PatchCard';
import { defaultSchemaData } from '../data/sampleJsonData';

const ConflictPage: React.FC = () => {
    const [schemaInput, setSchemaInput] = useState(JSON.stringify(defaultSchemaData, null, 2));
    const [patchGroups, setPatchGroups] = useState<string[]>(['', '']);
    const [conflicts, setConflicts] = useState<ConflictDetail[]>([]);
    const [resolutions, setResolutions] = useState<ConflictResolutions>([]);
    const [resolvedPatches, setResolvedPatches] = useState<Patch[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [parsedGroups, setParsedGroups] = useState<Patch[][]>([]);

    const addPatchGroup = () => setPatchGroups([...patchGroups, '']);

    const removePatchGroup = (index: number) => {
        if (patchGroups.length > 2) {
            setPatchGroups(patchGroups.filter((_, i) => i !== index));
        }
    };

    const updatePatchGroup = (index: number, value: string) => {
        const newGroups = [...patchGroups];
        newGroups[index] = value;
        setPatchGroups(newGroups);
    };

    const detect = useCallback(() => {
        setError(null);
        setConflicts([]);
        setResolvedPatches([]);
        setResolutions([]);

        try {
            const groups: Patch[][] = patchGroups.map(g => {
                const parsed = JSON.parse(g);
                if (!Array.isArray(parsed)) throw new Error('每组必须是数组');
                return parsed;
            });
            setParsedGroups(groups);

            const detected = detectConflicts(groups);
            setConflicts([...detected]);

            const initRes: ConflictResolutions = detected.map(c => ({
                path: c.path,
                selectedHash: c.options[0]?.hash || '',
            }));
            setResolutions(initRes);

            if (detected.length === 0) {
                setResolvedPatches(groups.flat());
            } else {
                updateResolved(groups, detected, initRes);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : '检测失败');
        }
    }, [patchGroups]);

    const updateResolved = (groups: Patch[][], conflictList: readonly ConflictDetail[], res: ConflictResolutions) => {
        try {
            const result = generateResolvedPatch(groups, [...conflictList], res, []);
            setResolvedPatches([...result.resolvedPatches]);
        } catch (e) {
            console.error(e);
        }
    };

    const selectOption = (conflictPath: string, hash: string) => {
        const newRes = resolutions.map(r =>
            r.path === conflictPath ? { ...r, selectedHash: hash } : r
        );
        setResolutions(newRes);
        updateResolved(parsedGroups, conflicts, newRes);
    };

    const loadExample = () => {
        setSchemaInput(JSON.stringify(defaultSchemaData, null, 2));
        setPatchGroups([
            JSON.stringify([
                { op: "replace", path: "/version", value: "2.0.0", hash: "g1h1" },
                { op: "replace", path: "/name", value: "项目A", hash: "g1h2" },
            ], null, 2),
            JSON.stringify([
                { op: "replace", path: "/version", value: "3.0.0", hash: "g2h1" },
                { op: "add", path: "/description", value: "描述", hash: "g2h2" },
            ], null, 2),
        ]);
    };

    const copyResult = async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(resolvedPatches, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {}
    };

    const canDetect = schemaInput.trim() && patchGroups.every(g => g.trim());

    const getSelectedHash = (path: string) => {
        return resolutions.find(r => r.path === path)?.selectedHash || '';
    };

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto">
            {/* 页面头部 */}
            <div className="flex justify-between items-start mb-6 pb-4 border-b border-neutral-200 dark:border-neutral-700">
                <div>
                    <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                        <GitMerge size={20} /> 冲突检测
                    </h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">检测多组补丁之间的路径冲突，选择解决方案</p>
                </div>
                <button
                    className="px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-200 dark:border-neutral-700 bg-transparent text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    onClick={loadExample}
                >
                    加载示例
                </button>
            </div>

            {/* Schema 卡片 */}
            <div className="mb-4 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden bg-neutral-50 dark:bg-neutral-900">
                <div className="px-3.5 py-2.5 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
                    Schema
                </div>
                <div className="p-3">
                    <JsonEditor value={schemaInput} onChange={setSchemaInput} height="120px" placeholder="输入 Schema..." />
                </div>
            </div>

            {/* 补丁组区域 */}
            <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">补丁组</span>
                <button
                    className="px-2 py-1 text-xs font-medium rounded border border-neutral-200 dark:border-neutral-700 bg-transparent text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer inline-flex items-center gap-1"
                    onClick={addPatchGroup}
                >
                    <Plus size={12} /> 添加
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {patchGroups.map((group, index) => (
                    <div key={index} className="rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden bg-neutral-50 dark:bg-neutral-900">
                        <div className="px-3.5 py-2.5 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 flex justify-between items-center">
                            <span>组 {index + 1}</span>
                            {patchGroups.length > 2 && (
                                <button
                                    className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors cursor-pointer"
                                    onClick={() => removePatchGroup(index)}
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                        <div className="p-3">
                            <JsonEditor
                                value={group}
                                onChange={(v) => updatePatchGroup(index, v)}
                                height="140px"
                                placeholder="输入补丁数组..."
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* 操作栏 */}
            <div className="flex justify-center my-6">
                <button
                    className="px-6 py-3 text-sm font-medium rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity cursor-pointer flex items-center gap-2"
                    onClick={detect}
                    disabled={!canDetect}
                >
                    <Zap size={16} /> 检测冲突
                </button>
            </div>

            {/* 错误结果 */}
            {error && (
                <div className="mt-4 rounded-lg border border-red-500 overflow-hidden bg-neutral-50 dark:bg-neutral-900">
                    <div className="p-3 text-red-600 dark:text-red-400">{error}</div>
                </div>
            )}

            {/* 冲突列表 */}
            {conflicts.length > 0 && (
                <div className="mt-4 rounded-lg border border-amber-500 overflow-hidden bg-neutral-50 dark:bg-neutral-900">
                    <div className="px-3.5 py-2.5 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[11px] font-medium">
                            <AlertTriangle size={10} /> 检测到 {conflicts.length} 个冲突
                        </span>
                        <span className="ml-2 text-xs text-neutral-500 dark:text-neutral-400">点击选择解决方案</span>
                    </div>
                    <div className="p-3">
                        {conflicts.map((conflict, cIndex) => (
                            <div key={cIndex} className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-md mb-2 last:mb-0">
                                <div className="mb-2 text-sm">
                                    <code className="font-mono text-xs bg-white dark:bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100">
                                        {conflict.path}
                                    </code>
                                    {conflict.reason && (
                                        <span className="ml-2 text-xs text-neutral-500 dark:text-neutral-400">
                                            {conflict.reason}
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {conflict.options.map((option, oIndex) => {
                                        const isSelected = getSelectedHash(conflict.path) === option.hash;
                                        return (
                                            <button
                                                key={oIndex}
                                                className={`flex-1 min-w-[150px] p-2.5 rounded-md border text-left transition-all cursor-pointer ${
                                                    isSelected
                                                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                                        : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 hover:border-neutral-400 dark:hover:border-neutral-500'
                                                }`}
                                                onClick={() => selectOption(conflict.path, option.hash)}
                                            >
                                                <div className="flex justify-between items-center mb-1.5">
                                                    <span className={`text-[11px] font-medium uppercase ${
                                                        isSelected ? 'text-green-600 dark:text-green-400' : 'text-neutral-500 dark:text-neutral-400'
                                                    }`}>
                                                        组 {option.groupIndex + 1}
                                                    </span>
                                                    {isSelected && <CheckCircle size={12} className="text-green-600 dark:text-green-400" />}
                                                </div>
                                                <div className="text-xs">
                                                    <span className="font-mono text-neutral-500 dark:text-neutral-400 mr-2">{option.patch.op}</span>
                                                    <span className="text-neutral-900 dark:text-neutral-100 break-all">
                                                        {option.patch.value !== undefined 
                                                            ? (typeof option.patch.value === 'string' 
                                                                ? option.patch.value 
                                                                : JSON.stringify(option.patch.value))
                                                            : '(删除)'}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 解决后的补丁 */}
            {resolvedPatches.length > 0 && (
                <div className="mt-4 rounded-lg border border-green-500 overflow-hidden bg-neutral-50 dark:bg-neutral-900">
                    <div className="px-3.5 py-2.5 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800 flex justify-between items-center">
                        <span className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-[11px] font-medium">
                                <CheckCircle size={10} /> {conflicts.length === 0 ? '无冲突' : '已解决'}
                            </span>
                            合并后的补丁 ({resolvedPatches.length})
                        </span>
                        <button
                            className="px-2 py-1 text-xs font-medium rounded border border-neutral-200 dark:border-neutral-700 bg-transparent text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer inline-flex items-center gap-1"
                            onClick={copyResult}
                        >
                            {copied ? <Check size={12} /> : <Copy size={12} />}
                            {copied ? '已复制' : '复制'}
                        </button>
                    </div>
                    <div className="p-3">
                        <div className="flex flex-col gap-0.5 max-h-[300px] overflow-y-auto">
                            {resolvedPatches.map((patch, index) => (
                                <PatchCard key={patch.hash || index} patch={patch} index={index} />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConflictPage;
