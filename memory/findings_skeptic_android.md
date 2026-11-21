# Скептик: ревью этапа 4 (Android + уведомление), 2026-11-21
Формат: важность | файл:строка | суть | доказательство | предложение.

## Проверено без замечаний (кратко)
- Мутации данных в интерфейсе: только taskRepository.create и setCompleted (grep `taskRepository\.\w*` по src без тестов: create, setCompleted, listOccurrencesByRange). После обоих вызывается refreshTaskNotification (CalendarScreen.svelte:385, :406). Пропущенных мест нет.
- PendingIntent: RESHOW и MIDNIGHT с requestCode 0 различаются action (Intent.filterEquals) — не затирают друг друга; activity- и broadcast-PI разных типов. FLAG_IMMUTABLE есть (Android 12+).
- Будильник задержался / открыто в полночь / смена пояса: refresh берёт dateKey(now) в момент срабатывания, список уже содержит следующий день; TIMEZONE_CHANGED и TIME_SET переставляют будильник. Передача из веб-части, пришедшая после полуночи, тоже корректна: список начинается с «вчера», нативная часть берёт новый день.
- Метки времени в TaskCountsTest сверены python zoneinfo — все верны (NY DST 23/25 ч, Москва, UTC).
- Pages-сборка в отдельный outDir (memory/tmp_skeptic_pages): base /secretar_v2/, manifest, registerSW.js, sw.js на месте. Capacitor-сборка (memory/tmp_skeptic_cap): ./assets/..., sw.js/manifest/registerSW нет, в бандле нет registerSW.
- .gitignore: release.keystore, .env.android, secretar.apk, android/app/build, android/.gradle, android/local.properties, assets/public, capacitor-cordova-android-plugins — все игнорируются (git check-ignore -v подтвердил). Паролей в коммитируемых файлах нет: только имена переменных (build.gradle:30-32 System.getenv), локальных путей в android/ нет.
- TODO/FIXME/номеров задач в новом коде нет.

## Находки

### 1. ВАЖНО — docker-compose.yml:68 (`env_file: .env.android`) ломает ВСЕ сервисы compose на устройстве без .env.android
Суть: проект ведётся с нескольких устройств (CLAUDE.md §1.5), .env.android вне git. Compose v2 проверяет env_file всех сервисов при загрузке проекта, поэтому на свежем клоне падают и `docker compose up dev`, и `run check`, и `run build`, а не только сборка APK.
Доказательство: копия docker-compose.yml в memory/tmp_skeptic_compose (без .env.android), Docker Compose v2.29.7:
`docker compose config check` → `env file .../tmp_skeptic_compose/.env.android not found: stat ...: no such file or directory`. В корне проекта (файл есть) — OK.
Предложение: длинная форма `env_file: [{ path: .env.android, required: false }]` (compose ≥ 2.24) — тогда без файла упадёт только подпись в Gradle с понятной ошибкой; либо `environment: SECRETAR_KEYSTORE_PASSWORD: ${SECRETAR_KEYSTORE_PASSWORD}` и т. п. Отразить в mechanic_android.md/deployment.md.

### 2. ВАЖНО (пробел тестов) — src/lib/notification-counts.test.ts:41-65: подмена toIsoDate на toISOString в horizonDates не ловится
Суть: мутация `toIsoDate(new Date(y, m-1, d+offset))` → `new Date(...).toISOString().slice(0,10)` проходит все 36 тестов. Стенд в America/New_York: локальная полночь там = 05:00Z того же дня, сдвига нет. Владелец живёт в UTC+3 (Москва): там локальная полночь = 21:00Z предыдущего дня, и такая регрессия сдвинет весь горизонт на сутки назад — уведомление покажет число вчерашнего дня. Комментарий vitest.config.ts («любая UTC-арифметика падает сразу») для значений, построенных от полуночи, неверен.
Доказательство: memory/tmp_skeptic_mutate.py, мутация 2 → `Tests 36 passed (36)`. Остальные 13 мутаций (ms-арифметика +86400000, игнор done, конец диапазона, без очереди, отравление очереди, условия разрешения, enabled всегда true, visibility, горизонт с завтра и др.) ловятся.
Предложение: тест horizonDates в восточной зоне (например, `process.env.TZ = 'Europe/Moscow'` в отдельном тестовом файле или второй прогон vitest с TZ=Europe/Moscow), либо проверять, что результат не зависит от зоны.

### 3. ВАЖНО (правило тестов проекта) — TaskNotifierReceiver.java:57-82 и TaskNotifierPlugin.java:33-63: логика без тестов
Суть: глобальное правило (КРИТИЧНО) — юнит-тесты для каждого класса с логикой. JUnit покрывает только TaskCounts. Не покрыто: решение refresh «enabled && count>0 → показать, иначе снять; enabled → будильник, иначе отмена» и разбор update (пропуск невалидных пар, reject при JSONException, enabled по умолчанию false). Мутация «показывать при count >= 0» или «будильник и при выключенном пункте» не будет поймана ничем, кроме ручной проверки на эмуляторе.
Доказательство: android/app/src/test содержит только TaskCountsTest.java (18 тестов, все про TaskCounts).
Предложение (минимально, без Robolectric): вынести в TaskCounts чистую функцию «число к показу» `countToShow(boolean enabled, String stored, long now, TimeZone zone)` и тест на неё; разбор JSArray оставить как есть либо явно записать в mechanic_notifications.md как непокрытое с причиной (Android API, проверяется на эмуляторе). Решение — за Claude/владельцем, т. к. рост кода ради тестов противоречит правилу минимальности.

### 4. МЕЛОЧЬ — TaskNotifierReceiver.java:57 refresh не синхронизирован; плагин и приёмник работают в разных потоках
Суть: TaskNotifierPlugin.update выполняется в потоке Capacitor «CapacitorPlugins» (node_modules/@capacitor/android/.../Bridge.java:138 HandlerThread, :860 taskHandler.post), onReceive — в главном потоке. Если будильник полуночи/RESHOW совпадёт с передачей из веб-части, приёмник может прочитать старый counts до apply() плагина и вызвать notify последним — в шторке останется устаревшее число до следующего пересчёта. Окно микросекунды, вероятность ничтожна.
Предложение: `static synchronized void refresh(...)` — одно слово; либо принять и не трогать.

### 5. МЕЛОЧЬ — NotificationsScreen.svelte:26-28 + TaskNotifierReceiver.java:94: выключенный канал «Задачи на сегодня» не объясняется
Суть: если пользователь отключил только канал (долгое нажатие на уведомление → «Отключить»), areNotificationsEnabled() = true, разрешение granted → пояснения на экране нет, notify молча не показывает. Пользователь видит включённый пункт и не видит уведомления. Зацикливания нет (повторный notify в заблокированный канал просто отбрасывается).
Предложение: записать в «Известные границы» mechanic_notifications.md; код при желании — проверка NotificationChannel.getImportance() == IMPORTANCE_NONE в legacyPermissionState/checkPermissions. Минимально — только документация.

### 6. МЕЛОЧЬ (документация) — docs/mechanic_notifications.md:94, :98: задержка будильника и остановка приложения описаны мягче, чем бывает
Суть: (а) setAndAllowWhileIdle у приложения в корзине App Standby «rare»/«restricted» (Android 9+/12+) откладывается на часы, не на «минуты»; у приложения, которое открывают только через уведомление, это реально. (б) Принудительная остановка снимает не только будильник, но и само уведомление, а deleteIntent в остановленное приложение не доставляется; у ряда производителей (Xiaomi/Huawei и пр.) смахивание из «недавних» действует как принудительная остановка.
Предложение: уточнить два пункта «Известных границ». Код не менять.

### 7. МЕЛОЧЬ (документация) — docs/mechanic_android.md:81 неточно: «Без .env.android docker compose не запустит сервис android»
Суть: не запустится ни один сервис (см. находку 1). Править вместе с находкой 1.

### 8. МЕЛОЧЬ (правило проекта) — .env.example не заведён, имена переменных записаны в docs
Суть: CLAUDE.md §10 и глобальное правило: «Новые env-переменные — в .env.example». В .gitignore даже есть исключение `!.env.example`, но файла нет; mechanic_android.md:103 и deployment.md прямо пишут «.env.example в проекте нет, поэтому имена записаны здесь» — правило обойдено осознанно, но без согласования.
Предложение: .env.android.example (или .env.example) с тремя именами без значений — 3 строки; либо зафиксировать решение об исключении в docs.

### 9. МЕЛОЧЬ (документация) — Р-31 (docs/product_decisions/00_index.md), plan_stage_04_android.md шаг 4, В-16: «передаёт … при смене суток»
Суть: реализация при смене суток ничего не передаёт (только visibilitychange и записи); отклонение описано в mechanic_notifications.md:62 и progress_android.md, но текст решения Р-31 и плана остался прежним — расхождение «решение ↔ код». Функционально безвредно: число на новый день выбирает нативный будильник из уже переданного списка.
Предложение: уточнить формулировку Р-31/плана (или дописать «при возвращении в приложение»). Аналогично Т-29 «та же сборка, что публикуется на GitHub Pages» — фактически отдельный режим сборки (base './', без SW); можно оставить «тот же код».

### 10. МЕЛОЧЬ — android/app/build.gradle:17, :58-59: остатки инструментальных тестов шаблона
Суть: ExampleInstrumentedTest удалён (mechanic_android.md:39), но testInstrumentationRunner и androidTestImplementation (androidx.test.ext:junit, espresso-core) остались. Вреда нет (в APK не попадают), но это мёртвая обвязка шаблона.
Предложение: оставить как шаблон Capacitor (меньше расхождений при `cap` обновлениях) — либо удалить три строки. Рекомендую оставить.

### 11. МЕЛОЧЬ — в APK попадает public/gallery (428 КБ макетов галереи раскладок)
Доказательство: capacitor-сборка memory/tmp_skeptic_cap: gallery 428K, assets 240K, fonts 376K. В приложении галерея не используется маршрутами (она для выбора дизайна). APK 3,8 МБ — некритично.
Предложение: оставить; при желании исключить в режиме capacitor (лишний код — не рекомендую сейчас).

### 12. ПРОВЕРИТЬ НА ЭМУЛЯТОРЕ (не подтверждено) — task-notifier.ts:150-157: срабатывает ли visibilitychange в WebView Capacitor при сворачивании/возврате
Суть: продление горизонта и перечитывание разрешения на NotificationsScreen держатся на visibilitychange. Capacitor не вызывает WebView.onPause/onResume (Bridge.java:1357-1378 → MockCordovaWebViewImpl.handlePause только при !keepRunning, по умолчанию keepRunning=true), поэтому событие зависит от видимости окна в Chromium. По опыту оно приходит, но в этой сессии не проверено.
Предложение: добавить в тест-кейсы эмулятора: свернуть → разрешить уведомления в настройках → вернуться: пояснение исчезло и уведомление появилось.

### 13. МЕЛОЧЬ (не по этапу) — расхождение docs/history_sessions.md и memory/new-session-prompt.md про контейнер secretar-dev
Суть: history: «старый удалён по команде владельца»; new-session-prompt: «старый удалить по команде владельца». Один из текстов устарел.

## Мутационное тестирование (веб-часть)
Копии модулей и тестов в memory/tmp_skeptic_mut, отдельный vitest-конфиг; src/ не менялся. 14 мутаций, поймано 13. Не поймана: №2 (toISOString вместо toIsoDate в horizonDates) — находка 2. Java-мутации не прогонялись (Gradle в контейнере и общий том кэша с идущей проверкой на эмуляторе); анализ JUnit: «+24 ч» вместо Calendar.add ловят DST-тесты, UTC вместо зоны в dateKey ловит тест NY/Москва.
npm audit --omit=dev: 0 уязвимостей (13 — только в dev-зависимостях).

