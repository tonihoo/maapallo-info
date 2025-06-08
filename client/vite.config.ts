import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://server:3003',
        changeOrigin: true,
        secure: false
      }
    }
  },
  define: {
    CESIUM_BASE_URL: JSON.stringify('/node_modules/cesium/Build/Cesium/')
  },
  optimizeDeps: {
    include: ['cesium']
  },
  build: {
    minify: false,
    sourcemap: true
  },
  esbuild: {
    minify: false
  },
  // Force cache invalidation
  clearScreen: false
})
