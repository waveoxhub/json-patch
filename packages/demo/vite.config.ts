import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 读取 schema-json-patch 包的版本号
const libraryPkg = JSON.parse(
    readFileSync(resolve(__dirname, '../schema-json-patch/package.json'), 'utf-8')
);

// https://vitejs.dev/config/
export default defineConfig({
    base: './',
    plugins: [react(), tailwind()],
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
            '@src': resolve(__dirname, './src'),
        },
    },
    define: {
        __LIBRARY_VERSION__: JSON.stringify(libraryPkg.version),
    },
});
