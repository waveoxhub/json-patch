import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { Layout, SceneKey } from './components/layout';
import ValidatePage from './pages/ValidatePage';
import GeneratePage from './pages/GeneratePage';
import ConflictPage from './pages/ConflictPage';
import ApplyPage from './pages/ApplyPage';

const renderScene = (scene: SceneKey): React.ReactNode => {
    switch (scene) {
        case 'validate':
            return <ValidatePage />;
        case 'generate':
            return <GeneratePage />;
        case 'conflict':
            return <ConflictPage />;
        case 'apply':
            return <ApplyPage />;
        default:
            return <ValidatePage />;
    }
};

function App(): React.ReactElement {
    return (
        <ThemeProvider>
            <Layout>
                {(activeScene) => renderScene(activeScene)}
            </Layout>
        </ThemeProvider>
    );
}

export default App;
