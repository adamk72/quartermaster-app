import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const backendPort = process.env.PORT || '9090'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 1337,
    proxy: {
      '/api': `http://localhost:${backendPort}`,
      '/uploads': `http://localhost:${backendPort}`,
    },
  },
})
