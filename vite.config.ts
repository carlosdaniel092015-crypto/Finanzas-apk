import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    // Capacitor necesita rutas relativas: el APK sirve desde file://
    assetsDir: 'assets',
    sourcemap: false,
  },
  base: './',
})
