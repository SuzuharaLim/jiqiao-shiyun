import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',   // 絕對路徑：深層網址（/AR、/post/p1…）也能正確載入 assets
  build: {
    rollupOptions: {
      output: {
        // 分離 react vendor：框架與應用碼分開快取（改版時使用者只需重載應用碼）
        manualChunks: { react: ['react', 'react-dom'] },
      },
    },
  },
  server: {
    // 開發時把 /api 轉給 Node 認證後端（同源 → Cookie 可正常運作）
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
})
