import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables based on the mode (production/development)
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    // Define process.env to make environment variables available in the client-side code
    define: {
      // Use VITE_API_KEY if available, otherwise fall back to API_KEY
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY || env.API_KEY),
    },
    server: {
      host: true,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    }
  }
})