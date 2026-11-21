# Проверка точного будильника полуночи (APK versionCode 3) на эмуляторе — независимый проверяющий, 2026-11-21

APK: secretar.apk (3 793 150 байт, mtime 2026-11-21 10:44). Изменение: TaskNotifierReceiver — `setExactAndAllowWhileIdle` при `canScheduleExactAlarms()`, иначе `setAndAllowWhileIdle`; манифест — USE_EXACT_ALARM и SCHEDULE_EXACT_ALARM (maxSdkVersion 32).
Окружение: образ secretar-emu-check (тот же, что в memory/findings_android_emulator.md), контейнер `secretar-emu-exact` (мой, удаляется в конце), --device /dev/kvm, headless swiftshader, Android 15 (SDK 35), Europe/Moscow. Временные файлы — memory/tmp_exact_work/.

## Сценарий 1. Установка, запуск, разрешения — ПРОЙДЕН
- Эмулятор загрузился за 83 с; `date` → `Sat Nov 21 10:46:46 MSK 2026`, `persist.sys.timezone` = Europe/Moscow.
- `adb install /apk/secretar.apk` → `Success`; `dumpsys package`: `versionCode=3 minSdk=24 targetSdk=36`.
- `dumpsys package ... | grep -i alarm`: в requested permissions — `android.permission.USE_EXACT_ALARM`; в install permissions — `android.permission.USE_EXACT_ALARM: granted=true`. SCHEDULE_EXACT_ALARM на SDK 35 не запрошено (maxSdkVersion 32 — так и задумано).
- `appops get ... SCHEDULE_EXACT_ALARM` → `No operations. Default mode: default` (на SDK 35 разрешение не запрошено, appop не используется). `appops get ... USE_EXACT_ALARM` → `Error: Unknown operation string: USE_EXACT_ALARM` — у USE_EXACT_ALARM нет appop, это обычное install-разрешение; факт его действия — `exactAllowReason=policy_permission` у будильника (ниже).
- Запуск monkey → системный диалог «Allow Секретарь to send you notifications?», тап 'Allow' (540,1312) → `POST_NOTIFICATIONS: granted=true, flags=[ USER_SET|...]`.
- Сразу после запуска (задач нет, уведомлений 0) будильник уже точный:
  `RTC_WAKEUP #32: Alarm{695ce8d type 0 origWhen 1795294800000 whenElapsed 47678133 io.github.greatermagistr007.secretar}`
  `tag=*walarm*:io.github.greatermagistr007.secretar.MIDNIGHT`
  `type=RTC_WAKEUP origWhen=2026-11-22 00:00:00.000 window=0 exactAllowReason=policy_permission repeatInterval=0 count=0 flags=0x5`
  `whenElapsed=+13h12m42s393ms maxWhenElapsed=+13h12m42s393ms`
  flags=0x5 = FLAG_STANDALONE (0x1) | FLAG_ALLOW_WHILE_IDLE (0x4); whenElapsed = maxWhenElapsed — окна нет. В прошлой проверке (versionCode 1) здесь было `window=+1h0m0s0ms`.

## Сценарий 2. Задача на завтра, будильник точный — ПРОЙДЕН (главный факт)
- UI: тап по 22 ноября (946,895) → «Задачи на 22 ноября 2026 / На этот день задач нет.» → «+» 'Добавить задачу' (967,2066) → 'Новая задача', поле 'Дата' = `2026-11-22` → `input text "Tomorrow%stask"` → 'Сохранить'. Календарь: «21 ноября 2026, задач нет», «22 ноября 2026, задач: 1», в списке дня 'Tomorrow task'.
- Уведомлений пакета 0 (на сегодня задач нет) — верно.
- `dumpsys alarm` (10:48:04 MSK 21.11):
  `tag=*walarm*:io.github.greatermagistr007.secretar.MIDNIGHT`
  `type=RTC_WAKEUP origWhen=2026-11-22 00:00:00.000 window=0 exactAllowReason=policy_permission repeatInterval=0 count=0 flags=0x5`
  `policyWhenElapsed: requester=+13h11m55s869ms app_standby=-5s183ms device_idle=-- battery_saver=-5s183ms`
  `whenElapsed=+13h11m55s869ms maxWhenElapsed=+13h11m55s869ms`
- Итог: окно нулевое (`window=0`, whenElapsed = maxWhenElapsed), разрешение на точный — `exactAllowReason=policy_permission` (USE_EXACT_ALARM), флаги 0x5 = STANDALONE | ALLOW_WHILE_IDLE. `window=+1h` больше нет — замечание З-1 прошлой проверки по сути устранено.

## Сценарий 3. Полночь 21→22 без открытия приложения — ПРОЙДЕН (уведомление в 00:00:00.063)
- Подготовка: `adb root`; `settings put global auto_time 0`, `auto_time_zone 0`. HOME → `am kill` → pidof пуст. `logcat -c` (main, events, crash).
- `cmd alarm set-time 1795294680000` (2026-11-21 23:58:00 MSK) → `date` = `Sat Nov 21 23:58:03 MSK 2026`. TIME_SET поднял приёмник: `23:58:00.133 Start proc 4440 ... for broadcast {.../TaskNotifierReceiver}`; уведомлений 0. Будильник после перепостановки по TIME_SET по-прежнему точный:
  `origWhen=2026-11-22 00:00:00.000 window=0 exactAllowReason=policy_permission ... flags=0x5`, `whenElapsed=+1m56s889ms maxWhenElapsed=+1m56s889ms` (за 2 минуты до полуночи окно не сжималось — его просто нет).
- `23:58:12.315 am_kill [0,4440,...secretar,905,kill background]` — процесс снова убит перед полуночью.
- Полночь (`logcat -b events`):
  `11-22 00:00:00.005 I/am_proc_start: [0,4585,10209,io.github.greatermagistr007.secretar,broadcast,{.../TaskNotifierReceiver}]`
  `11-22 00:00:00.063 I/notification_enqueue: [10209,4585,io.github.greatermagistr007.secretar,1,NULL,0,Notification(channel=pending_tasks ... flags=ONGOING_EVENT|ONLY_ALERT_ONCE ... groupKey=silent vis=PRIVATE),0]`
  `android.title=String (Незавершённых задач на сегодня: 1)`; topResumedActivity — NexusLauncherActivity (приложение не открывалось).
- В прошлой проверке (неточный будильник) то же событие было в 00:00:22.410; теперь 00:00:00.063.
- `dumpsys alarm` (статистика): `+64ms running, 1 wakeups, 1 alarms: u0a209:io.github.greatermagistr007.secretar` / `*walarm*:io.github.greatermagistr007.secretar.MIDNIGHT`.
- Следующий будильник — тоже точный: `origWhen=2026-11-23 00:00:00.000 window=0 exactAllowReason=policy_permission repeatInterval=0 count=0 flags=0x5`, `whenElapsed=+23h59m49s245ms maxWhenElapsed=+23h59m49s245ms`.

## Режим Doze. Полночь 22→23 в принудительном deep idle — ПРОЙДЕН
- Состояние до: на 22.11 уведомление «Незавершённых задач на сегодня: 1», на 23.11 задач нет — в полночь уведомление должно сняться.
- `cmd alarm set-time 1795381080000` (2026-11-22 23:58:00 MSK) → `am kill` (pidof пуст) → `svc power stayon false`, `dumpsys battery unplug`, `input keyevent KEYCODE_SLEEP` → `dumpsys deviceidle enable` → `dumpsys deviceidle force-idle` → `Now forced in to deep idle mode`; `get deep` = `IDLE`.
- В Doze будильник: `origWhen=2026-11-23 00:00:00.000 window=0 exactAllowReason=policy_permission ... flags=0x5`, `policyWhenElapsed: requester=+1m51s180ms app_standby=-2s333ms device_idle=-2s205ms ...`, `whenElapsed=+1m51s180ms maxWhenElapsed=+1m51s180ms` — политика device_idle его не откладывает. Система при этом спит до `Idling until ... *walarm*:DeviceIdleController.deep ... whenElapsed=+14m57s795ms` (следующее окно обслуживания через ~15 мин, т. е. неточный будильник ждал бы его).
- `get deep` в 23:59:5x = `IDLE`, после полуночи (00:00:11) = `IDLE` — устройство из Doze не выходило.
- Срабатывание (`logcat -b events`):
  `11-23 00:00:00.022 I/am_proc_start: [0,4932,10209,io.github.greatermagistr007.secretar,broadcast,{.../TaskNotifierReceiver}]`
  `11-23 00:00:00.044 I/notification_canceled: [0|io.github.greatermagistr007.secretar|1|null|10209,8,...]` — reason=8 (снято приложением), уведомлений пакета 0.
- Статистика: `+93ms running, 2 wakeups, 2 alarms: u0a209:io.github.greatermagistr007.secretar *walarm*:...MIDNIGHT`. Следующий: `origWhen=2026-11-24 00:00:00.000 window=0 exactAllowReason=policy_permission ... flags=0x5`.
- Оговорка: это принудительный Doze эмулятора (force-idle), а не естественный на физическом телефоне; вендорские «оптимизаторы батареи» (Xiaomi, Huawei и т. п.) не проверены.

## Сценарий 4. Регрессия — ПРОЙДЕН
Подготовка: 23.11 00:01, приложение открыто, на 23.11 создана «Today task» через UI → `android.title=String (Незавершённых задач на сегодня: 1)`.
- Смахивание (HOME → `cmd statusbar expand-notifications` → `input swipe 300 1070 1050 1070 300` по строке «Незавершённых задач на сегодня: 1» [179,1045][811,1096]):
  `00:01:33.147 notification_canceled: [0|io.github.greatermagistr007.secretar|1|null|10209,2,...]` (reason=2, пользователь) →
  `00:01:33.150 notification_enqueue: [10209,4932,io.github.greatermagistr007.secretar,1,...]` — вернулось через 3 мс, title «…: 1».
- Отметка выполнения (тап CheckBox 103,1533): `00:01:50.379 notification_canceled [... ,8,...]` (reason=8), count=0, подпись «Снять отметку выполнения». Будильник остаётся: `origWhen=2026-11-24 00:00:00.000 window=0 exactAllowReason=policy_permission ... flags=0x5`. Снятие отметки → уведомление «…: 1» вернулось.
- Настройки → Уведомления → снять «Показывать push уведомление с задачами» (114,412): `00:02:17.672 notification_canceled [... ,8,...]`, count=0; в `dumpsys alarm` у u0a209 нет ожидающих будильников («Pending alarms per uid» без u0a209), в Removal history: `u0a209: #1: Reason=alarm_cancelled ... rtc=2026-11-23 00:02:17.671 ... tag=*walarm*:io.github.greatermagistr007.secretar.MIDNIGHT`. Включение обратно → «…: 1» и снова `origWhen=2026-11-24 00:00:00.000 window=0 exactAllowReason=policy_permission ... flags=0x5`.

## Сценарий 5. Крэши — ПРОЙДЕН
- `logcat -b crash` (очищен 21.11 в 23:58, перед первой полуночью) — 0 строк; `logcat | grep 'FATAL EXCEPTION|AndroidRuntime.*secretar'` — пусто; `dumpsys dropbox` — нет data_app_crash / data_app_anr / native_crash за всю сессию эмулятора.

## Дефекты и замечания
Дефектов не найдено. Будильник полуночи на Android 15 точный (`window=0`, `exactAllowReason=policy_permission`, flags=0x5), срабатывает в 00:00:00.0xx, в том числе в принудительном Doze.

## Не проверено
- Запасная ветка `setAndAllowWhileIdle` (`canScheduleExactAlarms()` = false): на Android 15 USE_EXACT_ALARM — install-разрешение без appop, отозвать его штатно нельзя; ветка срабатывает только на Android 12 (SDK 31–32) при отозванном SCHEDULE_EXACT_ALARM. Образа Android 12 нет — НЕ ПРОВЕРЕНО.
- Android 12/13/14 — только Android 15 (SDK 35); на SDK 31–32 путь SCHEDULE_EXACT_ALARM не проверен.
- Естественный Doze на физическом телефоне и вендорские оптимизаторы батареи — проверен только `dumpsys deviceidle force-idle` на эмуляторе.
- Реальная полночь без перевода часов (часы переводились `cmd alarm set-time` за 2 минуты до 00:00).
- Политика Google Play для USE_EXACT_ALARM (разрешено только календарям/будильникам) — вне задачи; APK раздаётся не через Play (не проверялось, к эмулятору не относится).

## Уборка
Контейнер secretar-emu-exact остановлен и удалён; образ secretar-emu-check не тронут; memory/tmp_exact_work удалён.
