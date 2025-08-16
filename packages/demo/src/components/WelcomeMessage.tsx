import React, { useState } from 'react';
import { Alert, Button } from 'antd';
import { InfoCircleOutlined, CloseOutlined } from '@ant-design/icons';
import { usePatchContext } from '../context/PatchContext';

/**
 * 欢迎提示组件，显示数据自动保存说明
 */
const WelcomeMessage: React.FC = () => {
    const { hasStoredData } = usePatchContext();
    const [isVisible, setIsVisible] = useState(!hasStoredData);

    if (!isVisible) {
        return null;
    }

    return (
        <Alert
            message="欢迎使用 Schema JSON Patch Demo"
            description={
                <div>
                    <p>✨ 您的所有输入数据都会自动保存到本地存储中</p>
                    <p>🔄 刷新页面后数据会自动恢复</p>
                    <p>🗑️ 您可以随时清除保存的数据</p>
                </div>
            }
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            action={
                <Button
                    size="small"
                    type="text"
                    icon={<CloseOutlined />}
                    onClick={() => setIsVisible(false)}
                >
                    知道了
                </Button>
            }
            style={{ marginBottom: '16px' }}
        />
    );
};

export default WelcomeMessage;
