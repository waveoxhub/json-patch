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

    // 检测冲突
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

            // 初始化选择：每个冲突默认选第一个选项
            const initRes: ConflictResolutions = detected.map(c => ({
                path: c.path,
                selectedHash: c.options[0]?.hash || '',
            }));
            setResolutions(initRes);

            // 如果无冲突，直接合并
            if (detected.length === 0) {
                setResolvedPatches(groups.flat());
            } else {
                updateResolved(groups, detected, initRes);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : '检测失败');
        }
    }, [patchGroups]);

    // 更新解决后的补丁
    const updateResolved = (groups: Patch[][], conflicts: ConflictDetail[], res: ConflictResolutions) => {
        try {
            const result = generateResolvedPatch(groups, conflicts, res, []);
            setResolvedPatches([...result.resolvedPatches]);
        } catch (e) {
            console.error(e);
        }
    };

    // 选择冲突解决方案
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
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title"><GitMerge size={20} /> 冲突检测</h1>
                    <p className="page-description">检测多组补丁之间的路径冲突，选择解决方案</p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={loadExample}>加载示例</button>
            </div>

            <div className="card schema-card">
                <div className="card-header">Schema</div>
                <div className="card-body">
                    <JsonEditor value={schemaInput} onChange={setSchemaInput} height="120px" placeholder="输入 Schema..." />
                </div>
            </div>

            {/* 补丁组区域 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>补丁组</span>
                <button className="btn btn-secondary btn-sm" onClick={addPatchGroup}>
                    <Plus size={12} /> 添加
                </button>
            </div>

            <div className="grid-2">
                {patchGroups.map((group, index) => (
                    <div key={index} className="card">
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>组 {index + 1}</span>
                            {patchGroups.length > 2 && (
                                <button
                                    className="btn btn-sm"
                                    style={{ color: 'var(--color-error)', padding: 4 }}
                                    onClick={() => removePatchGroup(index)}
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                        <div className="card-body">
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

            <div className="action-bar">
                <button className="btn btn-primary btn-lg" onClick={detect} disabled={!canDetect}>
                    <Zap size={16} /> 检测冲突
                </button>
            </div>

            {error && (
                <div className="card result-card error">
                    <div className="card-body" style={{ color: 'var(--color-error)' }}>{error}</div>
                </div>
            )}

            {/* 冲突列表 - 可选择 */}
            {conflicts.length > 0 && (
                <div className="card result-card warning">
                    <div className="card-header">
                        <span className="badge badge-warning"><AlertTriangle size={10} /> 检测到 {conflicts.length} 个冲突</span>
                        <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--color-text-muted)' }}>点击选择解决方案</span>
                    </div>
                    <div className="card-body">
                        {conflicts.map((conflict, cIndex) => (
                            <div key={cIndex} className="conflict-section">
                                <div style={{ marginBottom: 8, fontSize: 13 }}>
                                    <code className="code">{conflict.path}</code>
                                    {conflict.reason && (
                                        <span style={{ marginLeft: 8, color: 'var(--color-text-muted)', fontSize: 11 }}>
                                            {conflict.reason}
                                        </span>
                                    )}
                                </div>
                                <div className="conflict-options">
                                    {conflict.options.map((option, oIndex) => {
                                        const isSelected = getSelectedHash(conflict.path) === option.hash;
                                        return (
                                            <button
                                                key={oIndex}
                                                className={`conflict-option ${isSelected ? 'selected' : ''}`}
                                                onClick={() => selectOption(conflict.path, option.hash)}
                                            >
                                                <div className="option-header">
                                                    <span className="option-group">组 {option.groupIndex + 1}</span>
                                                    {isSelected && <CheckCircle size={12} />}
                                                </div>
                                                <div className="option-content">
                                                    <span className="option-op">{option.patch.op}</span>
                                                    <span className="option-value">
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
                <div className="card result-card success">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="badge badge-success">
                                <CheckCircle size={10} /> {conflicts.length === 0 ? '无冲突' : '已解决'}
                            </span>
                            合并后的补丁 ({resolvedPatches.length})
                        </span>
                        <button className="btn btn-secondary btn-sm" onClick={copyResult}>
                            {copied ? <Check size={12} /> : <Copy size={12} />}
                            {copied ? '已复制' : '复制'}
                        </button>
                    </div>
                    <div className="card-body">
                        <div className="patch-list">
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
