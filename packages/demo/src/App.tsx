import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';

import JsonPatchDemo from './components/JsonPatchDemo';


function App() {
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
