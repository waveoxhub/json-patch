import React, { useState } from 'react';
import Sidebar, { SceneKey } from './Sidebar';

interface LayoutProps {
    children: (activeScene: SceneKey) => React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const [activeScene, setActiveScene] = useState<SceneKey>('validate');

    return (
        <div className="app-layout">
            <Sidebar activeScene={activeScene} onSceneChange={setActiveScene} />
            <main className="main-content">
                {children(activeScene)}
            </main>
        </div>
    );
};

export default Layout;
