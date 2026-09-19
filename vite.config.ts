import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Supabase project URLs and publishable keys are intentionally safe to ship to a
  // browser. Keep every other value in .env.local (especially DB credentials)
  // server-only by defining only these VITE_ values.
  const env = loadEnv(mode, '.', '')
  const publicUrl = mode === 'test' ? '' : env.VITE_SUPABASE_URL ?? env.SUPABASE_URL ?? ''
  const publicKey = mode === 'test' ? '' : env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_PUBLISHABLE_KEY ?? ''
  return {
  plugins: [react()],
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(publicUrl),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(publicKey),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true,
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
  }
})
