import React, { useState, useCallback } from 'react';
import { Shield, Zap, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import {
    validatePatches,
    validatePatchApplication,
    validateJson,
    Patch,
    Schema,
} from '@waveox/schema-json-patch';
import JsonEditor from '../components/JsonEditor';
import PatchCard from '../components/PatchCard';
import { defaultSchemaData } from '../data/sampleJsonData';

interface ValidationResult {
    item: string;
    status: 'success' | 'error' | 'warning';
    message: string;
}

const ValidatePage: React.FC = () => {
    const [jsonInput, setJsonInput] = useState('');
    const [patchInput, setPatchInput] = useState('');
    const [schemaInput, setSchemaInput] = useState(JSON.stringify(defaultSchemaData, null, 2));
    const [results, setResults] = useState<ValidationResult[]>([]);
    const [parsedPatches, setParsedPatches] = useState<Patch[]>([]);

    const runValidation = useCallback(() => {
        const newResults: ValidationResult[] = [];
        let patches: Patch[] = [];
        let schema: Schema = defaultSchemaData;

        // 验证 JSON
        const jsonResult = validateJson(jsonInput);
        newResults.push({
            item: 'JSON 格式',
            status: jsonResult.isValid ? 'success' : 'error',
            message: jsonResult.isValid ? '格式正确' : jsonResult.errors.join('; '),
        });

        // 验证 Schema
        try {
            schema = JSON.parse(schemaInput);
            newResults.push({ item: 'Schema 格式', status: 'success', message: '格式正确' });
        } catch (e) {
            newResults.push({
                item: 'Schema 格式',
                status: 'error',
                message: e instanceof Error ? e.message : '解析失败',
            });
        }

        // 验证补丁数组
        try {
            patches = JSON.parse(patchInput);
            if (!Array.isArray(patches)) throw new Error('补丁必须是数组');
            setParsedPatches(patches);
        } catch (e) {
            newResults.push({
                item: '补丁格式',
                status: 'error',
                message: e instanceof Error ? e.message : '解析失败',
            });
            setParsedPatches([]);
            setResults(newResults);
            return;
        }

        // 验证补丁结构
        const structureResult = validatePatches(patches);
        newResults.push({
            item: '补丁结构',
            status: structureResult.isValid ? 'success' : 'error',
            message: structureResult.isValid ? `${patches.length} 个补丁有效` : structureResult.errors.join('; '),
        });

        // 验证可应用性
        if (jsonResult.isValid && structureResult.isValid) {
            try {
                const appResult = validatePatchApplication(jsonInput, patches, schema);
                newResults.push({
                    item: '可应用性',
                    status: appResult.isValid ? 'success' : 'error',
                    message: appResult.isValid ? '所有补丁可成功应用' : appResult.errors.join('; '),
                });
            } catch (e) {
                newResults.push({
                    item: '可应用性',
                    status: 'error',
                    message: e instanceof Error ? e.message : '验证失败',
                });
            }
        }

        setResults(newResults);
    }, [jsonInput, patchInput, schemaInput]);

    const loadExample = () => {
        setJsonInput(JSON.stringify([
            { id: "contact-1", name: "张三", phone: "13800138000", email: "zhang@test.com", tags: ["同事"], address: "北京" }
        ], null, 2));
        setPatchInput(JSON.stringify([
            { op: "replace", path: "/contact-1/phone", value: "13888888888", hash: "h1" },
            { op: "add", path: "/contact-1/tags/-", value: "技术部", hash: "h2" }
        ], null, 2));
        setSchemaInput(JSON.stringify(defaultSchemaData, null, 2));
    };

    const StatusIcon = ({ status }: { status: string }) => {
        if (status === 'success') return <CheckCircle size={14} style={{ color: 'var(--color-success)' }} />;
        if (status === 'error') return <XCircle size={14} style={{ color: 'var(--color-error)' }} />;
        return <AlertTriangle size={14} style={{ color: 'var(--color-warning)' }} />;
    };

    const allPassed = results.length > 0 && results.every(r => r.status === 'success');
    const hasErrors = results.some(r => r.status === 'error');
    const canValidate = jsonInput.trim() && patchInput.trim() && schemaInput.trim();

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title"><Shield size={20} /> 补丁验证</h1>
                    <p className="page-description">验证补丁结构和可应用性</p>
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
                    <div className="card-header">目标 JSON</div>
                    <div className="card-body">
                        <JsonEditor value={jsonInput} onChange={setJsonInput} height="160px" placeholder="输入要验证的 JSON..." />
                    </div>
                </div>
                <div className="card">
                    <div className="card-header">补丁数组</div>
                    <div className="card-body">
                        <JsonEditor value={patchInput} onChange={setPatchInput} height="160px" placeholder="输入 JSON Patch 数组..." />
                    </div>
                </div>
            </div>

            <div className="action-bar">
                <button className="btn btn-primary btn-lg" onClick={runValidation} disabled={!canValidate}>
                    <Zap size={16} /> 执行验证
                </button>
            </div>

            {results.length > 0 && (
                <div className={`card result-card ${allPassed ? 'success' : hasErrors ? 'error' : 'warning'}`}>
                    <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`badge ${allPassed ? 'badge-success' : hasErrors ? 'badge-error' : 'badge-warning'}`}>
                            {allPassed ? <><CheckCircle size={10} /> 全部通过</> : 
                             hasErrors ? <><XCircle size={10} /> 存在错误</> : 
                             <><AlertTriangle size={10} /> 部分警告</>}
                        </span>
                        验证结果
                    </div>
                    <div className="card-body">
                        <div className="result-list">
                            {results.map((result, index) => (
                                <div key={index} className="result-item">
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <StatusIcon status={result.status} />
                                        <strong>{result.item}</strong>
                                    </span>
                                    <span style={{ 
                                        color: result.status === 'success' ? 'var(--color-success)' : 
                                               result.status === 'error' ? 'var(--color-error)' : 'var(--color-warning)',
                                        fontSize: 12
                                    }}>
                                        {result.message}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {parsedPatches.length > 0 && (
                            <>
                                <div className="divider" />
                                <p style={{ color: 'var(--color-text-muted)', fontSize: 12, margin: '0 0 8px' }}>
                                    已解析的补丁 ({parsedPatches.length})
                                </p>
                                <div className="patch-list">
                                    {parsedPatches.map((patch, index) => (
                                        <PatchCard key={patch.hash || index} patch={patch} index={index} />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ValidatePage;
