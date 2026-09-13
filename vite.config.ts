import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Конфигурация сборки.
 * base — подкаталог репозитория на GitHub Pages: при base '/' ассеты не находятся.
 */
export default defineConfig({
  base: '/secretar_v2/',
  plugins: [
    svelte(),
    VitePWA({
      // Обновление подхватывается при следующем открытии, без действий пользователя.
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Секретарь',
        short_name: 'Секретарь',
        description: 'Секретарь — задачник с календарём',
        lang: 'ru',
        dir: 'ltr',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/secretar_v2/',
        scope: '/secretar_v2/',
        theme_color: '#2f4858',
        background_color: '#f6f7f9',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      // Иконки манифеста и сам манифест плагин прекэширует сам; здесь —
      // только то, что в манифест не входит.
      includeAssets: ['icons/apple-touch-icon-180.png', 'icons/icon.svg'],
      workbox: {
        // Прекэш оболочки: разметка, скрипты и стили.
        globPatterns: ['**/*.{js,css,html}'],
        navigateFallback: '/secretar_v2/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
    }),
  ],
});
