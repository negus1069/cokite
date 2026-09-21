import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages deployment:
//   Repo:  negus1069/cokite
//   URL:   https://negus1069.github.io/cokite/
// The `base` must match the sub-path.
// For local dev (`npm run dev`), Vite ignores `base` and serves at "/".
export default defineConfig({
  plugins: [react()],
  base: '/cokite/',
  server: {
    port: 5173,
    open: true,
    proxy: {
      // Reverse-proxy live weather-station endpoints so the browser can fetch
      // them without CORS during local development.
      // In production (GitHub Pages), the app falls back to public CORS proxies.
      '/weameter': {
        target: 'https://weameter.com',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/weameter/, ''),
      },
      '/mlr': {
        target: 'https://www.meteolarochelle.fr',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/mlr/, ''),
      },
    },
  },
});


