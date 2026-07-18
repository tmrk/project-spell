import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/project-spell/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/project-spell/',
        name: 'Project Spell',
        short_name: 'Spell',
        description: 'A calm, playful spelling game for children.',
        lang: 'en-GB',
        start_url: '/project-spell/',
        scope: '/project-spell/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#ffee99',
        theme_color: '#ffee99',
        categories: ['education', 'games', 'kids'],
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'maskable-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{html,js,css,ico,png,svg,mp3}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
  server: {
    host: '127.0.0.1',
  },
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: { url: 'http://127.0.0.1/project-spell/' },
    },
    setupFiles: './src/test/setup.js',
  },
});
