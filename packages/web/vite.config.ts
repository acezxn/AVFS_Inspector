import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiPort = Number(process.env.INSPECTOR_API_PORT ?? process.env.PORT ?? 3000);
const webPort = Number(process.env.INSPECTOR_WEB_PORT ?? 5173);
const proxyTarget = process.env.VITE_PROXY_TARGET ?? `http://localhost:${apiPort}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number.isFinite(webPort) ? webPort : 5173,
    proxy: {
      '/api': { target: proxyTarget, changeOrigin: true },
    },
  },
});
