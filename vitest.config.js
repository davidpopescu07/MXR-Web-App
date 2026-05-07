import {defineConfig} from "vite";

import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: './src/setupTests.js',
        include: ['src/**/*.{test,spec}.{js,jsx}'],
        exclude: ['tests/**'],
        coverage: {
            provider: 'v8',
            all: true,                        // include files even if not imported by tests
            include: ['src/**/*.{js,jsx}'],
            exclude: [
                'src/**/*.test.{js,jsx}',
                'src/**/*.spec.{js,jsx}',
                'src/main.jsx',
                'src/index.jsx',
                'src/App.jsx',
                'src/Components/AboutPage/AboutPage.jsx',
                '**/tests/**',
                'src/Components/LandingPage/Navbar/Cookies/CookiesBanner.jsx'
            ],
            thresholds: { lines: 90 }
        }
    }
})