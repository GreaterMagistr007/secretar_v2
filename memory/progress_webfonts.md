# Веб-шрифты для тем «Секретарь» — ход работы

Старт: 2026-09-13. Задача: подключить веб-шрифты, чтобы каждая тема показывалась своим шрифтом на любом устройстве.

## Этап 0. Каркас отчёта создан

## Этап 1. Состав шрифтов по 30 темам (проверено по файлам src/lib/themes/v*.ts)
Уникальные семейства, не считая системных стеков:
- Georgia — v02 «Тёплый песок», v24 «Бумага», v30 «Королевский» (проприетарный, Microsoft)
- Inter — v03 «Северный лёд» (OFL)
- SF Pro Text / SF Pro Display — v07 «Графит», v22 «Системный iOS» (проприетарный, Apple)
- Helvetica Neue — v08 «Тихий минимализм» (проприетарный, Linotype/Monotype)
- Nunito — v09 «Пастельные карточки» (OFL)
- Roboto — v23 «Material 3» (Apache 2.0)
- Моноширинный стек (ui-monospace/SFMono/Menlo/Consolas/Liberation Mono/Courier New) — v17 «Брутализм»
- Остальные 22 темы — системные стеки (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial), веб-шрифт не требуется.
Примечание: в v01 и v11 «Helvetica Neue» стоит внутри системного стека как macOS-фолбэк, а не как заявленный шрифт темы — эти темы не трогаем.

## Этап 2. Проверка кириллицы (КРИТИЧНОЕ РАСХОЖДЕНИЕ С ПЛАНОМ)
Запрошен css2 Google Fonts с современным User-Agent, проверен список подмножеств:
- Inter — cyrillic-ext, cyrillic, greek, vietnamese, latin-ext, latin. Кириллица ЕСТЬ.
- Nunito — cyrillic-ext, cyrillic, vietnamese, latin-ext, latin. Кириллица ЕСТЬ.
- Roboto — cyrillic-ext, cyrillic, greek, math, symbols, vietnamese, latin. Кириллица ЕСТЬ.
- Roboto Mono — cyrillic-ext, cyrillic, greek, vietnamese, latin-ext, latin. Кириллица ЕСТЬ.
- Arimo — cyrillic-ext, cyrillic, greek, hebrew, vietnamese, latin-ext, latin. Кириллица ЕСТЬ.
- **Gelasio — ТОЛЬКО vietnamese, latin-ext, latin. КИРИЛЛИЦЫ НЕТ.** Проверено дважды, в том числе явным `&subset=cyrillic` — ответ всё равно без кириллического блока.
Вывод: Gelasio как замена Georgia не годится — интерфейс русский, кириллический текст (а это почти весь текст) откатился бы на Times New Roman, то есть веб-шрифт не давал бы ничего.
Замена Georgia: **Literata** (OFL, TypeTogether) — вариативный 200..900, есть cyrillic и cyrillic-ext, экранный книжный serif с крупным очком, по характеру близок к Georgia. Рассмотрены и отклонены: PT Serif (не вариативный — 4 файла вместо 2), Noto Serif (более нейтральный, дальше от Georgia по характеру), Tinos (метрика Times New Roman, не Georgia).

## Этап 3. Скачанные файлы (public/fonts/, только latin и cyrillic, вариативные версии)
| Файл | Размер | font-weight | Семейство | Лицензия |
|---|---|---|---|---|
| inter-latin.woff2 | 48256 B | 100 900 | Inter | OFL 1.1 |
| inter-cyrillic.woff2 | 18748 B | 100 900 | Inter | OFL 1.1 |
| nunito-latin.woff2 | 39128 B | 200 1000 | Nunito | OFL 1.1 |
| nunito-cyrillic.woff2 | 20776 B | 200 1000 | Nunito | OFL 1.1 |
| roboto-latin.woff2 | 43136 B | 100 900 | Roboto | Apache 2.0 |
| roboto-cyrillic.woff2 | 23664 B | 100 900 | Roboto | Apache 2.0 |
| roboto-mono-latin.woff2 | 32796 B | 100 700 | Roboto Mono | Apache 2.0 |
| roboto-mono-cyrillic.woff2 | 18592 B | 100 700 | Roboto Mono | Apache 2.0 |
| arimo-latin.woff2 | 20132 B | 400 700 | Arimo | Apache 2.0 |
| arimo-cyrillic.woff2 | 13340 B | 400 700 | Arimo | Apache 2.0 |
| literata-latin.woff2 | 52496 B | 200 900 | Literata | OFL 1.1 |
| literata-cyrillic.woff2 | 28068 B | 200 900 | Literata | OFL 1.1 |
Итого 359132 B = 350.7 KiB (лимит был 700 КБ).

## Этап 4. Правки кода
- Создан `src/fonts.css` — только @font-face, 12 объявлений (6 семейств × latin/cyrillic), `font-display: swap`, вариативные диапазоны font-weight, unicode-range дословно из ответа Google Fonts (у всех семейств совпадает):
  - latin: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD
  - cyrillic: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116
  Пути вида `url('/fonts/...woff2')` — Vite переписывает ведущий слеш на base `/secretar_v2/` (проверка в этапе 5).
- `src/main.ts`: `import './fonts.css';` перед `import './app.css';`.
- Стеки тем (менялись только fontFamily и fontFamilyHeading, прочие токены не тронуты):
  - v02, v24, v30: `Georgia, Literata, "Times New Roman", serif`
  - v07: `"SF Pro Text", -apple-system, Inter, "Segoe UI", Roboto, Arial, sans-serif` (-apple-system оставлен перед Inter: на Apple «SF Pro Text» по имени не всегда матчится, системный ключ надёжнее)
  - v22: body `-apple-system, "SF Pro Text", Inter, …`, heading `-apple-system, "SF Pro Display", Inter, …`
  - v08: `"Helvetica Neue", Helvetica, Arimo, Arial, sans-serif` (Arimo поставлен перед Arial ради одинакового вида на всех системах; метрически они совместимы)
  - v17: `ui-monospace, "SFMono-Regular", Menlo, Consolas, "Liberation Mono", "Roboto Mono", "Courier New", monospace`
  - v03 (Inter), v09 (Nunito), v23 (Roboto) — правка не нужна, шрифт уже первый в стеке и теперь подкреплён @font-face.
- `vite.config.ts`: в workbox добавлен `runtimeCaching` — `urlPattern: /\/fonts\/[^/]+\.woff2$/`, `CacheFirst`, cacheName `secretar-fonts`, maxEntries 20, maxAgeSeconds 1 год, cacheableResponse statuses [0, 200]. `globPatterns` не менялся (`**/*.{js,css,html}`), woff2 в прекэш не попадает.

## Этап 5. Проверки (дословно)

### npm run check && npm run build (docker node:22-alpine)
```
> svelte-check --tsconfig ./tsconfig.json
Loading svelte-check in workspace: /app
Getting Svelte diagnostics...
svelte-check found 0 errors and 0 warnings

> vite build
vite v8.3.0 building client environment for production...
transforming...
✓ 155 modules transformed.
rendering chunks...
computing gzip size...
dist/registerSW.js               0.15 kB
dist/manifest.webmanifest        0.59 kB
dist/index.html                  1.28 kB │ gzip:  0.59 kB
dist/assets/index-1BZAWunR.css  13.72 kB │ gzip:  2.90 kB
dist/assets/index-BFXIll0p.js   85.09 kB │ gzip: 26.51 kB
✓ built in 299ms

PWA v1.3.0
mode      generateSW
precache  10 entries (97.91 KiB)
files generated
  dist/sw.js
  dist/workbox-835c8c05.js
```

### ls -la dist/fonts/
```
-rw-rw-r-- 1 user user 13340 arimo-cyrillic.woff2
-rw-rw-r-- 1 user user 20132 arimo-latin.woff2
-rw-rw-r-- 1 user user 18748 inter-cyrillic.woff2
-rw-rw-r-- 1 user user 48256 inter-latin.woff2
-rw-rw-r-- 1 user user 28068 literata-cyrillic.woff2
-rw-rw-r-- 1 user user 52496 literata-latin.woff2
-rw-rw-r-- 1 user user 20776 nunito-cyrillic.woff2
-rw-rw-r-- 1 user user 39128 nunito-latin.woff2
-rw-rw-r-- 1 user user 23664 roboto-cyrillic.woff2
-rw-rw-r-- 1 user user 43136 roboto-latin.woff2
-rw-rw-r-- 1 user user 18592 roboto-mono-cyrillic.woff2
-rw-rw-r-- 1 user user 32796 roboto-mono-latin.woff2
```
`file dist/fonts/inter-latin.woff2` -> `Web Open Font Format (Version 2), TrueType, length 48256, version 1.0`

### du -sh dist/fonts
```
376K	dist/fonts
```

### Прекэш
`grep -c '{url:' dist/sw.js` -> `1`, но это артефакт: минифицированный sw.js — одна строка, grep -c считает строки. Достоверный подсчёт `grep -o '{url:' dist/sw.js | wc -l` -> `10`, совпадает с отчётом плагина «precache 10 entries». Состав:
```
{url:"registerSW.js"
{url:"index.html"
{url:"assets/index-BFXIll0p.js"
{url:"assets/index-1BZAWunR.css"
{url:"icons/apple-touch-icon-180.png"
{url:"icons/icon-192.png"
{url:"icons/icon-512.png"
{url:"icons/icon-maskable-512.png"
{url:"icons/icon.svg"
{url:"manifest.webmanifest"
```
Ни одного woff2 в прекэше.

### Пути в собранном CSS
`grep -o "fonts/[^)\"']*" dist/assets/*.css | sort -u` — 12 файлов, все на месте. Полные url():
```
url(/secretar_v2/fonts/arimo-cyrillic.woff2)
url(/secretar_v2/fonts/arimo-latin.woff2)
url(/secretar_v2/fonts/inter-cyrillic.woff2)
url(/secretar_v2/fonts/inter-latin.woff2)
...
```
base подставлен верно. В сборке 12 @font-face и 12 `font-display:swap`. unicode-range сохранились (минификатор убрал ведущие нули, смысл не изменился):
```
unicode-range:U+301,U+400-45F,U+490-491,U+4B0-4B1,U+2116
unicode-range:U+??,U+131,U+152-153,U+2BB-2BC,U+2C6,U+2DA,U+2DC,U+304,U+308,U+329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD
```

### Маршрут в sw.js
```
registerRoute(/\/fonts\/[^/]+\.woff2$/,new e.CacheFirst({cacheName:"secretar-fonts",plugins:[new e.ExpirationPlugin({maxEntries:20,max...
```

## Итог и что осталось открытым
Изменены: src/lib/themes/v02, v07, v08, v17, v22, v24, v30.ts, src/main.ts, vite.config.ts. Добавлены: src/fonts.css, public/fonts/ (12 файлов). Коммит не делался.
Открытые вопросы:
1. **Georgia заменена на Literata, а не на Gelasio** — у Gelasio нет кириллицы (проверено). Literata немного современнее Georgia по рисунку; если владельцу важнее точная метрика, альтернатива — PT Serif (кириллица родная, но не вариативный: 4 файла вместо 2, +~50 КБ).
2. На Android темы с системными стеками теперь могут тянуть веб-Roboto (в стеке `Roboto` идёт раньше, чем находится системный). Рендер тот же (это и есть системный шрифт Android), цена — 43+24 КБ один раз, дальше из кэша. `local()` намеренно не добавлял: с вариативным диапазоном 100..900 браузер взял бы локальный Regular на все насыщенности и рисовал бы псевдожирный.
3. v17 просит `fontWeightHeading: 800`, у Roboto Mono максимум 700 — если до веб-шрифта дойдёт очередь (нет ни одного системного моноширинного), заголовок будет псевдожирным. Системные моноширинные в стеке стоят раньше, так что на практике случай редкий.
4. Визуально в браузере не проверялось — по условию задачи браузер не открывал.
