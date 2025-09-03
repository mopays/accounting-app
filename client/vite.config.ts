import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,     // ให้เข้าถึงจากเครื่องอื่นได้ (ถ้าต้องการ)
    port: 5173
  },
  preview: {
    port: 4173
  }
})
