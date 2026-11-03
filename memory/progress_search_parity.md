---
name: progress_search_parity
description: Отчёт агента — выравнивание search у MemoryTaskRepository и DexieTaskRepository при выдаче длиннее limit
type: project
---
# Паритет search двух реализаций (выдача длиннее limit)

## Факты по коду (2026-11-03)
1. Dexie, src/lib/tasks/dexie-repository.ts:237-247: токен обхода `indexKey` — самый длинный токен запроса, при равной длине первый (reduce со строгим `>`, :237-239). Цепочка: `where('searchTokens').startsWith(indexKey).distinct().filter(matchesSearchQuery).limit(limit).toArray()`, затем `sortTasksByDate(found)` (:249).
2. Dexie 4.4.6 (node_modules/dexie/package.json:3), node_modules/dexie/dist/dexie.mjs:
   - startsWith = `between(str, str + maxString, true, true)` (:2744-2748), maxString = '￿' (:1226). Курсор IndexedDB идёт по ключу индекса (токен, сравнение строк по UTF-16 code units — как `<` в JS), при равном ключе — по первичному ключу id.
   - distinct() (:2339-2350): для multiEntry-индекса фильтр по `cursor.primaryKey` — задача берётся в первой позиции курсора, т.е. на НАИМЕНЬШЕМ своём токене с префиксом indexKey; повторные позиции отбрасываются.
   - filter() и distinct() складываются в ctx.filter через combine (:1983-1985, :1235-1243); limit() — replayFilter (:2207-2217), в iter() применяется ПОСЛЕ ctx.filter (:2019-2023) → limit считает только записи, прошедшие distinct и matchesSearchQuery. Если первая позиция задачи не прошла filter, distinct её всё равно пометил, но matchesSearchQuery зависит только от задачи, а не от позиции, — последующие позиции тоже не прошли бы. Расхождения нет.
   - Токены — только буквы/цифры (src/lib/tasks/text.ts:15, :36-50, повторы убраны), '￿' не буква, поэтому верхняя граница диапазона startsWith ничего не отсекает.
3. Вывод: Dexie отбирает первые `limit` задач, прошедших matchesSearchQuery, в порядке (наименьший токен задачи с префиксом indexKey, затем id), и потом сортирует sortTasksByDate.
4. Память, src/lib/tasks/memory-repository.ts:141-145 (до правки): фильтр matchesSearchQuery по всем задачам, sortTasksByDate, slice(0, limit). Отбор — по итоговой сортировке (дата, приоритет, id), а не по порядку индекса. Это и есть расхождение.
5. sortTasksByDate (src/lib/tasks/sort.ts:48-56 + compareTasksInDay :19-31) — полный порядок (дата, приоритет, id), поэтому при одинаковом наборе итоговый порядок у реализаций совпадает независимо от входного порядка.
6. matchesSearchQuery (text.ts:76-94) требует, чтобы каждый токен запроса был префиксом какого-то токена задачи, — значит у прошедшей задачи всегда есть хотя бы один токен с префиксом indexKey (indexKey — один из токенов запроса).
7. Использование MemoryTaskRepository: grep по src — только src/lib/tasks/memory-repository.test.ts (импорт :2) и упоминание в комментарии dexie-repository.ts:4. В приложении запасным путём не используется.

## Правка кода
- src/lib/tasks/memory-repository.ts, search (:134-): после matchesSearchQuery каждой задаче вычисляется ключ курсора — наименьший её токен с префиксом indexKey (indexKey — самый длинный токен запроса, тот же reduce со строгим `>`, что dexie-repository.ts:237-239); кандидаты сортируются по (ключ, id) сравнением строк `<` (code units, как IndexedDB), берутся первые limit, затем sortTasksByDate и копии. Комментарий у места отбора — что порядок повторяет курсор Dexie и почему (Т-8).
- dexie-repository.ts, text.ts, sort.ts не тронуты. Выбор indexKey продублирован (3 строки) — вынос в text.ts потребовал бы правки dexie-repository.ts; оставлено как альтернатива (плюс — паритет выбора токена структурный; минус — правка слоя БД, который не покрыт тестами).
- Явное сравнение по id нужно: в памяти порядок Map совпадает с порядком id только пока все id выданы монотонным createId; контракт — порядок id, а не вставки.

## Тесты (src/lib/tasks/memory-repository.test.ts)
- vi.mock('./id') со сквозным createId по умолчанию (vi.fn(actual.createId)); подмена mockReturnValueOnce — только в тесте на разрыв по id. Остальные тесты получают настоящие id.
- Новый describe «выдача длиннее лимита — отбор в порядке индекса, как курсор Dexie», 6 тестов: limit+1 (отбрасывается последнее по токену), ровно limit, одинаковый токен → по id (id-c, id-a, id-b вне порядка создания и дат), дубль токенов на префикс у одной задачи (наименьший токен вторым и первым по счёту, задача один раз), два слова — длинный токен первым («зеленый ч»), два слова — длинный токен вторым («и молоко»).

## Проверка, что тесты падают на прежнем коде
- Прежний memory-repository.ts взят `git show HEAD:...`, прогон vitest memory-repository.test.ts: Tests 5 failed | 47 passed (52). Упали все новые, кроме «ровно limit» (граничный случай, где обрезки нет, — на старом коде и должен проходить). Пример: «одинаковый токен → по id»: expected ['id-b','id-a'], received ['id-c','id-b'].
- Правка восстановлена из копии в scratchpad/search/search_agent_memory-repository.new.ts, cmp — совпадает (RESTORED).
- На новом коде: src/lib/tasks — 6 файлов, 192 теста, memory-repository.ts 100/100/100/100 (первый прогон показал непокрытую ветку reduce :147 — добавлен тест «и молоко», где длинный токен второй).

## Полная проверка (контейнер node:22-alpine, test:coverage && check && build)
- EXIT=0. Test Files 7 passed, Tests 214 passed (было 208, +6). Покрытие All files 100/100/100/100 (date.ts, id.ts, memory-repository.ts, recurrence.ts, sort.ts, text.ts, validate.ts). svelte-check: 0 errors, 0 warnings. vite build: built in 334ms. Файлы тем другого агента сборку не ломали.

## Документация
- docs/mechanic_tasks.md: пункт о расхождении search удалён из «Известных границ»; «## Сервисы» — у memory-repository.ts описан порядок отбора search; «### Тесты» — 214 тестов в семи файлах, абзац о шести тестах паритета.
- docs/architecture_storage.md, «Поиск по описанию»: пункт 4 описывает контракт порядка при limit (токен обхода, курсор по токену затем id, distinct на наименьшем токене, затем сортировка по дате/приоритету/id; память воспроизводит); фраза о расхождении из «Что из этого пока не сделано» удалена.
- Не тронуты (сводные места — за постановщиком): docs/history_sessions.md, memory/findings_review_a12.md, memory/new-session-prompt.md — в них ещё упоминается расхождение.
- Коммит и пуш не выполнялись (по постановке).

## Доработка после скептика (2026-11-03, Claude)
- Находка: тест «по наименьшему токену» не ловил подмены «первый токен текста» и «наибольший токен». Добавлена задача «Молоко» и проверка search('мол', 1); добавлен тест «при токенах запроса равной длины обходит индекс по первому».
- Мутации в memory-repository.ts (каждая — 1 failed | 52 passed): `.reduce(наименьший)` -> `[0]`; `<` -> `>` в выборе наименьшего; `>` -> `>=` в выборе токена обхода. Исходник восстановлен, cmp подтвердил.
