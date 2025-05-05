import { ConfigProvider, App as AntApp } from 'antd';
import '@ant-design/v5-patch-for-react-19';
import zhCN from 'antd/locale/zh_CN';
import JsonPatchDemo from './components/JsonPatchDemo';
import React from 'react';

/**
 * 应用程序根组件
 */
function App(): React.ReactElement {
    return (
        <ConfigProvider locale={zhCN}>
            <AntApp>
                <div className="container">
                    <JsonPatchDemo />
                </div>
            </AntApp>
        </ConfigProvider>
    );
}

export default App;
