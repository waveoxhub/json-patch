import React from 'react';
import { Tag, Tooltip, Space } from 'antd';
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
        <Space size="small">
            <Tag color="green" icon={<SaveOutlined />}>
                已保存
            </Tag>

            {lastSavedTime && (
                <Tooltip title={`最后保存时间: ${lastSavedTime.toLocaleString('zh-CN')}`}>
                    <Tag color="blue" icon={<ClockCircleOutlined />}>
                        {formatTime(lastSavedTime)}
                    </Tag>
                </Tooltip>
            )}

            <Tooltip title="清除所有保存的数据">
                <Tag
                    color="red"
                    icon={<DeleteOutlined />}
                    style={{ cursor: 'pointer' }}
                    onClick={clearStoredData}
                >
                    清除数据
                </Tag>
            </Tooltip>
        </Space>
    );
};

export default DataStatusIndicator;
