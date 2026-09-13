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
        // Галерея вариантов вёрстки — временный материал для выбора дизайна:
        // в прекэш не берётся, иначе service worker тянет три десятка лишних страниц.
        globIgnores: ['gallery/**'],
        navigateFallback: '/secretar_v2/index.html',
        // Переходы внутрь галереи обслуживает сеть, а не оболочка приложения.
        navigateFallbackDenylist: [/^\/secretar_v2\/gallery\//],
        // Шрифты тем в прекэш не берутся (globPatterns их не захватывает): тянуть
        // все семейства при первой загрузке незачем, нужен только шрифт выбранной темы.
        // Зато однажды показанный шрифт остаётся в кэше и работает офлайн — файл
        // неизменяемый, поэтому CacheFirst и длинный срок хранения.
        runtimeCaching: [
          {
            urlPattern: /\/fonts\/[^/]+\.woff2$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'secretar-fonts',
              expiration: {
                // Файлов ровно 12 — запас на случай новых тем.
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
    }),
  ],
});
