---
name: mechanic_pwa_shell
description: Механика оболочки PWA «Секретарь» — каркас приложения, манифест, service worker, иконки, окружение сборки и публикация
type: project
---

# Механика: оболочка PWA

Реализована 2026-09-13 в рамках этапа 1 ([plan_stage_01_pwa.md](plan_stage_01_pwa.md)). Закрывает позиции каталога 1 (оболочка PWA), 2 (главный экран с надписью «Секретарь»), 14 (публикация на GitHub Pages) и требования Т-14, Т-15, Т-16, Т-17.

## Модели
Нет: этот файл описывает оболочку PWA — манифест, service worker, иконки, сборку и публикацию. Данные задач — [mechanic_tasks.md](mechanic_tasks.md), темы и экраны — [mechanic_themes.md](mechanic_themes.md).

## Миграции
Нет.

## Маршруты
Задаются не здесь: хэш-роутинг (решение Р-19) описан в [mechanic_themes.md](mechanic_themes.md), маршрут задачи — в [mechanic_tasks.md](mechanic_tasks.md). Для публикации важно одно: `navigateFallback` ведёт на `index.html`, а переходы внутрь `/gallery/` из него исключены.

## Контроллеры
Нет.

## Views
- `index.html` — `lang="ru"`, `<title>Секретарь</title>`, `viewport-fit=cover`, два `theme-color` (для светлой и тёмной схемы), `apple-touch-icon`, `apple-mobile-web-app-title` = «Секретарь».
- `src/App.svelte` — **с 2026-09-13 это оболочка приложения**, а не экран: применяет сохранённую тему, выводит экран по маршруту и держит нижнюю навигацию, см. [mechanic_themes.md](mechanic_themes.md). Прежняя редакция (заголовок «Секретарь» по центру и ссылка «Демо шаблонов календаря») отменена: её место заняли полноценные экраны, стартовым стал календарь. Требование Т-15 (стартовый экран первой поставки) выполнено и исчерпано — оно описывало первую поставку, а не постоянное состояние.
- `src/app.css` — глобальные стили и значения токенов по умолчанию (полный состав — [design_tokens.md](design_tokens.md)); тёмный вариант через `@media (prefers-color-scheme: dark)`; `overflow-x: hidden` на `html` и `body`; наследование шрифта элементами форм.
- `src/main.ts` — монтирование Svelte 5 через `mount()`; при отсутствии `#app` бросается ошибка, молчаливого падения нет.

## Сервисы
Нет.

## Jobs
Нет.

## API
Нет: приложение автономно. Единственные сетевые запросы — за файлами шрифтов активной темы, и те кэшируются (см. [mechanic_themes.md](mechanic_themes.md)).

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
