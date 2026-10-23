import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost/amila-karunarathne',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost/amila-karunarathne',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
