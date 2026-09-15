# Слой данных «Задача» — ход работы

## Старт
Дата: 2026-09-15
Задача: реализовать src/lib/tasks/{id,text,validate,sort,memory-repository,dexie-repository,repository}.ts + юнит-тесты, настроить vitest, прогнать проверки в docker.
Ограничения: types.ts не менять, тесты без БД, git commit/push не делать.

## Шаг 1. Чтение контракта и документации
Прочитано: src/lib/tasks/types.ts (контракт Task/NewTask/TaskPatch/TaskRepository), docs/architecture_storage.md, docs/req_tasks.md, docs/code_style.md, package.json, tsconfig.json, vite.config.ts.
Факты из tsconfig, влияющие на код: strict, noUnusedLocals/Parameters, exactOptionalPropertyTypes, verbatimModuleSyntax, isolatedModules, include = src/**/*.ts + vite.config.ts + svelte.config.js (значит тесты тоже проверяет svelte-check).
Расхождение docs и задания: architecture_storage.md описывает поле `description` и индексы recurrence/[recurrence+date], а согласованный контракт types.ts — поле `text`, задание требует индексы date/priority/[priority+date]. Следую types.ts и заданию, документацию не трогаю (docs/ вне границ).

## Шаг 2. Модули созданы
- src/lib/tasks/id.ts — UUID v7, счётчик в rand_a (12 бит) для монотонности в пределах миллисекунды, 62 бита из crypto.getRandomValues, защита от перевода часов назад.
- src/lib/tasks/text.ts — normalizeText (нижний регистр, ё→е, схлопывание пробелов), tokenize (разделитель \p{L}\p{N}, дедуп с сохранением порядка), parseSearchQuery, matchesSearchQuery, DEFAULT_SEARCH_LIMIT=20.
- src/lib/tasks/validate.ts — VALIDATION_MESSAGES, ValidationResult<T>, NewTaskInput (priority: string), isPriority, isLeapYear, daysInMonth, isCalendarDate, validateNewTask. Ручной разбор даты: new Date('2026-02-31') молча даёт 3 марта.
- src/lib/tasks/sort.ts — compareTasksInDay (high<medium<low, затем id), sortTasksForDay, sortTasksByDate.
- src/lib/tasks/memory-repository.ts — MemoryTaskRepository, копии объектов наружу и внутрь.
- src/lib/tasks/dexie-repository.ts — DexieTaskRepository, схема 'id, date, priority, [priority+date], *searchTokens, updatedAt', версия 1; update/remove в транзакции rw; поиск по самому длинному токену через startsWith + filter + limit (ранний выход по курсору).
- src/lib/tasks/repository.ts — createTaskRepository(): TaskRepository -> DexieTaskRepository.
Решение по Dexie: без наследования класса Dexie (поля класса при useDefineForClassFields затирают таблицы, которые Dexie проставляет сам) — db.table<Task,string>('tasks').

## Шаг 3. Тесты и конфигурация
Файлы тестов: id.test.ts (8), text.test.ts (28), validate.test.ts (30), sort.test.ts (13), memory-repository.test.ts (31). Итого 110 тестов, все данные — литералы в коде теста.
package.json: добавлены dependencies dexie 4.4.6; devDependencies vitest 5.0.0 и @vitest/coverage-v8 5.0.0; скрипты test = "vitest run", test:coverage = "vitest run --coverage".
vitest.config.ts: environment node, include src/**/*.test.ts, coverage provider v8, из покрытия исключены types.ts (контракт), dexie-repository.ts и repository.ts (слой доступа к базе, тестами не покрывается по правилу проекта).
tsconfig.json: в include добавлен vitest.config.ts (чтобы svelte-check проверял и его).

## Шаг 4. Проверки (вывод дословно)
Команда: docker run --rm -v "$PWD":/app -w /app --user "$(id -u):$(id -g)" -e npm_config_cache=/tmp/.npm node:22-alpine sh -c "npm install && npm run check && npm run test && npm run build"

up to date, audited 392 packages in 1s
found 0 vulnerabilities

> secretar@0.1.0 check
> svelte-check --tsconfig ./tsconfig.json
Loading svelte-check in workspace: /app
Getting Svelte diagnostics...
svelte-check found 0 errors and 0 warnings

> secretar@0.1.0 test
> vitest run
 RUN  v5.0.0 /app
 ✓ src/lib/tasks/validate.test.ts (30 tests) 11ms
 ✓ src/lib/tasks/sort.test.ts (13 tests) 9ms
 ✓ src/lib/tasks/text.test.ts (28 tests) 16ms
 ✓ src/lib/tasks/memory-repository.test.ts (31 tests) 25ms
 ✓ src/lib/tasks/id.test.ts (8 tests) 171ms
 Test Files  5 passed (5)
      Tests  110 passed (110)
   Duration  336ms

> secretar@0.1.0 build
> vite build
vite v8.3.0 building client environment for production...
✓ 173 modules transformed.
dist/registerSW.js                0.15 kB
dist/manifest.webmanifest         0.59 kB
dist/index.html                   1.28 kB │ gzip:  0.59 kB
dist/assets/index-BYnNVGaU.css   21.06 kB │ gzip:  3.84 kB
dist/assets/index-DfFUYEr8.js   199.45 kB │ gzip: 63.88 kB
✓ built in 346ms
PWA v1.3.0 mode generateSW, precache 10 entries (216.75 KiB)

Покрытие (npm run test:coverage), дословно:
 % Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|-------------------
All files          |     100 |      100 |     100 |     100 |
 id.ts             |     100 |      100 |     100 |     100 |
 ...-repository.ts |     100 |      100 |     100 |     100 |
 sort.ts           |     100 |      100 |     100 |     100 |
 text.ts           |     100 |      100 |     100 |     100 |
 validate.ts       |     100 |      100 |     100 |     100 |
-------------------|---------|----------|---------|---------|-------------------
Первый прогон покрытия дал 98.46% (id.ts 95%, ветка переполнения счётчика, строки 58-59) — добавлен тест «переполнение счётчика занимает следующую миллисекунду», после него 100%.

Проверка отсутствия обращений к БД в тестах:
$ grep -rn "Dexie\|indexedDB" src/lib/tasks/*.test.ts
(пусто, код возврата 1)

## Шаг 5. Проверка поведения Dexie по исходникам пакета (не на веру)
node_modules/dexie/dist/dexie.js:2026-2027: var filter = ctx.replayFilter ? combine(ctx.filter, ctx.replayFilter()) : ctx.filter;
combine (строка 1241) вычисляет filter1 && filter2, а limit добавляется через addReplayFilter (строка 2213). Значит .filter() отрабатывает раньше счётчика .limit(): лимит считает только подходящие записи, обход курсора прекращается по достижении лимита — ранний выход в search() действительно есть.
dexie.d.ts:125 startsWith, :400 distinct, :429 limit — API подтверждено по типам пакета.

## Итог
Готово: 7 модулей + 5 файлов тестов, 110 тестов зелёные, покрытие тестируемых модулей 100%, svelte-check 0 ошибок, сборка проходит.
Не закрыто намеренно: dexie-repository.ts и repository.ts автотестами не покрыты (правило «автотесты не обращаются к БД»), их работа проверяется только запуском приложения. Коммит и пуш не делались.

## Стыковка с агентом по экранам
src/lib/task-repository.ts (файл параллельного агента) импортирует createTaskRepository из './tasks/repository' и держит единственный экземпляр — имя и сигнатура фабрики совпадают, расхождений нет. Экземпляр создаётся на загрузке модуля; соединение Dexie открывает лениво, при первой операции, так что импорт сам по себе базу не трогает.
