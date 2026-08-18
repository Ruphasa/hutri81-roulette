import { defineConfig } from 'astro/config';
import AstroPWA from '@vite-pwa/astro';

export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    AstroPWA({
      registerType: 'prompt',
      manifest: {
        name: 'Undian HUT RI 81 — Griya Shanta RT 08',
        short_name: 'Undian RT 08',
        description: 'Undian kavling offline untuk malam HUT RI ke-81.',
        start_url: '/draw/',
        scope: '/',
        display: 'standalone',
        background_color: '#09080d',
        theme_color: '#e12631',
        icons: [
          { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{html,js,css,svg,png,woff2,webmanifest}'],
        navigateFallback: '/draw/index.html'
      }
    })
  ]
});
