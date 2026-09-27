
## Агент экранов (шаги 7–10), сессия 2026-09-27

План `docs/plan_stage_03_recurrence_completions.md` (редакция 2) прочитан целиком.
Зона работы — шаги 7–10, четыре файла:
- `src/lib/components/TaskCreateModal.svelte` (шаг 7)
- `src/lib/components/DayTaskList.svelte` (шаг 8)
- `src/routes/CalendarScreen.svelte` (шаг 9)
- `src/routes/TaskScreen.svelte` (шаг 10)

Границы приняты: слой данных (`src/lib/tasks/*`, `src/lib/date.ts`, `src/lib/priority.ts`) не трогаю,
`docs/` не правлю (шаг 12 не мой), тестов на Svelte-компоненты не пишу.

### Шаг 7 — `src/lib/components/TaskCreateModal.svelte` (сделано)
- Импорт из `../tasks/types` расширен: `DEFAULT_RECURRENCE`, `RECURRENCE_LABELS`, `RECURRENCE_ORDER` (values) и тип `Recurrence`; импорт values переведён в многострочную форму, потому что в одну строку он перестал помещаться в стиль соседнего кода.
- Добавлено состояние `let recurrence = $state<Recurrence>(DEFAULT_RECURRENCE);` сразу после `priority`.
- `focusableItems()`: в селектор добавлено `select:not([disabled])` — иначе ловушка Tab потеряла бы новое поле.
- `handleSubmit`: `onSubmit({ text: text.trim(), date, priority, recurrence })`.
- Разметка: `<label class="field">` с `<span class="field-label">Повторение</span>` и `<select class="input" bind:value={recurrence}>` с циклом по `RECURRENCE_ORDER` — поставлена после `fieldset` приоритета, перед блоком `saveError`, дословно как в плане.
- `canSave` не тронут: поле заполнено всегда, ошибок у него нет (по плану).
- CSS не добавлял: `select` получает оформление существующим классом `.input` (в нём нет свойств, специфичных для `input`/`textarea`).
- **Решение за план:** doc-комментарий модалки говорил «текст, дата и приоритет, все три поля обязательны» — после добавления четвёртого поля это неверно. Переписал первый абзац: четыре поля, обязательны текст и дата, приоритет и повторение заполнены значениями по умолчанию. Формулировка согласована с тем, что план предписывает записать в требование Т-26 (шаг 12, не мой).

### Шаг 8 — `src/lib/components/DayTaskList.svelte` (сделано)
- Импорт типа: `Occurrence` вместо `Task`.
- Пропсы: `tasks: Task[]` → `occurrences: Occurrence[]`, добавлен `onToggle: (occurrence: Occurrence, done: boolean) => void`.
- Пустое состояние: `occurrences.length === 0`.
- Цикл: ключ `` `${occurrence.task.id}|${occurrence.date}` ``, все обращения внутри — через `occurrence.task.*` (`router.hrefTask`, `PRIORITY_COLOR`, текст, `PRIORITY_LABELS`).
- Флажок — нативный `<input class="check" type="checkbox">` с `checked={occurrence.done}`, переменным `aria-label` и обработчиком `onchange`, в котором ПЕРВОЙ строкой `event.currentTarget.checked = occurrence.done;`, затем `onToggle(occurrence, !occurrence.done)`. Взято из плана дословно вместе с комментарием-обоснованием.
- Зачёркивание: `class:text--done={occurrence.done}` на `<span class="text">` и правило `.text--done { color: var(--color-text-muted); text-decoration: line-through; }`.
- Перекладка вёрстки: оформление карточки (padding, border, border-radius, background, box-shadow) перенесено с `.link` на `.item`; `.item` стал `display: flex; gap: var(--space-sm); align-items: center;` с сохранённым `min-width: 0`. `.link` потерял рамку, фон, тень и padding, получил `flex: 1`. `.link:focus-visible` сохранено без изменений.
- `.check`: `width: 18px; height: 18px; flex: none; accent-color: var(--color-primary);` — ровно по плану.
- Порядок элементов от отметки не зависит: сортировка приходит из хранилища, в компоненте её нет.
- **Решение за план (мелкое):** план в перечне остающихся свойств `.link` не упомянул `color: var(--color-text)`, но в перечне снимаемых («рамку, фон, тень и padding») его тоже нет. Оставил `color` на `.link`: у тега `<a>` цвет задан UA-стилем и не наследуется, без этого правила текст задачи стал бы синей ссылкой. Это визуальная регрессия, а не то, что план просил.
- **Решение за план (мелкое):** doc-комментарий компонента дополнен двумя фразами про то, что на вход идут вхождения повторений и что отметка принадлежит дню (Т-5, Р-16) — иначе комментарий описывал бы прежний контракт пропсов.

### Шаг 9 — `src/routes/CalendarScreen.svelte` (сделано)
- Импорт типов: `Occurrence` вместо `Task` (тип `Task` в файле больше не использовался ни в одном месте, оставлять его было нельзя из-за `noUnusedLocals`).
- Состояния переименованы: `monthTasks` → `monthOccurrences: Occurrence[]`, `dayTasks` → `dayOccurrences: Occurrence[]`; добавлено `let toggleError = $state<string | null>(null);` с комментарием, почему оно отдельное от `dayError`.
- `buildMarks` и `buildCounts` принимают `Occurrence[]` и считают по `occurrence.date` и `occurrence.task.priority`; `$derived`-выражения `marks` и `counts` переведены на `monthOccurrences`.
- Эффект меток: `listByRange` → `listOccurrencesByRange`; эффект списка дня: `listByDate` → `listOccurrencesByDate`. Обработка ошибок, тексты сообщений и механизм `cancelled` не тронуты, переименованы только параметр `.then` и присваиваемые состояния.
- Добавлена `toggleCompletion(occurrence, done)` — дословно из плана (обнуление `toggleError`, `setCompleted`, `catch` с сообщением «Не удалось сохранить отметку.», `finally` с `reloadToken += 1` и комментарием).
- Разметка: `occurrences={dayOccurrences}` вместо `tasks={dayTasks}`, добавлен `onToggle={toggleCompletion}`; сразу после `<DayTaskList … />`, внутри блока `{#if calendarState.selectedDate !== null}`, добавлен вывод `toggleError` через существующий класс `grid-error` с `role="alert"`. Нового CSS не потребовалось.
- `createTask` не тронута.

### Шаг 10 — `src/routes/TaskScreen.svelte` (сделано)
- Импорт из `../lib/tasks/types` расширен: `{ PRIORITY_LABELS, RECURRENCE_LABELS }`.
- В `dl.meta` добавлена третья строка `.meta-row`: `<dt class="meta-label">Повторение</dt>` и `<dd class="meta-value">{RECURRENCE_LABELS[task.recurrence]}</dd>` — без цветной метки, по образцу строки «Приоритет». Нового CSS нет.
- Ничего больше на экране не менял: отметки выполнения здесь нет по решению Р-29.
- **Решение за план (мелкое):** в doc-комментарии экрана перечислялись «дата и приоритет» — дописал повторение и одной фразой зафиксировал, что отметки выполнения здесь нет по решению Р-29.

Далее — обязательные проверки в контейнере.

### Приведение к стилю проекта
- После проверок обнаружил две строки длиннее 100 символов (ориентир проекта — переносы у существующего кода). Строку `<span class="mark" …>` в `DayTaskList.svelte` (101 символ) разложил на четыре строки по образцу соседнего `<input>`. Поведение не меняется: пробельные текстовые узлы во flex-контейнере `.link` элементами не становятся.
- Строку селектора в `focusableItems()` (`TaskCreateModal.svelte:78`, 113 символов) оставил одним литералом: строковые литералы не переносятся форматтером, а склейка через `+` вносит риск потерять пробел между селекторами. В файле `TaskScreen.svelte:77` и до правки была строка на 105 символов, жёсткого ограничения в проекте нет (конфигов prettier/eslint нет — проверено `ls`).

## Итог

### Изменённые файлы (только четыре, границы задачи соблюдены)
- `src/lib/components/TaskCreateModal.svelte` — шаг 7 (+23/−8)
- `src/lib/components/DayTaskList.svelte` — шаг 8 (+56/−11)
- `src/routes/CalendarScreen.svelte` — шаг 9 (+53/−27)
- `src/routes/TaskScreen.svelte` — шаг 10 (+7/−2)

Файлы слоя данных, `src/lib/date.ts`, `src/lib/priority.ts`, `docs/` не тронуты — подтверждено `git diff --stat`. Тесты не добавлял и не менял.

### Вывод проверок в контейнере (дословно, последние строки)

`npm run check`:
```
Loading svelte-check in workspace: /app
Getting Svelte diagnostics...

svelte-check found 0 errors and 0 warnings
```

`npm run test`:
```
 Test Files  6 passed (6)
      Tests  177 passed (177)
   Start at  13:18:09
   Duration  386ms (transform 55%, tests 31%, import 11%, worker 3%)
```

`npm run build`:
```
dist/registerSW.js                0.15 kB
dist/manifest.webmanifest         0.59 kB
dist/index.html                   1.28 kB | gzip:  0.59 kB
dist/assets/index-Cye6emGV.css   21.29 kB | gzip:  3.88 kB
dist/assets/index-YurNe7sC.js   205.18 kB | gzip: 65.74 kB

✓ built in 1.03s

PWA v1.3.0
mode      generateSW
precache  10 entries (222.57 KiB)
files generated
  dist/sw.js
  dist/workbox-835c8c05.js
```

Все три порога приёмки взяты: 0 ошибок и 0 предупреждений, 177 тестов зелёные, сборка проходит. Проверки прогнаны дважды: до и после правки длинных строк, оба раза с тем же результатом.

Дополнительно проверено `grep` по `src`: вызовов `listByDate`, `listByRange`, `sortTasksForDay` не осталось; `DayTaskList` и `TaskCreateModal` вызываются только из `CalendarScreen.svelte`, второго вызывающего, которому нужны были бы старые пропсы, нет.

### Что НЕ сделано и почему
- Браузерная проверка по списку шага 11 — не моя: делает постановщик, dev-сервер не поднимал по прямому запрету в задаче.
- Документация (шаг 12) — не мой шаг, `docs/` не тронут.
- Юнит-тесты на Svelte-компоненты — по задаче не пишутся (компоненты в проекте тестами не покрываются).
- Правка требования Т-26 (форма из трёх полей → четыре) — часть шага 12; в коде расхождение закрыто только doc-комментарием модалки, в `docs/req_screens.md` его надо внести отдельно.

### Места, где пришлось решать за план
1. **`color: var(--color-text)` у `.link` в `DayTaskList.svelte` оставлен.** План в перечне остающихся свойств его не назвал, но и в перечне снимаемых («рамку, фон, тень и padding») тоже. У `<a>` цвет задан UA-стилем и не наследуется от `.item`, поэтому без этого правила текст задачи стал бы синей ссылкой — визуальная регрессия, которую план не заказывал.
2. **Doc-комментарии трёх компонентов дописаны.** План шагов 7–10 их не упоминает, а они описывали прежний контракт: «текст, дата и приоритет, все три поля обязательны» в модалке, «дата и приоритет» на экране задачи, «список задач» вместо вхождений в `DayTaskList`. Оставлять комментарий, противоречащий коду, нельзя по правилам проекта; формулировки взял из того, что план предписывает записать в требования на шаге 12.
3. **Формат импорта values в `TaskCreateModal.svelte`** переведён в многострочный: пять имён в одну строку дают 104 символа.
4. **Переименование параметров `.then((tasks) => …)` в `(occurrences)`** — план велел обработку ошибок и отмену не менять, про имена параметров не сказал; переименовал, потому что в переменную теперь ложатся вхождения, а не задачи.

Ошибок в плане не нашёл: шаги 7–10 сошлись с фактическим состоянием кода до символа, включая номера строк `focusableItems` (69–71), `.item`/`.link` (91–107) и разметки вызова `DayTaskList` (359–365).
