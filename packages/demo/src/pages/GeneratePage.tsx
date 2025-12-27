import React, { useState, useCallback } from 'react';
import { GitCompare, Zap, Copy, Check } from 'lucide-react';
import { generatePatches, Schema, Patch } from '@waveox/schema-json-patch';
import JsonEditor from '../components/JsonEditor';
import PatchCard from '../components/PatchCard';
import { defaultSchemaData, original, version1 } from '../data/sampleJsonData';

const GeneratePage: React.FC = () => {
    const [sourceJson, setSourceJson] = useState('');
    const [targetJson, setTargetJson] = useState('');
    const [schemaInput, setSchemaInput] = useState(JSON.stringify(defaultSchemaData, null, 2));
    const [generatedPatches, setGeneratedPatches] = useState<Patch[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const generate = useCallback(() => {
        setError(null);
        setGeneratedPatches([]);
        try {
            const schema: Schema = JSON.parse(schemaInput);
            const patches = generatePatches(schema, sourceJson, targetJson);
            setGeneratedPatches([...patches]);
        } catch (e) {
            setError(e instanceof Error ? e.message : '生成失败');
        }
    }, [sourceJson, targetJson, schemaInput]);

    const loadExample = () => {
        setSourceJson(original);
        setTargetJson(version1);
        setSchemaInput(JSON.stringify(defaultSchemaData, null, 2));
    };

    const copyPatches = async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(generatedPatches, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {}
    };

    const canGenerate = sourceJson.trim() && targetJson.trim() && schemaInput.trim();

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title"><GitCompare size={20} /> 补丁生成</h1>
                    <p className="page-description">对比源 JSON 和目标 JSON，根据 Schema 生成基于 Schema 的补丁数组</p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={loadExample}>加载示例</button>
            </div>

            <div className="card schema-card">
                <div className="card-header">Schema</div>
                <div className="card-body">
                    <JsonEditor value={schemaInput} onChange={setSchemaInput} height="120px" placeholder="输入 Schema..." />
                </div>
            </div>

            <div className="grid-2">
                <div className="card">
                    <div className="card-header">源 JSON</div>
                    <div className="card-body">
                        <JsonEditor value={sourceJson} onChange={setSourceJson} height="180px" placeholder="输入原始 JSON..." />
                    </div>
                </div>
                <div className="card">
                    <div className="card-header">目标 JSON</div>
                    <div className="card-body">
                        <JsonEditor value={targetJson} onChange={setTargetJson} height="180px" placeholder="输入修改后的 JSON..." />
                    </div>
                </div>
            </div>

            <div className="action-bar">
                <button className="btn btn-primary btn-lg" onClick={generate} disabled={!canGenerate}>
                    <Zap size={16} /> 生成补丁
                </button>
            </div>

            {error && (
                <div className="card result-card error">
                    <div className="card-body" style={{ color: 'var(--color-error)' }}>{error}</div>
                </div>
            )}

            {generatedPatches.length > 0 && (
                <div className="card result-card success">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>生成了 {generatedPatches.length} 个补丁</span>
                        <button className="btn btn-secondary btn-sm" onClick={copyPatches}>
                            {copied ? <Check size={12} /> : <Copy size={12} />}
                            {copied ? '已复制' : '复制'}
                        </button>
                    </div>
                    <div className="card-body">
                        <div className="patch-list">
                            {generatedPatches.map((patch, index) => (
                                <PatchCard key={patch.hash || index} patch={patch} index={index} />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GeneratePage;
