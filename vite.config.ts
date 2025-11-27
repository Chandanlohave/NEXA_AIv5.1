import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables from .env files and the process environment
  // Fix for TypeScript error: Property 'cwd' does not exist on type 'Process'.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    // Define process.env to make environment variables available in the client-side code
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
    server: {
      // Allows access from the network, which is useful for testing on mobile devices
      host: true,
    },
    build: {
      // The default output directory is 'dist', which is what Capacitor expects
      outDir: 'dist',
    }
  }
})