import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        api: {
            host: '0.0.0.0',
        },
        include: ['test/**/*.test.ts'],
        environment: 'node',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: ['node_modules/', 'test/', '**/*.d.ts', 'dist/', 'vitest.config.ts'],
        },
    },
});
