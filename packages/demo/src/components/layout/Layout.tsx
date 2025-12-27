import React from 'react';
import Sidebar, { SceneKey } from './Sidebar';

interface LayoutProps {
    activeScene: SceneKey;
    onSceneChange: (scene: SceneKey) => void;
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ activeScene, onSceneChange, children }) => {
    return (
        <div className="flex h-screen overflow-hidden bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
            <Sidebar activeScene={activeScene} onSceneChange={onSceneChange} />
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    );
};

export default Layout;
