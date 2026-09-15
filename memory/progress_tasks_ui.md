# Экраны работы с задачами (UI) — прогресс

Старт: 2026-09-15. Агент UI. Каталог: /media/user/H_SSD_32/projects/secretar_v2
Задача: Т-25 (кнопка +), Т-26 (модалка создания), Т-27 (список задач дня), Т-28 (полноэкранный просмотр), метки сетки по реальным данным.
Границы: src/lib/tasks/** не трогаю (только читаю types.ts), темы/доки/конфиги не трогаю.

## Шаг 0. Чтение контекста
Прочитано: src/lib/tasks/types.ts (Task/NewTask/Priority/TaskRepository/PRIORITY_LABELS/DEFAULT_PRIORITY),
docs/req_screens.md (Т-18, Т-25…Т-28), docs/design_tokens.md (правило 1: только токены, исключение — зелёная галочка),
src/routes/CalendarScreen.svelte, src/App.svelte, src/lib/router.svelte.ts, src/lib/components/BottomNav.svelte,
src/app.css (набор токенов и --space-*/--nav-height), src/routes/SettingsScreen.svelte, ThemePickerScreen.svelte, CLAUDE.md, docs/code_style.md.

Факты:
- Метки в сетке сейчас демонстрационные (функция demoMarks по seed от даты) — подлежат замене.
- Соответствие приоритет→токен зафиксировано в docs/design_tokens.md: high=--color-task-c, medium=--color-task-a, low=--color-task-b.
- В src/lib/tasks/ на момент старта только types.ts; repository.ts пишет параллельный агент.
- Роутер статический (union из трёх строк) — нужен параметризованный маршрут задачи.
- Прежний grep-шаблон "#[0-9a-fA-F]{3,8}" даёт ложные срабатывания на `{#each ...}` (совпадает "#eac").

## Шаг 2. План реализации
Новые файлы: src/lib/date.ts, src/lib/priority.ts, src/lib/task-repository.ts (единый экземпляр хранилища),
src/lib/calendar-state.svelte.ts (выбранный день и показываемый месяц переживают уход на экран задачи),
src/lib/components/TaskCreateModal.svelte, src/lib/components/DayTaskList.svelte, src/routes/TaskScreen.svelte.
Правки: src/lib/router.svelte.ts (маршрут /task/:id), src/App.svelte, src/lib/components/BottomNav.svelte (вкладка «Календарь» активна и на задаче),
src/routes/CalendarScreen.svelte (кнопка +, выбор дня, список дня, метки по реальным данным).

## Шаг 3. Код написан
Создано:
- src/lib/date.ts — toIsoDate/todayIso/isIsoDate/formatLongDate; преобразования через локальные поля Date (toISOString сдвигает день).
- src/lib/priority.ts — PRIORITY_COLOR (high→var(--color-task-c), medium→var(--color-task-a), low→var(--color-task-b)), PRIORITY_ORDER=[high,medium,low].
- src/lib/task-repository.ts — единый экземпляр createTaskRepository() на приложение.
- src/lib/calendar-state.svelte.ts — viewYear/viewMonth/selectedDate вне компонента: возврат с экрана задачи не теряет выбранный день и месяц.
- src/lib/components/TaskCreateModal.svelte — Т-26: текст (textarea), дата (input type=date), приоритет (радиогруппа-чипы), валидация по-русски у поля, кнопка «Сохранить» неактивна при пустых полях, Esc/фон/«Отмена» закрывают, ловушка фокуса Tab, фокус возвращается на кнопку «+».
- src/lib/components/DayTaskList.svelte — Т-27: заголовок «Задачи на <дата>», строка-ссылка с цветной меткой приоритета, текст в одну строку с многоточием, пустое состояние «На этот день задач нет.».
- src/routes/TaskScreen.svelte — Т-28: полный текст (white-space: pre-wrap, overflow-wrap: anywhere), дата, приоритет, кнопка закрытия (ссылка на #/calendar), Esc возвращает к календарю.
Изменено:
- src/lib/router.svelte.ts — добавлен маршрут '/task' с параметром (#/task/<id>), StaticRoute для go/href, router.taskId, hrefTask(id); нормализация хэша учитывает параметр.
- src/App.svelte — ветка маршрута '/task'.
- src/lib/components/BottomNav.svelte — вкладка «Календарь» активна и на экране задачи.
- src/routes/CalendarScreen.svelte — demoMarks удалён; метки из listByRange по диапазону сетки, ячейки стали кнопками (role=gridcell + button внутри строк role=row), выбор дня токеном --color-selected, кнопка «+» fixed с env(safe-area-inset-*), список задач дня, перечитывание после сохранения (reloadToken).
Слой данных на момент проверки: src/lib/tasks/repository.ts уже есть, createTaskRepository(): TaskRepository.

## Шаг 4. Проверка (прогон 1 и 2)
Команда: docker run --rm -v "$PWD":/app -w /app --user "$(id -u):$(id -g)" -e npm_config_cache=/tmp/.npm node:22-alpine sh -c "npm run check && npm run build"
Прогон 1: svelte-check found 8 errors and 1 warning in 7 files.
 - 8 ошибок — в файлах слоя данных (src/lib/tasks/dexie-repository.ts, *.test.ts): не установлены зависимости dexie и vitest. Чужая зона, не трогаю.
 - 1 предупреждение — моё: TaskCreateModal.svelte:28 state_referenced_locally на `let date = $state(initialDate)`.
Исправление: `let date = $state(untrack(() => initialDate))` + комментарий, почему дата берётся один раз.
Прогон 2: svelte-check found 9 errors and 0 warnings in 7 files — все девять в чужих файлах (dexie/vitest ещё не установлены, добавился vitest.config.ts). В моих файлах ошибок и предупреждений нет.
Сборка (npm run build) пока не выполнялась: падает `npm run check` в цепочке && . Жду установки зависимостей слоя данных и повторяю.

## Шаг 5. Проверка литеральных цветов
Команда: grep -rn "#[0-9a-fA-F]\{3,8\}" src/routes src/lib/components
Вывод дословно:
src/lib/components/DayTaskList.svelte:41:      {#each tasks as task (task.id)}
src/lib/components/TaskCreateModal.svelte:186:          {#each PRIORITY_ORDER as value (value)}
src/routes/CalendarScreen.svelte:302:      {#each WEEKDAYS as weekday, index (weekday)}
src/routes/CalendarScreen.svelte:308:      {#each weeks as week (week[0].iso)}
src/routes/CalendarScreen.svelte:310:          {#each week as cell (cell.iso)}
src/routes/CalendarScreen.svelte:329:                  {#each marks.get(cell.iso) ?? [] as priority (priority)}
src/routes/CalendarScreen.svelte:434:        {#each MONTHS_SHORT as month, index (month)}
src/routes/ThemePickerScreen.svelte:44:      {#each themes as theme (theme.id)}
src/routes/ThemePickerScreen.svelte:61:                  <circle cx="24" cy="24" r="22" fill="#22c55e" />
src/routes/ThemePickerScreen.svelte:65:                    stroke="#ffffff"
src/routes/ThemePickerScreen.svelte:219:    background: color-mix(in srgb, #22c55e 20%, transparent);
Разбор: все строки с `{#each` — ложные срабатывания шаблона (подстрока "#eac" из "#each" состоит из hex-символов). Настоящие литеральные цвета — только три строки ThemePickerScreen.svelte (зелёная галочка выбранной темы, разрешённое исключение, файл не трогал). В моих файлах литеральных цветов нет: цвета приоритетов заданы токенами через src/lib/priority.ts (var(--color-task-*)).

## Шаг 6. Проверка (прогон 3, после установки dexie и vitest) — ЧИСТО
Команда: docker run --rm -v "$PWD":/app -w /app --user "$(id -u):$(id -g)" -e npm_config_cache=/tmp/.npm node:22-alpine sh -c "npm run check && npm run build"
Вывод дословно:
> secretar@0.1.0 check
> svelte-check --tsconfig ./tsconfig.json
Loading svelte-check in workspace: /app
Getting Svelte diagnostics...
svelte-check found 0 errors and 0 warnings
> secretar@0.1.0 build
> vite build
vite v8.3.0 building client environment for production...
transforming...
✓ 173 modules transformed.
rendering chunks...
computing gzip size...
dist/registerSW.js                0.15 kB
dist/manifest.webmanifest         0.59 kB
dist/index.html                   1.28 kB │ gzip:  0.59 kB
dist/assets/index-BYnNVGaU.css   21.06 kB │ gzip:  3.84 kB
dist/assets/index-DfFUYEr8.js   199.45 kB │ gzip: 63.88 kB
✓ built in 325ms
PWA v1.3.0
mode      generateSW
precache  10 entries (216.75 KiB)
files generated
  dist/sw.js
  dist/workbox-835c8c05.js
Предупреждений компилятора Svelte (в т.ч. неиспользуемых CSS-селекторов) в сборке нет.

## Шаг 7. Итог
Проверки: svelte-check — 0 ошибок, 0 предупреждений; vite build — успешно; литеральных цветов в моих файлах нет.
TODO/FIXME/заглушек нет (grep по изменённым и новым файлам — пусто).
git status: мои изменения — src/App.svelte, src/lib/components/BottomNav.svelte, src/lib/router.svelte.ts, src/routes/CalendarScreen.svelte + новые src/lib/{date.ts,priority.ts,task-repository.ts,calendar-state.svelte.ts}, src/lib/components/{TaskCreateModal,DayTaskList}.svelte, src/routes/TaskScreen.svelte. Изменения package.json/package-lock.json/tsconfig.json/vitest.config.ts и src/lib/tasks/ — чужие (слой данных). Коммит и пуш не делал.
Решения, которые стоит знать проверяющему:
- Состояние календаря (месяц и выбранный день) вынесено в src/lib/calendar-state.svelte.ts, иначе возврат с экрана задачи по кнопке «назад» терял выбранный день.
- Нижняя навигация на экране задачи остаётся видимой (требование Т-18), активна вкладка «Календарь».
- Ячейки сетки стали кнопками внутри строк role="row" и ячеек role="gridcell": кнопка с role="gridcell" вызывала бы конфликт ролей.
- Экран задачи только просматривает: правки и удаления в требовании Т-28 нет.
Не закрыто: проверка в браузере (по условиям задачи — отдельно), экран задачи без редактирования и удаления (вне Т-28).
