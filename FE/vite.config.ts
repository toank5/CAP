import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const API = 'http://127.0.0.1:5112'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  optimizeDeps: {
    include: ['recharts', 'react', 'react-dom', 'framer-motion', '@microsoft/signalr'],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('three')) {
              return 'vendor-three'
            }
            if (id.includes('@ckeditor')) {
              return 'vendor-editor'
            }
            if (id.includes('recharts')) {
              return 'vendor-charts'
            }
            if (id.includes('framer-motion')) {
              return 'vendor-motion'
            }
            if (id.includes('@microsoft/signalr')) {
              return 'vendor-signalr'
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('lucide-react')) {
              return 'vendor-core'
            }
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: API,
        changeOrigin: true,
        secure: false,
      },
      '/hubs': {
        target: API,
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
})

