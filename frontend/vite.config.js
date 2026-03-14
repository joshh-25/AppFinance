// Finance App File: frontend\vite.config.js
// Purpose: Frontend/support source file for the Finance app.

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Finance/frontend/dist/' : '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setupTests.js'
  },
  build: {
    manifest: true,
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy: {
      '/Finance': {
        target: 'http://localhost',
        changeOrigin: true
      }
    }
  }
}));
