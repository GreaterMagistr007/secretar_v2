# Прогресс: слой данных повторений и отметок (шаги 1–6 плана этапа 3)

## Старт
План `docs/plan_stage_03_recurrence_completions.md` (редакция 2) прочитан целиком.
Прочитаны все файлы, которые правлю: `types.ts`, `validate.ts`, `sort.ts`, `memory-repository.ts`,
`dexie-repository.ts`, `src/lib/date.ts` и три тестовых файла.

Что понял по объёму:
- шаг 1: в `types.ts` — `DEFAULT_RECURRENCE`, `RECURRENCE_LABELS`, `RECURRENCE_ORDER`, интерфейсы
  `Completion` и `Occurrence`; `NewTask.recurrence` обязательное; в `TaskRepository` удаляются
  `listByDate`/`listByRange`, добавляются `listOccurrencesByDate`/`listOccurrencesByRange`/`setCompleted`;
- шаг 2: новый `recurrence.ts` — `occursOn`, `occurrencesInRange`, приватные `nextDay` (числовая
  арифметика, без `Date`) и `dayNumber` (`Date.UTC` + `setUTCFullYear`); `daysInMonth` импортом из `./validate`;
- шаг 3: `isRecurrence`, сообщение `recurrenceUnknown`, `NewTaskInput.recurrence: string`;
- шаг 4: `sortOccurrences` вместо `sortTasksForDay` (последняя удаляется вместе с импортами);
- шаг 5: `MemoryTaskRepository` — `Set<string>` отметок с ключом `taskId|occurrenceDate`, каскад в `remove`;
- шаг 6: Dexie — схема версии 2, таблица `completions`, `recurrence: data.recurrence` в `create`,
  транзакция `remove` по двум таблицам.

Начинаю с шага 1 (контракт), затем шаг 2 (новый модуль), далее по порядку; тесты правлю после
изменения кода, прогон в контейнере — в конце.

## Шаг 1 — контракт `src/lib/tasks/types.ts` — сделано
- добавлены `DEFAULT_RECURRENCE`, `RECURRENCE_LABELS`, `RECURRENCE_ORDER` (после `PRIORITY_LABELS`);
- добавлены интерфейсы `Completion` и `Occurrence` (после `TaskPatch`);
- `NewTask` получил обязательное поле `recurrence: Recurrence`;
- в `TaskRepository` удалены `listByDate` и `listByRange`, добавлены `listOccurrencesByDate`,
  `listOccurrencesByRange`, `setCompleted`;
- поправлены два комментария, ставшие ложными: шапка модуля (добавлены Т-4 и Т-5) и комментарий
  поля `Task.recurrence` (убрана фраза «в форме не показывается, у новых задач всегда 'none'» —
  форма его теперь передаёт). Больше в файле ничего не менялось.

## Шаг 2 — новый модуль `src/lib/tasks/recurrence.ts` — сделано
Создан `src/lib/tasks/recurrence.ts`: экспортируются `occursOn` и `occurrencesInRange`,
приватные — `pad`, `parts`, `nextDay`, `dayNumber`. `daysInMonth` берётся импортом из `./validate`,
второй такой функции нет. `toIsoDate`/`todayIso` не импортируются, локальные поля Date не читаются.
`dayNumber` использует `new Date(0)` и `setUTCFullYear(year, month - 1, day)` — год ставится
не аргументом `Date.UTC`, как предписано планом.

Приватная `parts(iso)` (разбор строки на год/месяц/день) в плане не названа: заведена, потому что
одни и те же три `slice` нужны в `occursOn`, `nextDay` и `dayNumber` — иначе три копии разбора.

Создан `src/lib/tasks/recurrence.test.ts`, 39 тестов: все пункты списка шага 2 плана, включая
−7/−14 для weekly, «то же число месяцем/годом ранее старта» для monthly/yearly, переносы 31 января
и 29 февраля, переходы через конец месяца и года через публичные функции, пустые результаты
и сортировку диапазона.

## Шаг 3 — `src/lib/tasks/validate.ts` — сделано
- `VALIDATION_MESSAGES.recurrenceUnknown = 'Неизвестное повторение'`;
- `NewTaskInput.recurrence: string` (комментарий интерфейса поправлен под два строковых поля);
- закрытый перечень `RECURRENCES` и `isRecurrence(value): value is Recurrence` по образцу `isPriority`;
- в `validateNewTask` повторение проверяется и попадает в `value`; сужение типа — тем же приёмом,
  что у приоритета (повторная проверка на `null` в условии выхода);
- в шапке модуля к требованиям добавлено Т-4.

## Шаг 4 — `src/lib/tasks/sort.ts` — сделано
- `sortTasksForDay` удалена, вместо неё `sortOccurrences(occurrences)`: по `date` как строкам,
  при равенстве — `compareTasksInDay(a.task, b.task)`;
- `sortTasksByDate` и `compareTasksInDay` оставлены без изменений;
- в импорт типов добавлен `Occurrence`.

## Шаг 5 — `src/lib/tasks/memory-repository.ts` — сделано
- `private readonly completions = new Set<string>()`, ключ `${taskId}|${occurrenceDate}` через
  приватную статическую `completionKey`;
- `create` пишет `recurrence: data.recurrence`;
- `listByDate`/`listByRange` заменены на `listOccurrencesByDate`/`listOccurrencesByRange`;
  оба собирают `Occurrence` приватным методом `occurrence(task, date)` (копия задачи + `done`)
  и отдают через `sortOccurrences`;
- добавлен `setCompleted`;
- `remove` снимает все отметки задачи по префиксу `${id}|` (каскад);
- импорт `sortTasksForDay` снят, добавлены `sortOccurrences`, `occursOn`, `occurrencesInRange`.

## Шаг 6 — `src/lib/tasks/dexie-repository.ts` — сделано
- `SCHEMA_VERSION = 2`; версия 1 оставлена нетронутой, добавлена `version(2).stores({ tasks:
  TASKS_SCHEMA_V2, completions: COMPLETIONS_SCHEMA })`; `upgrade` не нужен;
- поле `private readonly completions: Table<Completion, [string, string]>` и его создание
  в конструкторе с тем же составным типом ключа;
- **6.2 выполнено: в `create` стоит `recurrence: data.recurrence`** (было жёсткое `'none'`);
- `listOccurrencesByDate` и `listOccurrencesByRange` — два запроса по задачам (индекс `date`
  с фильтром `recurrence === 'none'` и индекс `recurrence` с `anyOf(RECURRING)`), плюс запрос
  отметок по `occurrenceDate` (`equals` и `between`); ключи отметок собирает приватная статическая
  `completionKeys`, форма ключа совпадает с реализацией в памяти;
- `setCompleted` — `put` с `completedAt: Date.now()` либо `delete([taskId, occurrenceDate])`;
- **6.3 `remove`: транзакция перечисляет обе таблицы** — `this.db.transaction('rw', this.tasks,
  this.completions, …)`, после удаления задачи удаляются её отметки по индексу `taskId`;
- импорт `sortTasksForDay` снят, добавлены `sortOccurrences`, `occursOn`, `occurrencesInRange`,
  типы `Completion`, `Occurrence`, `Recurrence`.

## Тесты шагов 3 и 4 — сделано
`validate.test.ts`:
- 9 однострочных вызовов `validateNewTask` дописаны `recurrence: 'none'` через `perl` и развёрнуты
  в многострочную форму (иначе строки уходили за 100 знаков); `git diff` просмотрен — задето только
  то, что нужно, посторонних совпадений `priority` не тронуто;
- десятый вызов (многострочный, первый тест) и сверка значения получили `recurrence: 'weekly'` —
  нарочно не значение по умолчанию, чтобы тест ловил потерю поля;
- добавлен блок `isRecurrence` (пять допустимых значений; `hourly`, пустая строка, `Weekly`);
- добавлены тесты `validateNewTask`: все пять значений повторения возвращаются как есть, пустая
  строка и посторонняя строка дают «Неизвестное повторение», ошибка повторения собирается вместе
  с тремя остальными.

`sort.test.ts`:
- блок `sortTasksForDay` (7 вызовов) переписан на `sortOccurrences`, добавлен помощник
  `makeOccurrence`;
- добавлены тесты: порядок по дню вхождения между разными днями, сравнение по дню вхождения,
  а не по дате старта задачи (случай регулярной задачи), устойчивость при полностью равных ключах.

## Тесты шага 5 и первый прогон
`memory-repository.test.ts`:
- 38 вызовов `create` дописаны `recurrence` (37 через `perl`, один шаблонный — вручную; 12 строк,
  вылезших за 100 знаков, развёрнуты в многострочную форму). `git diff` просмотрен полностью:
  четыре посторонних упоминания `priority` (строки 22, 186, 188, 260 старой нумерации — `update`
  и `expect`) не тронуты;
- 12 обращений к `listByDate`/`listByRange` переписаны на `listOccurrencesByDate`/
  `listOccurrencesByRange`, сверки — через `item.task.id`; в тесте «переносит задачу на другой день»
  выборка вынесена в переменную, иначе строка не влезала в 100 знаков;
- добавлены тесты: `create` сохраняет переданное повторение; еженедельная задача видна в дне
  вхождения и не видна в соседнем; нерегулярная задача видна только в своём дне; в одном дне
  нерегулярная и регулярная вместе, в порядке приоритета; диапазон разворачивает еженедельную
  в пять дат и ежемесячную с переносом 31 января → 28 февраля → 31 марта; блок `setCompleted`
  (постановка, снятие, повторная постановка, снятие несуществующей отметки, отметка одного дня
  не отмечает другие дни той же регулярной задачи — требование Т-5, отметка не влияет на другую
  задачу, отметка несуществующей задачи не ломает выборки); в блоке `remove` — каскад отметок
  и сохранность отметок других задач.
- каскад в `remove` проверяется по приватному набору через `Reflect.get`: после удаления задачи
  её отметки через публичные выборки не наблюдаемы (задачи нет — вхождений нет), а идентификаторы
  UUID v7 не повторяются, поэтому чёрным ящиком этот факт не проверить. Обратное направление
  (отметки других задач целы) проверяется публичным API.

## Прогон в контейнере
`npm run test`: 6 файлов, **177 тестов зелёные** (было 110).
`npm run check`: 5 ошибок в двух файлах экранов — ожидаемо, это шаги 7–10 другого агента;
в файлах слоя данных ошибок нет.
Механические проверки: `grep -rn "Dexie\|indexedDB" src --include='*.test.ts'` — пусто (код 1);
`grep -n "toIsoDate\|getFullYear\|getMonth()\|getDate()" src/lib/tasks/recurrence.ts` — пусто (код 1).
Ради второй проверки шапка `recurrence.ts` переформулирована: запрещённые имена не упоминаются
даже в комментарии, смысл пояснения сохранён.

## Дополнительная проверка типов слоя данных
`npm run check` (svelte-check) ошибок в `.ts`-файлах не показал, но ни один тест не импортирует
`dexie-repository.ts`, поэтому его типы проверены отдельно прямым вызовом tsc с флагами проекта:
`npx tsc --noEmit --ignoreConfig --strict --exactOptionalPropertyTypes --noUnusedLocals
--noUnusedParameters --verbatimModuleSyntax --isolatedModules --target ES2022 --module ESNext
--moduleResolution bundler --skipLibCheck --lib ES2022,DOM,DOM.Iterable` по шести файлам
(`dexie-repository.ts`, `memory-repository.ts`, `recurrence.ts`, `sort.ts`, `validate.ts`,
`types.ts`) — код выхода 0, вывода нет.

## Итог

### Изменённые файлы
- `src/lib/tasks/types.ts` — шаг 1;
- `src/lib/tasks/validate.ts` — шаг 3;
- `src/lib/tasks/sort.ts` — шаг 4;
- `src/lib/tasks/memory-repository.ts` — шаг 5;
- `src/lib/tasks/dexie-repository.ts` — шаг 6;
- `src/lib/tasks/validate.test.ts`, `src/lib/tasks/sort.test.ts`,
  `src/lib/tasks/memory-repository.test.ts` — правка и дополнение тестов.

### Созданные файлы
- `src/lib/tasks/recurrence.ts`;
- `src/lib/tasks/recurrence.test.ts`;
- `memory/progress_recurrence_data.md` (этот отчёт).

### Тесты
Было 110, стало 177 (+67). По файлам: `recurrence.test.ts` 43 (новый),
`memory-repository.test.ts` 46 (было 25), `validate.test.ts` 36 (было 29),
`sort.test.ts` 16 (было 12), `text.test.ts` 28 и `id.test.ts` 8 — не менялись.

### Дословный вывод `npm run test` (последние строки)
```
 ✓ src/lib/tasks/sort.test.ts (16 tests) 11ms
 ✓ src/lib/tasks/text.test.ts (28 tests) 17ms
 ✓ src/lib/tasks/recurrence.test.ts (43 tests) 14ms
 ✓ src/lib/tasks/validate.test.ts (36 tests) 13ms
 ✓ src/lib/tasks/memory-repository.test.ts (46 tests) 30ms
 ✓ src/lib/tasks/id.test.ts (8 tests) 173ms

 Test Files  6 passed (6)
      Tests  177 passed (177)
   Start at  13:08:52
   Duration  368ms (transform 54%, tests 31%, import 12%, worker 3%)
```

### Дословный вывод `npm run check`
```
/app/src/lib/components/TaskCreateModal.svelte:127:22
Error: Argument of type '{ text: string; date: string; priority: Priority; }' is not assignable to parameter of type 'NewTask'.
  Property 'recurrence' is missing in type '{ text: string; date: string; priority: Priority; }' but required in type 'NewTask'. (ts)
    try {
      await onSubmit({ text: text.trim(), date, priority });
    } catch {

/app/src/routes/CalendarScreen.svelte:164:8
Error: Property 'listByRange' does not exist on type 'TaskRepository'. (ts)
    taskRepository
      .listByRange(from, to)
      .then((tasks) => {

/app/src/routes/CalendarScreen.svelte:165:14
Error: Parameter 'tasks' implicitly has an 'any' type. (ts)
      .listByRange(from, to)
      .then((tasks) => {
        if (cancelled) {

/app/src/routes/CalendarScreen.svelte:207:8
Error: Property 'listByDate' does not exist on type 'TaskRepository'. (ts)
    taskRepository
      .listByDate(date)
      .then((tasks) => {

/app/src/routes/CalendarScreen.svelte:208:14
Error: Parameter 'tasks' implicitly has an 'any' type. (ts)
      .listByDate(date)
      .then((tasks) => {
        if (cancelled) {

====================================
svelte-check found 5 errors and 0 warnings in 2 files
```
Все пять ошибок — в файлах экранов (`TaskCreateModal.svelte`, `CalendarScreen.svelte`), их закрывают
шаги 7–10 другого агента. В файлах слоя данных — ноль ошибок и ноль предупреждений.

### Механические проверки
- `grep -rn "Dexie\|indexedDB" src --include='*.test.ts'` — пустой вывод, код выхода 1;
- `grep -n "toIsoDate\|getFullYear\|getMonth()\|getDate()" src/lib/tasks/recurrence.ts` —
  пустой вывод, код выхода 1;
- `grep -rn "listByDate\|listByRange\|sortTasksForDay" src/` — остались только два вызова
  в `CalendarScreen.svelte` (строки 164 и 207), их снимает шаг 9.

### Что НЕ сделано и почему
- шаги 7–10 (`TaskCreateModal.svelte`, `DayTaskList.svelte`, `CalendarScreen.svelte`,
  `TaskScreen.svelte`) — вне задачи, делает агент экранов; эти файлы не открывались на правку;
- шаг 11 (прогон в браузере) и шаг 12 (документация в `docs/`) — вне задачи;
- `npm run build` не запускался: по плану он падает до шагов 7–10;
- юнит-тестов на `dexie-repository.ts` нет — так предписано планом (слой доступа к базе,
  автотесты к базам не обращаются); типы этого файла проверены tsc отдельно.

### Отступления от плана — одно, оговорённое
Шапка `recurrence.ts` переформулирована так, чтобы не содержать имён `toIsoDate`/`getFullYear`
даже в тексте комментария: иначе механическая проверка плана (шаг 11) давала непустой вывод
и падала на пояснении, а не на коде. Смысл пояснения (почему арифметика своя) сохранён полностью.
Ошибок в самом плане не найдено.
