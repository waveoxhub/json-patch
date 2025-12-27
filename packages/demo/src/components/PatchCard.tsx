import React from 'react';
import { Plus, Minus, RefreshCw, ArrowRight } from 'lucide-react';
import { Patch } from '@waveox/schema-json-patch';

interface PatchCardProps {
    patch: Patch;
    index: number;
}

const opConfig: Record<string, { icon: React.ComponentType<{ size: number; className?: string }>; label: string; color: string }> = {
    add: { icon: Plus, label: 'add', color: 'var(--color-success)' },
    remove: { icon: Minus, label: 'remove', color: 'var(--color-error)' },
    replace: { icon: RefreshCw, label: 'replace', color: 'var(--color-text-muted)' },
    move: { icon: ArrowRight, label: 'move', color: 'var(--color-warning)' },
    copy: { icon: Plus, label: 'copy', color: 'var(--color-success)' },
    test: { icon: RefreshCw, label: 'test', color: 'var(--color-text-muted)' },
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
        <div className="patch-card">
            {/* 操作图标 */}
            <Icon size={14} style={{ color: config.color, flexShrink: 0 }} />
            
            {/* 操作类型 */}
            <span style={{ 
                color: config.color,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                fontWeight: 500,
                width: 52,
                flexShrink: 0
            }}>
                {config.label}
            </span>
            
            {/* 路径 */}
            <code className="code" style={{ flexShrink: 0 }}>{patch.path}</code>
            
            {/* 值 */}
            {patch.value !== undefined && (
                <span style={{ 
                    color: 'var(--color-text-muted)', 
                    fontSize: 12,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                    minWidth: 0
                }}>
                    = {formatValue(patch.value)}
                </span>
            )}
            
            {/* Hash */}
            {patch.hash && (
                <span style={{ 
                    color: 'var(--color-text-muted)', 
                    fontSize: 10, 
                    fontFamily: 'var(--font-mono)',
                    flexShrink: 0
                }}>
                    {patch.hash.slice(0, 8)}
                </span>
            )}
        </div>
    );
};

export default PatchCard;
