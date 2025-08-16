import React from 'react';
import { Tooltip } from 'antd';
import { SaveOutlined, DeleteOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { usePatchContext } from '../context/PatchContext';

/**
 * 数据状态指示器组件，显示数据保存状态
 */
const DataStatusIndicator: React.FC = () => {
    const { hasStoredData, lastSavedTime, clearStoredData } = usePatchContext();

    if (!hasStoredData) {
        return null;
    }

    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (minutes < 1) return '刚刚';
        if (minutes < 60) return `${minutes}分钟前`;
        if (hours < 24) return `${hours}小时前`;
        if (days < 7) return `${days}天前`;

        return date.toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 rounded-md border border-green-300 bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
                <SaveOutlined />
                已保存
            </span>

            {lastSavedTime && (
                <Tooltip title={`最后保存时间: ${lastSavedTime.toLocaleString('zh-CN')}`}>
                    <span className="inline-flex items-center gap-1 rounded-md border border-blue-300 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                        <ClockCircleOutlined />
                        {formatTime(lastSavedTime)}
                    </span>
                </Tooltip>
            )}

            <Tooltip title="清除所有保存的数据">
                <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-red-50 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-100 active:bg-red-200 transition"
                    onClick={clearStoredData}
                >
                    <DeleteOutlined />
                    清除数据
                </button>
            </Tooltip>
        </div>
    );
};

export default DataStatusIndicator;
