import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, /api is proxied to the backend. Set API_PROXY_TARGET (or VITE_API_URL) in .env to the backend that uses Google Places.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = (env.API_PROXY_TARGET || env.VITE_API_URL || 'https://odtc-logistics-api.onrender.com').replace(/\/+$/, '').replace(/\/api\/v1$/, '');
  return {
    plugins: [react()],
    server: { proxy: { '/api': { target, changeOrigin: true, secure: target.startsWith('https') }, '/health': { target, changeOrigin: true, secure: target.startsWith('https') } } },
  };
});
