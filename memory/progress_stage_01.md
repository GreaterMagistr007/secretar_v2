# Этап 1 — оболочка PWA «Секретарь»

## Ход работы

### Старт
- Каталог: /media/user/H_SSD_32/projects/secretar_v2, ветка master.
- Создан каркас отчёта, дальше — дописывание по ходу работы.

### Созданы файлы каркаса
package.json, vite.config.ts, tsconfig.json, svelte.config.js, index.html,
src/main.ts, src/App.svelte, src/app.css, Dockerfile, docker-compose.yml,
.github/workflows/deploy.yml, public/icons/icon.svg.

Версии взяты ровно из docs/tech_stack.md: vite 8.3.0, svelte 5.57.0,
@sveltejs/vite-plugin-svelte 7.3.0, vite-plugin-pwa 1.3.0, typescript 6.0.3,
svelte-check 4.7.6. Замен не потребовалось.

### Иконки
В системе нет rsvg-convert/inkscape; ImageMagick рендерит SVG внутренним
движком (XML 2.9.14). Поэтому буква «С» в icon.svg нарисована не текстом
(шрифт внутренним рендерером не гарантирован), а дугой-path со скруглёнными
концами — рендерится одинаково любым движком.

Команда генерации (из public/icons):
  convert -background none icon.svg -resize 192x192 -depth 8 PNG32:icon-192.png
  convert -background none icon.svg -resize 512x512 -depth 8 PNG32:icon-512.png
  convert -background none icon.svg -resize 180x180 -background '#2f4858' -alpha remove -alpha off -depth 8 PNG24:apple-touch-icon-180.png
  convert -background none icon.svg -resize 410x410 -gravity center -background '#2f4858' -extent 512x512 -alpha remove -alpha off -depth 8 PNG24:icon-maskable-512.png

Проверка `file`:
  apple-touch-icon-180.png: PNG image data, 180 x 180, 8-bit/color RGB
  icon-192.png:             PNG image data, 192 x 192, 8-bit/color RGBA
  icon-512.png:             PNG image data, 512 x 512, 8-bit/color RGBA
  icon-maskable-512.png:    PNG image data, 512 x 512, 8-bit/color RGB

Проверка пикселей (PIL): точка на дуге (138,256) = (246,247,249) — светлая
буква; центр (256,256) = (47,72,88) — фон; у maskable угол (2,2) = (47,72,88),
то есть фон во весь квадрат, значимая часть — в центральных 80% (410/512).

### Проверки

**1. npm install (в контейнере node:22-alpine от uid/gid хоста).**
  added 361 packages, and audited 362 packages in 38s
  found 0 vulnerabilities
Права: `ls -ld node_modules package-lock.json` → оба `user user`;
`find node_modules -maxdepth 2 -user root` → пусто. Файлов root нет.

**2. npm run build.**
  vite v8.3.0 building client environment for production...
  ✓ 112 modules transformed.
  dist/registerSW.js               0.15 kB
  dist/manifest.webmanifest        0.59 kB
  dist/index.html                  1.28 kB │ gzip: 0.59 kB
  dist/assets/index-DTrYi688.css   1.55 kB │ gzip: 0.68 kB
  dist/assets/index-CNtCmHh_.js   22.96 kB │ gzip: 9.42 kB
  ✓ built in 121ms
  PWA v1.3.0 / mode generateSW / precache 10 entries (25.35 KiB)
  files generated dist/sw.js, dist/workbox-9c191d2f.js
Ошибок и предупреждений нет.

**3. npm run check.**
  svelte-check found 0 errors and 0 warnings

**4. Состав dist/.**
  dist/assets/index-CNtCmHh_.js
  dist/assets/index-DTrYi688.css
  dist/icons/apple-touch-icon-180.png
  dist/icons/icon-192.png
  dist/icons/icon-512.png
  dist/icons/icon-maskable-512.png
  dist/icons/icon.svg
  dist/index.html
  dist/manifest.webmanifest
  dist/registerSW.js
  dist/sw.js
  dist/workbox-9c191d2f.js
index.html, манифест, service worker (sw.js + workbox-*.js) и иконки на месте.

**5. Префикс base у всех ссылок в dist/index.html.**
`grep -oE '(href|src)="[^"]+"' dist/index.html`:
  href="/secretar_v2/icons/icon.svg"
  href="/secretar_v2/icons/apple-touch-icon-180.png"
  src="/secretar_v2/assets/index-CNtCmHh_.js"
  href="/secretar_v2/assets/index-DTrYi688.css"
  href="/secretar_v2/manifest.webmanifest"
  src="/secretar_v2/registerSW.js"
Все шесть начинаются с /secretar_v2/. В sw.js navigateFallback —
createHandlerBoundToURL("/secretar_v2/index.html").

**6. Заголовок и манифест.**
  <title>Секретарь</title>
  {"name":"Секретарь","short_name":"Секретарь","description":"Секретарь — задачник с календарём","start_url":"/secretar_v2/","display":"standalone","background_color":"#f6f7f9","theme_color":"#2f4858","lang":"ru","scope":"/secretar_v2/","dir":"ltr","orientation":"portrait","icons":[{"src":"icons/icon-192.png","sizes":"192x192","type":"image/png","purpose":"any"},{"src":"icons/icon-512.png","sizes":"512x512","type":"image/png","purpose":"any"},{"src":"icons/icon-maskable-512.png","sizes":"512x512","type":"image/png","purpose":"maskable"}]}
Пути иконок относительные — разрешаются от /secretar_v2/manifest.webmanifest,
то есть в /secretar_v2/icons/.

**7. Прекэш service worker (10 записей, дублей нет).**
  registerSW.js, index.html, assets/index-DTrYi688.css, assets/index-CNtCmHh_.js,
  icons/apple-touch-icon-180.png, icons/icon-192.png, icons/icon-512.png,
  icons/icon-maskable-512.png, icons/icon.svg, manifest.webmanifest
Первая сборка дала 14 записей с дублями: globPatterns захватывал png и
webmanifest, которые vite-plugin-pwa и так кладёт в прекэш сам. Исправлено:
globPatterns сужен до `**/*.{js,css,html}`, а иконки вне манифеста
(apple-touch-icon и icon.svg) добавлены через includeAssets.

**8. TODO/FIXME.** `grep -rn "TODO\|FIXME" src/ vite.config.ts` — не найдено.

**9. docker-compose.yml.** `env UID=$(id -u) GID=$(id -g) docker compose config`
подставляет `user: 1000:1000` во все три сервиса, порт 5173 у dev.
Замечание: в bash переменная UID только для чтения, поэтому запускать надо
`env UID=$(id -u) GID=$(id -g) docker compose ...` — префиксное присваивание
`UID=... docker compose ...` падает с «UID: переменная только для чтения».
Это записано комментарием в самом docker-compose.yml.

**10. .github/workflows/deploy.yml** (разобран yaml.safe_load):
  jobs: ['build', 'deploy']
  triggers: ['push', 'workflow_dispatch']
  permissions: {'contents': 'read', 'pages': 'write', 'id-token': 'write'}
  concurrency: {'group': 'pages', 'cancel-in-progress': False}

### Что не проверялось инструментами
- Отсутствие горизонтальной прокрутки на 360 px и вид экрана в браузере:
  браузер не запускался. В CSS заданы `overflow-x: hidden` на html и body,
  `box-sizing: border-box` глобально, заголовок — `clamp(2rem, 12vw, 3rem)`
  с `max-width: 100%` и `overflow-wrap: anywhere`, отступы экрана —
  `calc(var(--space-lg) + env(safe-area-inset-*))`. Визуальную проверку
  и офлайн-режим владелец делает сам по плану («Порядок проверки результата»).
- Реальная работа офлайн: service worker сгенерирован и прекэширует оболочку,
  но проверка с выключенной сетью требует браузера.

### Изменения в docs/
Только добавлен раздел «Иконки» в docs/deployment.md (перед разделом
«Обновление на телефоне»). Других правок документации нет.

### Дополнено в .gitignore
.vite/, node_modules/.vite/, node_modules/.vite-temp/, *.tsbuildinfo, dev-dist/
Файл не перезаписывался — только дописывание в конец.

### Коммит
Не делался: по условию задачи коммит и пуш выполняет владелец.

### Дополнительно
- `docker build -t secretar-node .` проходит, образ собирается.
- В сервисе dev команда упрощена до `npm install && npm run dev`: флаг
  `--host 0.0.0.0` уже прописан в npm-скрипте dev, дублировать его не нужно.
