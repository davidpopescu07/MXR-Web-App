import {defineConfig} from "vite";

import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: './src/setupTests.js',
        coverage: {
            provider: 'v8',
            all: true,                        // include files even if not imported by tests
            include: ['src/**/*.{js,jsx}'],
            exclude: [
                'src/main.jsx',
                'src/index.jsx',
                'src/App.jsx',
            ],
            thresholds: { lines: 90 }
        }
    }
})