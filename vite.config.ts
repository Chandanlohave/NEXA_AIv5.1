import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Allows access from the network, which is useful for testing on mobile devices
    host: true,
  },
  build: {
    // The default output directory is 'dist', which is what Capacitor expects
    outDir: 'dist',
  }
})
