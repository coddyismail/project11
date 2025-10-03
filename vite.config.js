import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Exclude Node-only modules from client bundle
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: [
        'fluent-ffmpeg',
        'ffmpeg-static',
        'form-data'
      ]
    }
  }
})
