import { copyFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * O app é publicado no GitHub Pages em /plano-treino-semanal/, por isso o base
 * não é a raiz. Em hospedagens que servem na raiz (Vercel, Netlify), defina
 * VITE_BASE=/ nas variáveis de ambiente do build.
 */
const base = process.env['VITE_BASE'] ?? '/plano-treino-semanal/'

/**
 * O GitHub Pages não sabe reescrever rotas de SPA: ao abrir /treinos direto,
 * ele procura um arquivo com esse nome e cai no 404. Servindo uma cópia do
 * index.html como 404.html, o React Router assume e mostra a tela certa.
 */
function fallback404(): Plugin {
  return {
    name: 'fallback-404-github-pages',
    closeBundle() {
      try {
        copyFileSync('dist/index.html', 'dist/404.html')
      } catch {
        // Build sem index.html (ex.: modo biblioteca): nada a copiar.
      }
    },
  }
}

export default defineConfig({
  base,
  plugins: [
    react(),
    fallback404(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'FitTrack - Treinos de Academia',
        short_name: 'FitTrack',
        description:
          'Monte suas rotinas, registre cada série e acompanhe a evolução de carga e volume.',
        lang: 'pt-BR',
        dir: 'ltr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b0f14',
        theme_color: '#0b0f14',
        categories: ['health', 'fitness', 'sports'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: `${base}index.html`,
        // O treino precisa abrir offline; dados de API ficam no cache local do app
        // (localStorage/outbox), por isso as chamadas ao Supabase nao sao cacheadas aqui.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
})
