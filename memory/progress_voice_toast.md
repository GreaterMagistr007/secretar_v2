# Журнал: этап 8 — всплывающее сообщение (toast)

## Шаг 1. Изучение (2026-11-21)
- Прочитаны: CLAUDE.md, docs/code_style.md, plan_stage_05_voice.md (выбор владельца, этап 8), App.svelte, vitest.config.ts, notification-counts.test.ts, app.css, router.svelte.ts, calendar-state.svelte.ts, CalendarScreen.svelte (.add), BottomNav.svelte, docker-compose.yml, docs/deployment.md.
- Токены есть в app.css и темах: --color-surface, --color-text, --color-weekend, --color-primary, --shadow-card, --radius-md, --space-*, --nav-height. Новых не нужно.
- z-index в проекте: навигация 20, кнопка «+» 30, оверлей экрана 40, модалка создания 50.
- Команды: dev-контейнер secretar-dev-h33 (образ node:22-alpine, смонтирован этот каталог, порт 5173) уже запущен — тесты/сборка/check выполняю в нём через docker exec (docs/deployment.md: команды внутри контейнера — обычные npm-скрипты).
- План файлов: src/lib/toast.ts (чистая логика), src/lib/toast.test.ts, src/lib/toast.svelte.ts (руна + showToast), src/lib/components/Toast.svelte, монтирование в App.svelte, vitest.config.ts (coverage.include), docs/mechanic_toast.md, docs/INDEX.md.

## Шаг 2. Код и тесты
- Новые: src/lib/toast.ts (логика: TOAST_TIMING, toastDuration, createToastController с внедряемым Schedule — функция откладывания, возвращающая отмену), src/lib/toast.svelte.ts (руна $state + showToast(type, text) + toast.current), src/lib/components/Toast.svelte, src/lib/toast.test.ts (16 тестов).
- Изменены: src/App.svelte (импорт и <Toast /> после BottomNav, строка в шапке-комментарии), vitest.config.ts (src/lib/toast.ts в coverage.include).
- Анимация: два @keyframes (успех 33,333 %, ошибка 66,667 % видно), длительность — инлайн-переменная --toast-duration из toastDuration(); элемент пересоздаётся {#key id} — анимация заново и при повторе текста. Снятие — таймер логики. reduced-motion: animation: none.
- Место: .region fixed, left/right = space-md + safe-area, bottom = space-md + nav-height + safe-bottom + 56px + space-sm; z-index 60 (выше модалки 50). pointer-events: none.
- Прогон в контейнере secretar-dev-h33: 10 файлов, 270 тестов, все зелёные. Покрытие toast.ts 100/100/100/100.
- Мутации (временно, исходник восстановлен, diff пуст): без отмены прежнего таймера — 4 падения; срок на 1 мс меньше — 9; id не растёт — 3; не обнуляется отмена после снятия — 1. Все пойманы.

## Шаг 3. Проверка командами
- svelte-check: 0 ошибок, 0 предупреждений. npm run build: собрано. Всё в контейнере secretar-dev-h33.

## Шаг 4. Визуальная проверка (Chrome, localhost:5173/secretar_v2/)
- Окно сузить не удалось: оконный менеджер держит innerWidth 1920 при resize_window. Ширина 360 px получена через iframe того же адреса (360×740) на этой же странице — внутри iframe полноценное приложение, innerWidth 360.
- Импорт '/src/lib/toast.svelte.ts' без метки даёт ВТОРОЙ экземпляр модуля: dev-сервер после создания файлов отдаёт его приложению как toast.svelte.ts?t=<HMR-метка> до перезапуска. Импортировал по адресу из performance.getEntriesByType('resource') (через eval внутри iframe). После перезапуска dev-сервера путь без метки снова совпадёт.
- 360 px, тема v09 (светлая, сохранённая у пользователя): ошибка — значок «!» и полоса --color-weekend, белый фон, перенос в 2 строки; успех — галочка и полоса --color-primary. Тема v05 «Полночь» (тёмная): оба типа, фон --color-surface тёмный, текст светлый. Сохранённая тема v09 восстановлена в localStorage.
- Геометрия на 360 px: сообщение x 16…344 (поля по 16), низ 598; «+» верх 608 (зазор 10 = space-sm); навигация верх 679. Ничего не перекрывает. role="alert" у ошибки, у успеха нет; aria-live="polite" на постоянном контейнере; pointer-events: none; z-index 60.
- Снятие из DOM (MutationObserver): успех 3001 мс, ошибка 6000 мс. Замена: ошибка в 0, успех в 2002, снят в 5001 (по сроку нового, не прежнего).
- НАЙДЕН И ИСПРАВЛЕН БАГ: затухания не было (opacity 1 всё время). Причина — Svelte переименовывает @keyframes компонента в svelte-<хэш>-toast-fade-*, а имя передавалось через CSS-переменную (--toast-fade), которую он не переписывает. Исправление: animation-name прямо в .toast--success/.toast--error, остальное — длинными свойствами в .toast.
- После исправления (Web Animations API): успех — svelte-1cpok13-toast-fade-success, 3000 мс, linear, fill both, кадры [0:1, 0.33333:1, 1:0]; ошибка — 6000 мс, [0:1, 0.66667:1, 1:0]. Старт анимации совпадает с моментом показа (−1 мс).
- Замеры opacity через getComputedStyle отставали на ~600 мс — окно браузера тротлится (2 кадра/с), это артефакт среды; кадры и время старта проверены через getAnimations(), что от частоты кадров не зависит.
- reduced-motion: живьём не эмулировал (нет доступа к эмуляции медиа-функций). Проверено, что правило @media (prefers-reduced-motion: reduce) { .toast { animation: none } } есть в CSS, имеет ту же специфичность, что классы типа, и стоит после них — значит побеждает.
- Ошибок в консоли нет. Вкладка закрыта, /tmp/claude-chrome-screenshots-* удалён (на диск скриншоты не сохранялись).
- После исправления повторно: 270 тестов зелёные, svelte-check 0/0, build собран.

## Шаг 5. Документация
- Создан docs/mechanic_toast.md (разделы Views, Сервисы, API, Примечания; неотносящиеся убраны).
- docs/INDEX.md — строка в «Механики реализации». docs/mechanic_themes.md — в описании App.svelte упомянут Toast со ссылкой на механику.

## Итог
- Новые файлы: src/lib/toast.ts, src/lib/toast.svelte.ts, src/lib/toast.test.ts, src/lib/components/Toast.svelte, docs/mechanic_toast.md.
- Изменённые: src/App.svelte (импорт, <Toast /> после BottomNav, строка в шапке), vitest.config.ts (src/lib/toast.ts в coverage.include), docs/INDEX.md, docs/mechanic_themes.md. Журнал — memory/progress_voice_toast.md.
- npm test (vitest run, в контейнере secretar-dev-h33): 10 файлов, 270 тестов, все зелёные (из них 16 новых). Покрытие toast.ts: 100 % строк, ветвей, функций, операторов. 4 мутации пойманы.
- svelte-check: 0 ошибок, 0 предупреждений. npm run build: собрано.
- Визуально (Chrome, 360 px через iframe): оба типа в светлой v09 и тёмной v05; не перекрывает «+» (зазор 10 px) и навигацию; снятие на 3001/6000 мс; замена работает; ключевые кадры и длительности подтверждены. Найден и исправлен баг — затухание не работало из-за переименования @keyframes Svelte'ом.
- Не удалось: сузить само окно браузера (обошёл iframe); эмулировать prefers-reduced-motion живьём (проверено только правило CSS); замер opacity в реальном времени искажён тротлингом окна (2 кадра/с) — заменён проверкой через Web Animations API.
- Не коммитил и не пушил.
РАБОТА ЗАВЕРШЕНА
