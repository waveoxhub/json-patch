import React from 'react';
import { Plus, Minus, RefreshCw, ArrowRight } from 'lucide-react';
import { Patch } from '@waveox/schema-json-patch';

interface PatchCardProps {
    patch: Patch;
    index: number;
}

const opConfig: Record<string, { icon: React.ComponentType<{ size: number; className?: string }>; label: string; colorClass: string }> = {
    add: { icon: Plus, label: 'add', colorClass: 'text-green-600 dark:text-green-400' },
    remove: { icon: Minus, label: 'remove', colorClass: 'text-red-600 dark:text-red-400' },
    replace: { icon: RefreshCw, label: 'replace', colorClass: 'text-neutral-500 dark:text-neutral-400' },
    move: { icon: ArrowRight, label: 'move', colorClass: 'text-amber-600 dark:text-amber-400' },
    copy: { icon: Plus, label: 'copy', colorClass: 'text-green-600 dark:text-green-400' },
    test: { icon: RefreshCw, label: 'test', colorClass: 'text-neutral-500 dark:text-neutral-400' },
};

/**
 * 补丁可视化卡片 - 简洁行内设计
 */
const PatchCard: React.FC<PatchCardProps> = ({ patch }) => {
    const config = opConfig[patch.op] || opConfig.replace;
    const Icon = config.icon;

    const formatValue = (val: unknown): string => {
        if (val === undefined) return '';
        if (typeof val === 'string') return val.length > 40 ? val.slice(0, 40) + '…' : val;
        const str = JSON.stringify(val);
        return str.length > 40 ? str.slice(0, 40) + '…' : str;
    };

    return (
        <div className="flex items-center gap-2.5 px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md mb-1 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            {/* 操作图标 */}
            <Icon size={14} className={`flex-shrink-0 ${config.colorClass}`} />
            
            {/* 操作类型 */}
            <span className={`font-mono text-xs font-medium w-13 flex-shrink-0 ${config.colorClass}`}>
                {config.label}
            </span>
            
            {/* 路径 */}
            <code className="flex-shrink-0 font-mono text-xs bg-white dark:bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100">
                {patch.path}
            </code>
            
            {/* 值 */}
            {patch.value !== undefined && (
                <span className="text-xs text-neutral-500 dark:text-neutral-400 overflow-hidden text-ellipsis whitespace-nowrap flex-1 min-w-0">
                    = {formatValue(patch.value)}
                </span>
            )}
            
            {/* Hash */}
            {patch.hash && (
                <span className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 flex-shrink-0">
                    {patch.hash.slice(0, 8)}
                </span>
            )}
        </div>
    );
};

export default PatchCard;
