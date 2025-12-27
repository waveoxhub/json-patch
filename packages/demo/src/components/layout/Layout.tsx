import React, { useState } from 'react';
import Sidebar, { SceneKey } from './Sidebar';

interface LayoutProps {
    children: (activeScene: SceneKey) => React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const [activeScene, setActiveScene] = useState<SceneKey>('validate');

    return (
        <div className="flex h-screen overflow-hidden bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
            <Sidebar activeScene={activeScene} onSceneChange={setActiveScene} />
            <main className="flex-1 overflow-auto">
                {children(activeScene)}
            </main>
        </div>
    );
};

export default Layout;
