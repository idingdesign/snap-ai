import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        overlay: path.resolve(__dirname, 'src/overlay/index.html'),
        result: path.resolve(__dirname, 'src/result/index.html'),
        history: path.resolve(__dirname, 'src/history/index.html'),
        settings: path.resolve(__dirname, 'src/settings/index.html'),
      }
    }
  },
  server: {
    port: 5173
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
