import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://localhost:7085',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
