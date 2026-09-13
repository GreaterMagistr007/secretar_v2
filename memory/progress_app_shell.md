# Каркас приложения «Секретарь» (агент app_shell)

## Задача
Роутинг, нижняя навигация, три экрана, система применения тем.
Каталог: /media/user/H_SSD_32/projects/secretar_v2

## Ход работы
- Старт. Создан файл отчёта.

## Прочитано
- docs/design_tokens.md — 39 токенов, правило «в компонентах только var(--…)».
- src/lib/themes/types.ts — контракт Theme/ThemeTokens/CSS_VARIABLES (не менял).
- docs/req_screens.md — Т-18…Т-23.
- src/App.svelte, src/app.css, src/main.ts, index.html, vite.config.ts (base '/secretar_v2/'), tsconfig (strict, noUnusedLocals, verbatimModuleSyntax).
- public/gallery/v01.html — макеты нарисованы под ширину телефона (.screen max-width:430px), отсюда размеры превью в iframe.

## Создано (шаг 1)
- src/lib/themes/index.ts — сбор тем через import.meta.glob('./v*.ts', eager), сортировка по id, findTheme(id). Пустой список допустим.
- src/lib/themes/apply.ts — applyTheme (перебор CSS_VARIABLES), colorScheme по theme.dark, meta theme-color = colorPrimary (медиа-заготовки из index.html удаляются, иначе перебивают выбор), saveThemeId/loadThemeId с try/catch на каждое обращение к localStorage, ключ 'secretar.theme'.
- src/lib/router.svelte.ts — хэш-роутинг, $state, hashchange, нормализация неизвестного хэша в #/calendar.

### Отступление от задания (обосновано)
Файл роутера назван router.svelte.ts, а не router.ts: руны Svelte 5 ($state) компилируются только в .svelte и .svelte.js/.svelte.ts. В обычном .ts $state остался бы неизвестной функцией и упал бы в рантайме. Импорт в компонентах — './lib/router.svelte'.

## Создано (шаг 2)
- src/lib/components/BottomNav.svelte — фиксированная панель внизу, две вкладки, инлайновые SVG (календарь, шестерёнка), активная вкладка --nav-text-active, padding-bottom: env(safe-area-inset-bottom). Вкладка «Настройки» активна и на #/settings/theme.
- src/routes/CalendarScreen.svelte — месяц от new Date(), сетка 6 недель с понедельника, сегодня --color-today/--color-on-today, выходные --color-weekend, дни соседних месяцев приглушены, демонстрационные метки трёх категорий (детерминированная функция от даты, не пляшут при перерисовке), легенда. Шапка-кнопка «Сентябрь 2026» открывает модалку: 12 месяцев, переключение года стрелками, текущий месяц обведён, показываемый залит --color-primary, закрытие по фону и Esc.
- src/routes/SettingsScreen.svelte — одна кнопка «Выбор темы» (ссылка на #/settings/theme) токенами основной кнопки.
- src/routes/ThemePickerScreen.svelte — сетка карточек по всем темам, превью в iframe ${BASE_URL}gallery/${id}.html, loading=lazy, transform: scale(0.4) (макет 390x650 -> карточка 156x260), pointer-events: none на iframe, клик ловит прозрачная кнопка поверх карточки. Выбранная тема — крупная зелёная галочка 76px поверх превью (круг #22c55e, галка #ffffff) плюс зелёная заливка-подсветка; цвета литералами по заданию.
- src/App.svelte — переписан: применение сохранённой темы до первой отрисовки, вывод экрана по router.current, BottomNav на всех экранах, запас снизу под панель. Прежний экран с заголовком и ссылкой на демо убран.
- src/app.css — переписан: все 39 токенов со значениями по умолчанию на :root плюс тёмный вариант по prefers-color-scheme; отдельно нетемовые --space-xs/sm/md/lg, --nav-height, --font-size-base. applyTheme ставит инлайновые стили на <html> и перекрывает эти значения.
- src/main.ts — без изменений, монтирование уже корректное.

Поведение при отсутствии сохранённой темы: ничего не применяется, приложение работает на значениях app.css, галочка не стоит ни на одной карточке. Автовыбор v01 не делал — это был бы выбор за владельца.

## Проверки (дословно)

### docker run ... npm run check && npm run build (все 30 тем на месте)
```
> secretar@0.1.0 check
> svelte-check --tsconfig ./tsconfig.json

Loading svelte-check in workspace: /app
Getting Svelte diagnostics...

svelte-check found 0 errors and 0 warnings

> secretar@0.1.0 build
> vite build

vite v8.3.0 building client environment for production...
transforming...
✓ 154 modules transformed.
rendering chunks...
computing gzip size...
dist/registerSW.js               0.15 kB
dist/manifest.webmanifest        0.59 kB
dist/index.html                  1.28 kB │ gzip:  0.59 kB
dist/assets/index-DGKDNv8G.css  10.39 kB │ gzip:  2.46 kB
dist/assets/index-Bvn3LbeD.js   85.14 kB │ gzip: 26.51 kB

✓ built in 249ms

PWA v1.3.0
mode      generateSW
precache  10 entries (94.70 KiB)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js
```
Пустой список тем сборку не ломал и на первом прогоне (тем было меньше): index.ts фильтрует модули без default, ThemePickerScreen показывает «Темы ещё не подготовлены».

### grep -rn "#[0-9a-fA-F]\{3,8\}" src/routes src/lib/components
```
src/routes/CalendarScreen.svelte:169:      {#each WEEKDAYS as weekday, index (weekday)}
src/routes/CalendarScreen.svelte:175:      {#each cells as cell (cell.key)}
src/routes/CalendarScreen.svelte:185:            {#each cell.marks as mark (mark)}
src/routes/CalendarScreen.svelte:246:        {#each MONTHS_SHORT as month, index (month)}
src/routes/ThemePickerScreen.svelte:44:      {#each themes as theme (theme.id)}
src/routes/ThemePickerScreen.svelte:61:                  <circle cx="24" cy="24" r="22" fill="#22c55e" />
src/routes/ThemePickerScreen.svelte:65:                    stroke="#ffffff"
src/routes/ThemePickerScreen.svelte:198:    background: color-mix(in srgb, #22c55e 20%, transparent);
```
Строки с `{#each` — ложные срабатывания шаблона (`#eac` — подходящие символы). Настоящих литералов три, все в зелёной галочке: круг #22c55e, галка #ffffff, подсветка color-mix от #22c55e. Это оговорённое исключение.

### grep -rnE "rgb\(|rgba\(|hsl\(|: *(white|black|red|green|blue)\b" src/routes src/lib/components
Пусто (exit=1).

### Проверка переменных: все var(--…) в src определены
Использованные переменные сверены с :root в app.css и с CSS_VARIABLES из types.ts. Не найдены только --frame-width/--frame-height/--preview-width/--preview-height/--preview-scale — они локальные, объявлены в .cards в самом ThemePickerScreen и наследуются потомками. Старые --color-accent и --font-size-title из src убраны полностью.

### Проверка, что темы попали в бандл
`grep -o 'v[0-9][0-9]' dist/assets/index-*.js | sort -u` -> v01 … v30 (все 30), «Ясный» найден. import.meta.glob собирает темы без ручного списка.

## Незакрытое
- Роутер лежит в src/lib/router.svelte.ts вместо router.ts (руны). Импорт — '../lib/router.svelte'.
- В браузере не проверял: тестирует отдельный агент. Публикацию не запускал, коммитов нет.
- Раскладка календаря временная, как и задано: итоговую выбирает владелец.
