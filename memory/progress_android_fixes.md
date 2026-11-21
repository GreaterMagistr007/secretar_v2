# Исправление находок ревью этапа 4 (Android), 2026-11-21
Источник: memory/findings_skeptic_android.md (находки 1-8), memory/findings_android_emulator.md (З-1).
## Ход
- Прочитаны CLAUDE.md, отчёт скептика, отчёт эмулятора, mechanic_notifications.md, mechanic_android.md, TaskCounts/TaskNotifierReceiver/TaskCountsTest, vitest.config.ts, notification-counts(.test).ts.
- П.1 сделан: docker-compose.yml, сервис android — env_file длинной формой [{path: .env.android, required: false}]. До правки: копия compose без файла (memory/tmp_fix_compose) `docker compose config -q` → код 14 «env file ... not found». После: без файла код 0 (и config каждого сервиса dev/build/check/android-web/android — код 0); в корне с файлом код 0, в итоговом конфиге 3 ключа SECRETAR_ (значения не выводились). Docs: mechanic_android.md («Подпись», строка про env_file), deployment.md.
- П.5 сделан: .env.example в корне — три имени (SECRETAR_KEYSTORE_PASSWORD, SECRETAR_KEY_ALIAS, SECRETAR_KEY_PASSWORD, сверено с build.gradle:30-32) с пустыми значениями и комментарием. `git status --ignored` → `?? .env.example` (не игнорируется), `git check-ignore -q` → 1. Docs: mechanic_android.md «Настройки», deployment.md, комментарий в docker-compose.yml.
- П.2 сделан: в src/lib/notification-counts.test.ts блок «horizonDates в восточной зоне» — beforeEach ставит process.env.TZ='Europe/Moscow', afterEach возвращает зону стенда (undefined — delete). 3 теста: страж «смещение -180», горизонт 21-23.11, переход года. Смена TZ на лету в Node проверена (memory/tmp_fix_tz/tz.mjs: 300 → -180 → 300) и стражем внутри vitest.
  Мутация на копии (memory/tmp_fix_mut, отдельный vitest-конфиг; в копию теста добавлена временная проверка «после блока зона снова America/New_York, смещение 300»): мутант toIsoDate(...) → new Date(...).toISOString().slice(0,10) — 2 failed | 16 passed, код 1 (получено ['2026-11-20',...] вместо ['2026-11-21',...]); без мутации — 18 passed, код 0; проверка восстановления зоны прошла в обоих прогонах. sha256 src/lib/notification-counts.ts до и после: 801e060f…3427, `sha256sum -c` — ЦЕЛ.
  vitest.config.ts: неверная фраза «любая UTC-арифметика падает сразу» заменена на точное описание границы.
- П.3 сделан: TaskCounts.countToShow(enabled, stored, millis, zone) — enabled ? countFor(parse(stored), dateKey(millis, zone)) : 0; refresh вызывает её. JUnit +5 тестов в TaskCountsTest: выключено при числе на сегодня, включено без записи ("" и null), число на сегодня (Москва 3 / Нью-Йорк 2 для одного момента), сегодня 0, битая строка.
- П.4 сделан: TaskNotifierReceiver.refresh — static synchronized, причина в Javadoc.
- П.7 сделан: комментарий у setAndAllowWhileIdle — окно до часа (dumpsys window=+1h0m0s), rare/restricted дольше.
- П.6 сделан: mechanic_notifications.md «Известные границы» — будильник (окно до часа, App Standby), принудительная остановка (снимает и будильник, и уведомление; смахивание из недавних у части производителей), отключённый канал, отсутствие пересчёта при смене суток в веб-части (ссылка на существующий раздел); новый подраздел «Проверка на эмуляторе» со ссылкой на memory/findings_android_emulator.md. Также описаны countToShow и synchronized в «Нативная часть», тесты восточной зоны в «Расчёт».
- docs/plan_stage_04_android.md шаг 5: «задержка в минуты» уточнена ссылкой на окно до часа.
## Проверки веб-части (node:22-alpine)
- npm run test:coverage — код 0, 9 файлов, 254 теста, покрытие 100/100/100/100 (notification-counts.test.ts — 17 тестов).
- npm run check — код 0, svelte-check 0 errors 0 warnings.
- npm run build (Pages) — код 0, PWA precache 10 записей, base /secretar_v2/, sw.js/manifest на месте.
## Сборка APK
- `env UID=$(id -u) GID=$(id -g) docker compose run --rm android` — код 0, BUILD SUCCESSFUL; testDebugUnitTest и testReleaseUnitTest выполнены заново: TaskCountsTest 23 теста (было 18, +5 countToShow), 0 failures, 0 errors в обоих.
- secretar.apk пересобран (3 793 454 байт, 10:17; прежний sha256 6ff4586c…8fee). apksigner verify --print-certs — код 0, Signer #1 DN: CN=Secretar, O=greatermagistr007. aapt badging: versionCode='1', versionName='0.1.0'.
- git status: изменений в отслеживаемых файлах android/ от сборки нет (android/ целиком ещё не в git).
## Итог
Все 7 пунктов сделаны. Временные memory/tmp_fix_* удалены.
