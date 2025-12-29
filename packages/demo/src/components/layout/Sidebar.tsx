import React from 'react';
import { Shield, GitCompare, GitMerge, Play, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export type SceneKey = 'validate' | 'generate' | 'conflict' | 'apply';

interface SidebarProps {
    activeScene: SceneKey;
    onSceneChange: (scene: SceneKey) => void;
}

const navItems = [
    { key: 'validate' as SceneKey, icon: Shield, label: '补丁验证' },
    { key: 'generate' as SceneKey, icon: GitCompare, label: '补丁生成' },
    { key: 'conflict' as SceneKey, icon: GitMerge, label: '冲突检测' },
    { key: 'apply' as SceneKey, icon: Play, label: '补丁应用' },
];

const Sidebar: React.FC<SidebarProps> = ({ activeScene, onSceneChange }) => {
    const { theme, toggleTheme } = useTheme();

    return (
        <aside className="w-50 flex-shrink-0 flex flex-col bg-neutral-50 dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-700">
            <div className="px-4 py-5 border-b border-neutral-200 dark:border-neutral-700">
                <h1 className="text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                    JSON Patch
                </h1>
                <div className="text-[10px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Playground
                </div>
            </div>
            <nav className="flex-1 p-2">
                {navItems.map(({ key, icon: Icon, label }) => (
                    <button
                        key={key}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-[13px] transition-colors cursor-pointer border-none bg-transparent text-left
                            ${
                                activeScene === key
                                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-medium'
                                    : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100'
                            }`}
                        onClick={() => onSceneChange(key)}
                    >
                        <Icon size={16} />
                        <span>{label}</span>
                    </button>
                ))}
            </nav>
            <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-700 flex justify-between items-center">
                <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                    v{__LIBRARY_VERSION__}
                </span>
                <button
                    className="p-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 bg-transparent text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer flex items-center justify-center"
                    onClick={toggleTheme}
                    title={theme === 'light' ? '切换深色' : '切换浅色'}
                >
                    {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
