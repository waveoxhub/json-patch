import React, { useState, useCallback } from 'react';
import { Play, Zap, CheckCircle, Copy, Check } from 'lucide-react';
import { applyPatches, Schema, Patch } from '@waveox/schema-json-patch';
import JsonEditor from '../components/JsonEditor';
import PatchCard from '../components/PatchCard';
import { defaultSchemaData } from '../data/sampleJsonData';

const ApplyPage: React.FC = () => {
    const [jsonInput, setJsonInput] = useState('');
    const [patchInput, setPatchInput] = useState('');
    const [schemaInput, setSchemaInput] = useState(JSON.stringify(defaultSchemaData, null, 2));
    const [result, setResult] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [parsedPatches, setParsedPatches] = useState<Patch[]>([]);

    const apply = useCallback(() => {
        setError(null);
        setResult('');
        try {
            const schema: Schema = JSON.parse(schemaInput);
            const patches: Patch[] = JSON.parse(patchInput);
            setParsedPatches(patches);
            const applied = applyPatches(jsonInput, patches, schema);
            setResult(JSON.stringify(JSON.parse(applied), null, 2));
        } catch (e) {
            setError(e instanceof Error ? e.message : '应用失败');
            setParsedPatches([]);
        }
    }, [jsonInput, patchInput, schemaInput]);

    const loadExample = () => {
        // 原始 JSON - 符合 Schema 的数组结构
        setJsonInput(JSON.stringify([
            { id: "contact-1", name: "张三", phone: "13800138000", email: "zhang@test.com", tags: ["同事"], address: "北京" }
        ], null, 2));
        // 补丁 - 修改手机号和地址
        setPatchInput(JSON.stringify([
            { op: "replace", path: "/contact-1/phone", value: "13888888888", hash: "h1" },
            { op: "replace", path: "/contact-1/address", value: "北京市海淀区", hash: "h2" }
        ], null, 2));
        setSchemaInput(JSON.stringify(defaultSchemaData, null, 2));
    };

    const canApply = jsonInput.trim() && patchInput.trim() && schemaInput.trim();

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title"><Play size={20} /> 补丁应用</h1>
                    <p className="page-description">将补丁数组应用到 JSON 数据，根据 Schema 验证并查看结果</p>
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
                    <div className="card-header">原始 JSON</div>
                    <div className="card-body">
                        <JsonEditor value={jsonInput} onChange={setJsonInput} height="160px" placeholder="输入原始 JSON..." />
                    </div>
                </div>
                <div className="card">
                    <div className="card-header">补丁数组</div>
                    <div className="card-body">
                        <JsonEditor value={patchInput} onChange={setPatchInput} height="160px" placeholder="输入要应用的补丁..." />
                    </div>
                </div>
            </div>

            <div className="action-bar">
                <button className="btn btn-primary btn-lg" onClick={apply} disabled={!canApply}>
                    <Zap size={16} /> 应用补丁
                </button>
            </div>

            {error && (
                <div className="card result-card error">
                    <div className="card-body" style={{ color: 'var(--color-error)' }}>{error}</div>
                </div>
            )}

            {result && (
                <div className="card result-card success">
                    <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircle size={14} style={{ color: 'var(--color-success)' }} />
                        应用成功
                    </div>
                    <div className="card-body">
                        {parsedPatches.length > 0 && (
                            <>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: 12, margin: '0 0 8px' }}>
                                    应用了 {parsedPatches.length} 个补丁
                                </p>
                                <div className="patch-list" style={{ marginBottom: 16 }}>
                                    {parsedPatches.map((patch, index) => (
                                        <PatchCard key={patch.hash || index} patch={patch} index={index} />
                                    ))}
                                </div>
                                <div className="divider" />
                            </>
                        )}
                        <p style={{ color: 'var(--color-text-muted)', fontSize: 12, margin: '0 0 8px' }}>结果 JSON</p>
                        <JsonEditor value={result} onChange={() => {}} readOnly height="180px" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApplyPage;
