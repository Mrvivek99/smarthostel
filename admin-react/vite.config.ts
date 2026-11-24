import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  // Optional dev proxy: leave VITE_API_URL empty and set VITE_PROXY_TARGET to the Next.js dev server.
  const target = env.VITE_PROXY_TARGET || 'http://localhost:3000';
  return {
    plugins: [react()],
    server: { port: 5173, proxy: { '/api': { target, changeOrigin: true } } },
    build: { chunkSizeWarningLimit: 900 },
  };
});
