import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../Timekeeper.Api/wwwroot',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return
          }

          if (id.includes('react-router')) {
            return 'router-vendor'
          }

          if (id.includes('@tanstack')) {
            return 'query-vendor'
          }

          if (
            id.includes('recharts') ||
            id.includes('/d3-') ||
            id.includes('/victory-vendor/')
          ) {
            return 'charts-vendor'
          }

          if (id.includes('@radix-ui') || id.includes('cmdk') || id.includes('lucide-react')) {
            return 'ui-vendor'
          }
        },
      },
    },
  },
})
