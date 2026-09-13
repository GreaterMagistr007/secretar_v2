---
name: mechanic_pwa_shell
description: Механика оболочки PWA «Секретарь» — каркас приложения, манифест, service worker, иконки, окружение сборки и публикация
type: project
---

# Механика: оболочка PWA

Реализована 2026-09-13 в рамках этапа 1 ([plan_stage_01_pwa.md](plan_stage_01_pwa.md)). Закрывает позиции каталога 1 (оболочка PWA), 2 (главный экран с надписью «Секретарь»), 14 (публикация на GitHub Pages) и требования Т-14, Т-15, Т-16, Т-17.

## Модели
Нет: хранилища на этом этапе не существует. Схема данных задачника — [architecture_storage.md](architecture_storage.md), появится вместе с задачником.

## Миграции
Нет.

## Маршруты
Маршрутизация не подключена: экран один. Хэш-роутинг (решение Р-19) появится вместе с экранами календаря, задачи и настроек.

## Контроллеры
Нет.

## Views
- `index.html` — `lang="ru"`, `<title>Секретарь</title>`, `viewport-fit=cover`, два `theme-color` (для светлой и тёмной схемы), `apple-touch-icon`, `apple-mobile-web-app-title` = «Секретарь».
- `src/App.svelte` — единственный экран: заголовок «Секретарь» по центру и под ним ссылка «Демо шаблонов календаря» на галерею вариантов (позиция каталога 22). Ссылка строится от `import.meta.env.BASE_URL`, а не от корня домена: на GitHub Pages приложение живёт в подкаталоге `/secretar_v2/`. Отступы через `calc(var(--space-lg) + env(safe-area-inset-*))`, высота `100svh`, `overflow-wrap: anywhere`.
- `src/app.css` — глобальные стили и тема. Палитра, типографика и отступы заданы CSS-переменными на `:root`; тёмная тема через `@media (prefers-color-scheme: dark)` переопределяет только цвета. `overflow-x: hidden` на `html` и `body`. Размер заголовка `clamp(2rem, 12vw, 3rem)` — подгоняется под ширину экрана.
- `src/main.ts` — монтирование Svelte 5 через `mount()`; при отсутствии `#app` бросается ошибка, молчаливого падения нет.

## Сервисы
Нет.

## Jobs
Нет.

## API
Нет: приложение автономно, сетевых обращений не делает.

## Настройки

### Сборка — `vite.config.ts`
- `base: '/secretar_v2/'` — сайт живёт в подкаталоге репозитория на GitHub Pages.
- Плагины: `@sveltejs/vite-plugin-svelte`, `vite-plugin-pwa`.

### PWA — `vite-plugin-pwa`
- `registerType: 'autoUpdate'` — новая версия подхватывается при следующем открытии.
- Манифест: `name` и `short_name` — «Секретарь», `lang: ru`, `display: standalone`, `orientation: portrait`, `start_url` и `scope` — `/secretar_v2/`, `theme_color: #2f4858`, `background_color: #f6f7f9`, три иконки (192, 512, maskable 512).
- `workbox.globPatterns: ['**/*.{js,css,html}']` плюс `includeAssets` для `apple-touch-icon-180.png` и `icon.svg`. Причина: иконки манифеста и сам манифест плагин прекэширует сам, и широкий `globPatterns` давал дубли в списке прекэша.
- `navigateFallback: '/secretar_v2/index.html'`, `cleanupOutdatedCaches: true`, `clientsClaim: true`.

### Иконки — `public/icons/`
Исходник `icon.svg`, из него генерируются `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (значимая часть в центральных 80 %), `apple-touch-icon-180.png` (без альфа-канала — iOS заменяет прозрачность чёрным). Команды перегенерации — [deployment.md](deployment.md), раздел «Иконки».

### Окружение сборки
`Dockerfile` на `node:22-alpine` и `docker-compose.yml` с сервисами `dev` (порт 5173), `build`, `check`; контейнеры работают от пользователя хоста, кэш npm в `/tmp/.npm` (решение Р-17).

### Публикация
`.github/workflows/deploy.yml`: `checkout` → `setup-node` (Node 22, кэш npm) → `npm ci` → `npm run check` → `npm run build` → `upload-pages-artifact` (путь `dist`) → `deploy-pages`. Триггеры: пуш в `master` и `workflow_dispatch`. Права `contents: read`, `pages: write`, `id-token: write`; `concurrency: pages` без отмены уже запущенной публикации.

## Примечания

### Версии GitHub Actions
Агент собрал workflow на `checkout@v4`, `setup-node@v4`, `upload-pages-artifact@v3`, `deploy-pages@v4`. При проверке выяснилось, что актуальные мажорные версии — 7, 7, 5 и 5 соответственно; версии обновлены до актуальных. Причина: старые мажорные версии artifact-действий GitHub уже отключал принудительно, и такие workflow переставали работать без предупреждения.

### `UID` в bash
Переменная `UID` в bash доступна только для чтения, поэтому `UID=$(id -u) docker compose up dev` завершается ошибкой. Правильный запуск — `env UID=$(id -u) GID=$(id -g) docker compose up dev`; без переменных подставляется `1000:1000`.

### Что проверено
Сборка воспроизведена самостоятельно в контейнере: `npm run check` без ошибок, `npm run build` собирает 112 модулей за ~130 мс, прекэш 10 записей. В `dist/` присутствуют `index.html`, `manifest.webmanifest`, `sw.js`, `workbox-*.js`, пять файлов иконок. Все шесть ссылок в `dist/index.html` начинаются с `/secretar_v2/`. Заголовок и поля манифеста — «Секретарь». Размеры иконок подтверждены чтением файлов, изображение осмотрено. `TODO`/`FIXME` в исходниках нет.
