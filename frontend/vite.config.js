import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Ollama-backed routes (e.g. /suggestions/refresh) can take 1–3+ minutes; default proxy times out → ECONNRESET
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        // Browser → Vite (incoming)
        timeout: 600_000,
        // Vite → FastAPI (outgoing). Without this, long Ollama calls often end as ECONNRESET / socket hang up
        proxyTimeout: 600_000,
        configure(proxy) {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setTimeout(600_000)
            proxyReq.on('socket', (socket) => {
              socket.setTimeout(600_000)
            })
          })
          proxy.on('proxyRes', (proxyRes, req) => {
            req.socket?.setTimeout?.(600_000)
          })
        },
      },
    },
  },
})
