import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Referrer-Policy': 'no-referrer-when-downgrade',
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'spendwise-render-blocking-entry',
      apply: 'build',
      transformIndexHtml: {
        order: 'post',
        handler: (html) => html.replace('<script type="module" crossorigin', '<script blocking="render" type="module" crossorigin'),
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
