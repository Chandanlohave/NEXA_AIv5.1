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
      // FIX: Now checks for both VITE_API_KEY and API_KEY to support standard hosting environments like Vercel
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