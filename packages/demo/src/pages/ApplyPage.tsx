import React, { useState, useCallback } from 'react';
import { Play, Zap, CheckCircle } from 'lucide-react';
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
        setJsonInput(JSON.stringify([
            { id: "contact-1", name: "张三", phone: "13800138000", email: "zhang@test.com", tags: ["同事"], address: "北京" }
        ], null, 2));
        setPatchInput(JSON.stringify([
            { op: "replace", path: "/contact-1/phone", value: "13888888888", hash: "h1" },
            { op: "replace", path: "/contact-1/address", value: "北京市海淀区", hash: "h2" }
        ], null, 2));
        setSchemaInput(JSON.stringify(defaultSchemaData, null, 2));
    };

    const canApply = jsonInput.trim() && patchInput.trim() && schemaInput.trim();

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto">
            {/* 页面头部 */}
            <div className="flex justify-between items-start mb-6 pb-4 border-b border-neutral-200 dark:border-neutral-700">
                <div>
                    <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                        <Play size={20} /> 补丁应用
                    </h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">将补丁数组应用到 JSON 数据，根据 Schema 验证并查看结果</p>
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
                        原始 JSON
                    </div>
                    <div className="p-3">
                        <JsonEditor value={jsonInput} onChange={setJsonInput} height="160px" placeholder="输入原始 JSON..." />
                    </div>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden bg-neutral-50 dark:bg-neutral-900">
                    <div className="px-3.5 py-2.5 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
                        补丁数组
                    </div>
                    <div className="p-3">
                        <JsonEditor value={patchInput} onChange={setPatchInput} height="160px" placeholder="输入要应用的补丁..." />
                    </div>
                </div>
            </div>

            {/* 操作栏 */}
            <div className="flex justify-center my-6">
                <button
                    className="px-6 py-3 text-sm font-medium rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity cursor-pointer flex items-center gap-2"
                    onClick={apply}
                    disabled={!canApply}
                >
                    <Zap size={16} /> 应用补丁
                </button>
            </div>

            {/* 错误结果 */}
            {error && (
                <div className="mt-4 rounded-lg border border-red-500 overflow-hidden bg-neutral-50 dark:bg-neutral-900">
                    <div className="p-3 text-red-600 dark:text-red-400">{error}</div>
                </div>
            )}

            {/* 成功结果 */}
            {result && (
                <div className="mt-4 rounded-lg border border-green-500 overflow-hidden bg-neutral-50 dark:bg-neutral-900">
                    <div className="px-3.5 py-2.5 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800 flex items-center gap-2">
                        <CheckCircle size={14} className="text-green-600 dark:text-green-400" />
                        应用成功
                    </div>
                    <div className="p-3">
                        {parsedPatches.length > 0 && (
                            <>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                                    应用了 {parsedPatches.length} 个补丁
                                </p>
                                <div className="flex flex-col gap-0.5 max-h-[300px] overflow-y-auto mb-4">
                                    {parsedPatches.map((patch, index) => (
                                        <PatchCard key={patch.hash || index} patch={patch} index={index} />
                                    ))}
                                </div>
                                <div className="h-px bg-neutral-200 dark:bg-neutral-700 my-4" />
                            </>
                        )}
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">结果 JSON</p>
                        <JsonEditor value={result} onChange={() => {}} readOnly height="180px" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApplyPage;
