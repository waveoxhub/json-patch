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
        <aside className="sidebar">
            <div className="sidebar-header">
                <h1 className="sidebar-title">JSON Patch</h1>
                <div className="sidebar-subtitle">Playground</div>
            </div>
            <nav className="sidebar-nav">
                {navItems.map(({ key, icon: Icon, label }) => (
                    <button
                        key={key}
                        className={`nav-item ${activeScene === key ? 'active' : ''}`}
                        onClick={() => onSceneChange(key)}
                    >
                        <Icon size={16} />
                        <span>{label}</span>
                    </button>
                ))}
            </nav>
            <div className="sidebar-footer">
                <span className="version">v1.0</span>
                <button className="theme-toggle" onClick={toggleTheme} title={theme === 'light' ? '切换深色' : '切换浅色'}>
                    {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
