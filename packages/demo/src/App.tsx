import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { Layout, SceneKey } from './components/layout';
import ValidatePage from './pages/ValidatePage';
import GeneratePage from './pages/GeneratePage';
import ConflictPage from './pages/ConflictPage';
import ApplyPage from './pages/ApplyPage';

function App(): React.ReactElement {
    const [activeScene, setActiveScene] = useState<SceneKey>('validate');

    return (
        <ThemeProvider>
            <Layout activeScene={activeScene} onSceneChange={setActiveScene}>
                {/* 使用 CSS display 控制显隐，保持组件状态不丢失 */}
                <div style={{ display: activeScene === 'validate' ? 'block' : 'none' }}>
                    <ValidatePage />
                </div>
                <div style={{ display: activeScene === 'generate' ? 'block' : 'none' }}>
                    <GeneratePage />
                </div>
                <div style={{ display: activeScene === 'conflict' ? 'block' : 'none' }}>
                    <ConflictPage />
                </div>
                <div style={{ display: activeScene === 'apply' ? 'block' : 'none' }}>
                    <ApplyPage />
                </div>
            </Layout>
        </ThemeProvider>
    );
}

export default App;
