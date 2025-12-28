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
        if (status === 'success') return <CheckCircle size={14} className="text-green-600 dark:text-green-400" />;
        if (status === 'error') return <XCircle size={14} className="text-red-600 dark:text-red-400" />;
        return <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400" />;
    };

    const allPassed = results.length > 0 && results.every(r => r.status === 'success');
    const hasErrors = results.some(r => r.status === 'error');
    const canValidate = jsonInput.trim() && patchInput.trim() && schemaInput.trim();

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto">
            {/* 页面头部 */}
            <div className="flex justify-between items-start mb-6 pb-4 border-b border-neutral-200 dark:border-neutral-700">
                <div>
                    <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                        <Shield size={20} /> 补丁验证
                    </h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">验证补丁结构和可应用性</p>
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
                    <JsonEditor value={schemaInput} onChange={setSchemaInput} height="120px" placeholder="输入 Schema..." modelPath="schema.json" />
                </div>
            </div>

            {/* 两列布局 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden bg-neutral-50 dark:bg-neutral-900">
                    <div className="px-3.5 py-2.5 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
                        目标 JSON
                    </div>
                    <div className="p-3">
                        <JsonEditor value={jsonInput} onChange={setJsonInput} height="160px" placeholder="输入要验证的 JSON..." />
                    </div>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden bg-neutral-50 dark:bg-neutral-900">
                    <div className="px-3.5 py-2.5 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
                        补丁数组
                    </div>
                    <div className="p-3">
                        <JsonEditor value={patchInput} onChange={setPatchInput} height="160px" placeholder="输入 JSON Patch 数组..." />
                    </div>
                </div>
            </div>

            {/* 操作栏 */}
            <div className="flex justify-center my-6">
                <button
                    className="px-6 py-3 text-sm font-medium rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity cursor-pointer flex items-center gap-2"
                    onClick={runValidation}
                    disabled={!canValidate}
                >
                    <Zap size={16} /> 执行验证
                </button>
            </div>

            {/* 结果卡片 */}
            {results.length > 0 && (
                <div className={`mt-4 rounded-lg border overflow-hidden bg-neutral-50 dark:bg-neutral-900 ${
                    allPassed ? 'border-green-500' : hasErrors ? 'border-red-500' : 'border-amber-500'
                }`}>
                    <div className={`px-3.5 py-2.5 text-xs font-medium uppercase tracking-wide border-b flex items-center gap-2 ${
                        allPassed
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-neutral-500 dark:text-neutral-400'
                            : hasErrors
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-neutral-500 dark:text-neutral-400'
                            : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-neutral-500 dark:text-neutral-400'
                    }`}>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                            allPassed
                                ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                                : hasErrors
                                ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                                : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
                        }`}>
                            {allPassed ? <><CheckCircle size={10} /> 全部通过</> :
                             hasErrors ? <><XCircle size={10} /> 存在错误</> :
                             <><AlertTriangle size={10} /> 部分警告</>}
                        </span>
                        验证结果
                    </div>
                    <div className="p-3">
                        <div className="flex flex-col gap-1.5">
                            {results.map((result, index) => (
                                <div key={index} className="flex justify-between items-center px-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-md text-sm">
                                    <span className="flex items-center gap-2">
                                        <StatusIcon status={result.status} />
                                        <strong className="font-medium">{result.item}</strong>
                                    </span>
                                    <span className={`text-xs ${
                                        result.status === 'success' ? 'text-green-600 dark:text-green-400' :
                                        result.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                                    }`}>
                                        {result.message}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {parsedPatches.length > 0 && (
                            <>
                                <div className="h-px bg-neutral-200 dark:bg-neutral-700 my-4" />
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                                    已解析的补丁 ({parsedPatches.length})
                                </p>
                                <div className="flex flex-col gap-0.5 max-h-[300px] overflow-y-auto">
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
