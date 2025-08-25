import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        host: true,
        port: 5173,
        proxy: {
            '/api': {
                target: process.env.VITE_API_PROXY_TARGET || 'http://[::1]:3801',
                changeOrigin: true,
                secure: false,
                configure: (proxy, options) => {
                    proxy.on('error', (err, req, res) => {
                        console.log('Proxy Error:', err.message);
                        console.log('Target:', options.target);
                    });
                    proxy.on('proxyReq', (proxyReq, req, res) => {
                        console.log('Proxying:', req.method, req.url, '->', options.target);
                    });
                    proxy.on('proxyRes', (proxyRes, req, res) => {
                        console.log('Proxy Response:', proxyRes.statusCode, req.url);
                    });
                },
            },
        },
    },
    build: {
        target: 'es2018',
    },
});
