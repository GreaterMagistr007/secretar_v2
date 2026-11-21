# Ход работы: этап 4 (Android-приложение и уведомление)

## 2026-11-21 Старт
- Прочитаны: план этапа 4, Т-29…Т-31, Р-30…Р-32, vite/vitest-конфиги, роутер, экран настроек, CalendarScreen, хранилище.
- Версии Capacitor (npm view): @capacitor/core, @capacitor/android, @capacitor/cli — 8.6.2 (последняя 8.x, выпущена 2026-11-12).
- Решение по месту вызова update: мутации задач в интерфейсе только в CalendarScreen (create, setCompleted) — туда два вызова; старт и пробуждение — в App.svelte; переключатель — на экране «Уведомления». Обёртка хранилища отвергнута: 8 методов делегирования против 2 строк.
- Решение по файлам веб-части: плоско в src/lib (как date.ts, priority.ts), без нового подкаталога: notification-counts.ts (чистый расчёт), task-notifier.ts (мост, настройка, синхронизация).

## Пакеты, режим сборки, android/
- npm install --save-exact: @capacitor/core 8.6.2, @capacitor/android 8.6.2 (dependencies), @capacitor/cli 8.6.2 (devDependencies). Побочно npm поднял транзитивный brace-expansion 5.0.9 → 5.0.13 (дедупликация под minimatch из cli). npm audit: 13 уязвимостей (1 low, 8 moderate, 4 high) — по выводу npm, не разбирались.
- vite.config.ts: defineConfig(({ mode }) => ...), в режиме capacitor base './' и без VitePWA. package.json: скрипт build:android = vite build --mode capacitor. Выход — тот же dist/ (новый каталог верхнего уровня не заводится).
- capacitor.config.json (appId io.github.greatermagistr007.secretar, appName «Секретарь», webDir dist).
- npx cap add android в node:22-alpine — успешно, шаблон Capacitor 8.6.2: AGP 8.13.0, Gradle 8.14.3, compileSdk/targetSdk 36, minSdk 24, Java 21.
- Иконки: разовый скрипт memory/tmp_android_icons.sh в alpine:3.22 + imagemagick-svg из public/icons/icon.svg — ic_launcher, ic_launcher_round (круг), ic_launcher_foreground (только дуга, поля под маску адаптивной иконки), splash.png всех плотностей (значок по центру на #f6f7f9 вместо логотипа Capacitor). Проверено глазами по превью.
- Важно для сборки: node_modules общий с dev-контейнером на alpine (musl). npm ci/install в glibc-образе заменил бы нативные бинарники rolldown на gnu-варианты и сломал бы secretar-dev-h33. Поэтому веб-сборка и cap sync — в образе secretar-node (alpine), Gradle — в Dockerfile.android без Node.

## Нативная часть и окружение сборки
- Java: TaskCounts.java (чистая логика: isValid, serialize/parse «YYYY-MM-DD=число» построчно, countFor, dateKey, nextMidnight через Calendar, title), TaskNotifierReceiver.java (refresh: показ/снятие уведомления + будильник setAndAllowWhileIdle; один приёмник на RESHOW, MIDNIGHT, BOOT_COMPLETED, TIME_SET, TIMEZONE_CHANGED, MY_PACKAGE_REPLACED), TaskNotifierPlugin.java (update, check/requestPermissions с веткой для Android < 13), MainActivity.registerPlugin.
- JUnit: android/app/src/test/.../TaskCountsTest.java (18 тестов, метки времени сверены python zoneinfo). Шаблонные ExampleUnitTest/ExampleInstrumentedTest и неиспользуемые drawable ic_launcher_background.xml, drawable-v24/ic_launcher_foreground.xml удалены (rm по файлам).
- Манифест: приёмник exported=false (системные рассылки доходят — так же объявлен RescheduleReceiver в WorkManager), разрешения POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED. MY_PACKAGE_REPLACED добавлен сверх ТЗ: APK ставится поверх, без него уведомление после обновления не вернётся до открытия приложения.
- res: drawable/ic_stat_tasks.xml (дуга из icon.svg), цвет фона адаптивной иконки #2F4858.
- app/build.gradle: versionName из package.json (JsonSlurper), versionCode 1, signingConfigs.release из env SECRETAR_KEYSTORE_PASSWORD / SECRETAR_KEY_ALIAS / SECRETAR_KEY_PASSWORD, ключ rootProject.file('../release.keystore'); явная зависимость androidx.core (NotificationCompat).
- Dockerfile.android: eclipse-temurin:21-jdk-noble + cmdline-tools 13114758, platforms;android-36, build-tools;36.0.0, лицензии; /gradle 1777 под именованный том.
- docker-compose.yml: android-web (secretar-node: npm install, build:android, cap sync) и android (depends_on completed_successfully, env_file .env.android, том gradle-cache).
- .gitignore: release.keystore, secretar.apk; .env.android покрыт .env.* (git check-ignore подтвердил).
- Ключ: keytool в eclipse-temurin:21-jdk-noble, PKCS12, RSA 4096, 36500 дней, alias secretar; пароль сгенерирован из /dev/urandom прямо в .env.android (права 600), нигде не печатался. release.keystore права 600.

## Веб-часть
- src/lib/notification-counts.ts (+ .test.ts, 14 тестов): HORIZON_DAYS = 60, horizonDates, countPendingByDay.
- src/lib/task-notifier.ts (+ .test.ts, 22 теста, моки @capacitor/core и ./task-repository через vi.hoisted, localStorage/document через vi.stubGlobal): isNotifierAvailable, load/saveNotificationsEnabled (ключ secretar.notifications, 'off' — выключен, иначе включён), refreshTaskNotification (очередь, ошибки в console.error), check/requestNotificationPermission, startTaskNotifier (старт: запрос разрешения только при 'prompt' и включённом пункте; visibilitychange → пересчёт).
- Вызовы: App.svelte $effect(() => startTaskNotifier()); CalendarScreen — после create и после успешного setCompleted (void refreshTaskNotification()); NotificationsScreen — при переключении.
- Маршрут #/settings/notifications (router.svelte.ts, BottomNav settingsActive, App), кнопка «Уведомления» в SettingsScreen под «Выбор темы», новый src/routes/NotificationsScreen.svelte.
- vitest.config.ts: coverage.include + notification-counts.ts, task-notifier.ts.
- Проверка: npm run test:coverage — 251 тест, 9 файлов, покрытие 100/100/100/100, TEST_EXIT=0; npm run check — 0 ошибок, 0 предупреждений, CHECK_EXIT=0.

## Первая сборка Gradle — падение
- docker compose run --rm android: android-web прошёл, Gradle упал: AGP 8.13 требует build-tools;35.0.0 по умолчанию и пытается доставить его в /opt/android-sdk (не открыт на запись пользователю хоста). Исправление: в Dockerfile.android ставится и build-tools;35.0.0 (минимальная правка без вмешательства в сгенерированные модули Capacitor).

## Документация
- Новые: docs/mechanic_android.md, docs/mechanic_notifications.md (frontmatter, разделы по шаблону механики, известные границы, тест-кейсы).
- Обновлены: docs/deployment.md (раздел «Android-приложение (APK)», абзац об обновлении APK), docs/tech_stack.md (строка Capacitor в таблице с обоснованием и отказом от @capacitor/local-notifications, раздел Android, рантайм-зависимости), docs/mechanic_themes.md (маршрут, экран настроек), docs/mechanic_tasks.md (вызов refreshTaskNotification в CalendarScreen), docs/INDEX.md (две механики, deployment). Строка «Состояние» в INDEX.md не тронута — это итог этапа, его пишет Claude после приёмки.

## Вторая сборка Gradle — успешно
- docker compose run --rm android: BUILD SUCCESSFUL in 1m 37s, EXIT=0; secretar.apk 3 793 646 байт.
- JUnit: testDebugUnitTest и testReleaseUnitTest — TaskCountsTest tests="18" failures="0" errors="0" в обоих.
- apksigner verify — код 0; схема v2 (v1 не нужна при minSdk 24), 1 подписант CN=Secretar, O=greatermagistr007, RSA 4096, SHA-256 сертификата 4b3e632d33e39ac79d040c6eea2e77a995f17f1c7fb3a3bd6c9839410179d58e.
- aapt badging: package io.github.greatermagistr007.secretar, versionCode 1, versionName 0.1.0, sdkVersion 24, targetSdkVersion 36, label «Секретарь», launchable MainActivity.
- aapt permissions: INTERNET, POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED, DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION (добавляет androidx.core сам).
- В логе Gradle: «platform-tools package is not installed, and automatic installation failed» (не фатально). В Dockerfile.android добавлен пакет platform-tools — пересборка образа и APK для проверки.
- Предупреждения «unchecked operations» — из модуля capacitor-android (не наш код).

## Третья сборка (после platform-tools) и итоговые проверки
- Образ secretar-android пересобран (код 0); docker compose run --rm android — EXIT=0, BUILD SUCCESSFUL in 14s (кэш Gradle в томе работает), предупреждения про platform-tools больше нет. apksigner verify secretar.apk — код 0.
- Ассеты в APK: index.html с ./assets/..., sw.js нет, шрифты url(../fonts/...) относительные, capacitor.plugins.json = [] (локальный плагин регистрируется в MainActivity).
- Pages: npm run build — код 0, PWA precache 10 entries, sw.js и manifest.webmanifest есть, base /secretar_v2/ во всех ссылках index.html. Сравнение с выгрузкой HEAD (git archive, сборка там же): состав dist совпадает (имена с нормализованными хешами), index.html совпадает. Бандл JS 205 895 → 217 577 байт (+11,7 КБ: @capacitor/core, мост, экран).
- npm run test:coverage — код 0, 251 тест, покрытие 100 %; npm run check — код 0, 0 ошибок, 0 предупреждений.
- grep TODO/FIXME по новому коду — пусто.
- Временные файлы memory/tmp_android_* удалены.

## Итог
Новые файлы: Dockerfile.android, capacitor.config.json, android/ (54 файла под git: шаблон Capacitor + TaskCounts.java, TaskNotifierPlugin.java, TaskNotifierReceiver.java, TaskCountsTest.java, ic_stat_tasks.xml, иконки и заставки), src/lib/notification-counts.ts (+test), src/lib/task-notifier.ts (+test), src/routes/NotificationsScreen.svelte, docs/mechanic_android.md, docs/mechanic_notifications.md. Вне git: release.keystore, .env.android, secretar.apk.
Изменённые: .gitignore, docker-compose.yml, package.json, package-lock.json, vite.config.ts, vitest.config.ts, src/App.svelte, src/lib/router.svelte.ts, src/lib/components/BottomNav.svelte, src/routes/SettingsScreen.svelte, src/routes/CalendarScreen.svelte, docs/deployment.md, docs/tech_stack.md, docs/mechanic_themes.md, docs/mechanic_tasks.md, docs/INDEX.md.
Отклонения от плана/ТЗ:
- В образ добавлены build-tools;35.0.0 (дефолт AGP 8.13, без него сборка падала) и platform-tools (убирает неудачную доустановку при каждой сборке).
- Сборка APK — два сервиса compose (android-web на alpine + android на JDK) вместо одного: общий node_modules с dev-контейнером на musl.
- MY_PACKAGE_REPLACED в фильтре приёмника — сверх ТЗ (уведомление после обновления APK поверх).
- Отдельного таймера полуночи в веб-части нет: смену суток при открытом приложении закрывает нативный будильник, горизонт продлевается при возвращении в приложение (visibilitychange) и при каждой записи.
- Splash-картинки шаблона (логотип Capacitor) заменены значком приложения.
Не сделано: шаг 8 (эмулятор) — по поручению делает отдельный проверяющий. Строка «Состояние» в docs/INDEX.md и хронология (history_sessions.md) не тронуты — их обновляет Claude после приёмки.
