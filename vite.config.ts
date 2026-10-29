import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mirrors `paths` in tsconfig.app.json.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  css: {
    // Write kebab-case or camelCase class names in CSS; read them as camelCase in TSX.
    modules: { localsConvention: 'camelCaseOnly' },
  },
  test: {
    // Pure logic and fakes only; nothing here needs a DOM. Browser behavior is checked in a real browser.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
