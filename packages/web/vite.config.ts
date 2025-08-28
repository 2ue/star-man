import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    server: {
      host: env.VITE_DEV_HOST === 'false' ? false : true,
      port: parseInt(env.VITE_DEV_PORT || '5143'),
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3801',
          changeOrigin: true,
          secure: false,
          configure: (proxy, options) => {
            if (env.VITE_ENABLE_PROXY_LOGGING === 'true') {
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
            }
          },
        },
      },
    },
    build: {
      target: 'es2018',
    },
  }
})
