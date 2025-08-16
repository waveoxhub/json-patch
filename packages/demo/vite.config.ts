import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), tailwind()],
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
        },
    },
});
