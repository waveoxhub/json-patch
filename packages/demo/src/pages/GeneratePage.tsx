import React, { useState, useCallback } from 'react';
import { GitCompare, Zap, Copy, Check, Code, List } from 'lucide-react';
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
    const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');

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
        <div className="p-6 md:p-8 max-w-5xl mx-auto">
            {/* 页面头部 */}
            <div className="flex justify-between items-start mb-6 pb-4 border-b border-neutral-200 dark:border-neutral-700">
                <div>
                    <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                        <GitCompare size={20} /> 补丁生成
                    </h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">对比源 JSON 和目标 JSON，根据 Schema 生成基于 Schema 的补丁数组</p>
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
                    <JsonEditor value={schemaInput} onChange={setSchemaInput} height="120px" placeholder="输入 Schema..." modelPath="schema.json" defaultExpanded />
                </div>
            </div>

            {/* 两列布局 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden bg-neutral-50 dark:bg-neutral-900">
                    <div className="px-3.5 py-2.5 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
                        源 JSON
                    </div>
                    <div className="p-3">
                        <JsonEditor value={sourceJson} onChange={setSourceJson} height="180px" placeholder="输入原始 JSON..." />
                    </div>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden bg-neutral-50 dark:bg-neutral-900">
                    <div className="px-3.5 py-2.5 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
                        目标 JSON
                    </div>
                    <div className="p-3">
                        <JsonEditor value={targetJson} onChange={setTargetJson} height="180px" placeholder="输入修改后的 JSON..." />
                    </div>
                </div>
            </div>

            {/* 操作栏 */}
            <div className="flex justify-center my-6">
                <button
                    className="px-6 py-3 text-sm font-medium rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity cursor-pointer flex items-center gap-2"
                    onClick={generate}
                    disabled={!canGenerate}
                >
                    <Zap size={16} /> 生成补丁
                </button>
            </div>

            {/* 错误结果 */}
            {error && (
                <div className="mt-4 rounded-lg border border-red-500 overflow-hidden bg-neutral-50 dark:bg-neutral-900">
                    <div className="p-3 text-red-600 dark:text-red-400">{error}</div>
                </div>
            )}

            {/* 成功结果 */}
            {generatedPatches.length > 0 && (
                <div className="mt-4 rounded-lg border border-green-500 overflow-hidden bg-neutral-50 dark:bg-neutral-900">
                    <div className="px-3.5 py-2.5 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800 flex justify-between items-center">
                        <span>生成了 {generatedPatches.length} 个补丁</span>
                        <div className="flex items-center gap-2">
                            {/* 视图切换按钮 */}
                            <div className="flex rounded border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                                <button
                                    className={`px-2 py-1 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                                        viewMode === 'visual'
                                            ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100'
                                            : 'bg-transparent text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                    }`}
                                    onClick={() => setViewMode('visual')}
                                >
                                    <List size={12} />
                                    可视化
                                </button>
                                <button
                                    className={`px-2 py-1 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                                        viewMode === 'json'
                                            ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100'
                                            : 'bg-transparent text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                    }`}
                                    onClick={() => setViewMode('json')}
                                >
                                    <Code size={12} />
                                    JSON
                                </button>
                            </div>
                            {/* 复制按钮 */}
                            <button
                                className="px-2 py-1 text-xs font-medium rounded border border-neutral-200 dark:border-neutral-700 bg-transparent text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer inline-flex items-center gap-1"
                                onClick={copyPatches}
                            >
                                {copied ? <Check size={12} /> : <Copy size={12} />}
                                {copied ? '已复制' : '复制'}
                            </button>
                        </div>
                    </div>
                    <div className="p-3">
                        {viewMode === 'visual' ? (
                            <div className="flex flex-col gap-0.5 max-h-[300px] overflow-y-auto">
                                {generatedPatches.map((patch, index) => (
                                    <PatchCard key={patch.hash || index} patch={patch} index={index} />
                                ))}
                            </div>
                        ) : (
                            <pre className="font-mono text-xs bg-white dark:bg-neutral-950 p-3 rounded border border-neutral-200 dark:border-neutral-700 max-h-[300px] overflow-auto text-neutral-900 dark:text-neutral-100">
                                {JSON.stringify(generatedPatches, null, 2)}
                            </pre>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GeneratePage;
