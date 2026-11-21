---
name: mechanic_android
description: Android-приложение Secretar — упаковка веб-сборки через Capacitor, сборка APK в контейнере, подпись постоянным ключом, версия
type: project
---

# Механика: Android-приложение

Реализована 2026-11-21, этап 4 ([plan_stage_04_android.md](plan_stage_04_android.md)). Закрывает требование Т-29 (Android-приложение) по решениям Р-20 (Capacitor) и Р-30 (Android собирается сейчас). Уведомление о задачах дня — отдельная механика, [mechanic_notifications.md](mechanic_notifications.md).

## Модели
Нет. Данные APK — своя IndexedDB внутри WebView приложения, с браузерной версией не связаны (требование Т-29). Перенос данных между ними — вне этапа, в бэклоге.

## Миграции
Нет.

## Маршруты
Те же хэш-маршруты, что в браузере (решение Р-19): WebView открывает `index.html` из ассетов APK, хэш-роутинг работает без сервера.

## Контроллеры
Нет.

## Views
Тот же веб-код. Отличия режима сборки `capacitor` — в разделе «Сервисы».

## Сервисы

### Две сборки Vite
`vite.config.ts` — функция от режима:
- обычная сборка (`npm run build`, GitHub Pages) — `base: '/secretar_v2/'`, service worker и манифест PWA, как раньше;
- `npm run build:android` (`vite build --mode capacitor`) — `base: './'`, плагин PWA не подключается: ассеты и так лежат в APK, а кэш service worker держал бы старую версию после обновления APK.

Выход обеих — `dist/`: отдельный каталог не заводится, сборки идут разными командами и в разных местах (Pages собирает workflow GitHub). В `index.html` ссылки на favicon и apple-touch-icon записаны абсолютными путями `/secretar_v2/...`; в WebView они не находятся, но и не нужны — там нет вкладки и закладок. Сборку это не ломает.

### Capacitor
- `capacitor.config.json` в корне: `appId` `io.github.greatermagistr007.secretar`, `appName` «Секретарь», `webDir` `dist`.
- Пакеты (версии точные): `@capacitor/core` и `@capacitor/android` 8.6.2 в `dependencies`, `@capacitor/cli` 8.6.2 в `devDependencies` — обоснование в [tech_stack.md](tech_stack.md).
- Каталог `android/` создан `npx cap add android` (шаблон Capacitor 8.6.2: Android Gradle Plugin 8.13.0, Gradle 8.14.3, `compileSdk`/`targetSdk` 36, `minSdk` 24, Java 21) и коммитится. Вне git — то, что пересоздаёт `npx cap sync android`: `android/app/src/main/assets/public` (копия `dist/`), `capacitor.config.json` и `capacitor.plugins.json` в ассетах, `android/capacitor-cordova-android-plugins/`, а также каталоги `build/` (`android/.gitignore` шаблона).
- Правки шаблона: `MainActivity` регистрирует локальные плагины `TaskNotifierPlugin`, `ModelDownloaderPlugin` (докачка модели для голоса) и `VoicePlugin` (голосовая кнопка, [mechanic_voice.md](mechanic_voice.md)); в манифесте — приёмник, разрешения уведомления и точного будильника (см. mechanic_notifications.md), микрофон, вибрация и библиотеки GPU (см. «Голосовая кнопка»), `usesCleartextTraffic` (см. «HTTP без шифрования»), правила резервной копии `res/xml/backup_rules.xml` и `res/xml/data_extraction_rules.xml` (см. «Резервная копия»); удалены шаблонные `ExampleUnitTest`, `ExampleInstrumentedTest` и неиспользуемые drawable-заготовки иконки.

### Иконка и заставка
Сгенерированы из `public/icons/icon.svg` (ImageMagick с поддержкой SVG в контейнере `alpine`):
- `mipmap-*/ic_launcher.png` — значок как есть, 48 dp на каждую плотность;
- `mipmap-*/ic_launcher_round.png` — тот же значок, скругление до круга;
- `mipmap-*/ic_launcher_foreground.png` — передний слой адаптивной иконки, 108 dp: только дуга буквы на прозрачном фоне, с полями (`viewBox="-77 -77 666 666"`), чтобы после маски дуга занимала примерно ту же долю, что в иконке PWA; фон слоя — цвет `#2F4858` в `values/ic_launcher_background.xml`;
- `drawable*/splash.png` — заставка шаблона (логотип Capacitor) заменена значком по центру на фоне `#f6f7f9` (цвет `background_color` манифеста PWA), размеры файлов прежние;
- `drawable/ic_stat_tasks.xml` — одноцветный значок уведомления, та же дуга векторным путём.

Команды генерации:
```
# из корня проекта, в контейнере alpine с imagemagick и imagemagick-svg
sed 's/rx="112" ry="112"/rx="256" ry="256"/' public/icons/icon.svg > round.svg
sed -e '/<rect/d' -e 's/viewBox="0 0 512 512"/viewBox="-77 -77 666 666"/' public/icons/icon.svg > fg.svg
magick -background none -density 384 public/icons/icon.svg -resize 192x192 PNG32:.../mipmap-xxxhdpi/ic_launcher.png
magick -background none -density 384 round.svg -resize 192x192 PNG32:.../mipmap-xxxhdpi/ic_launcher_round.png
magick -background none -density 384 fg.svg -resize 432x432 PNG32:.../mipmap-xxxhdpi/ic_launcher_foreground.png
# заставка: значок 40 % меньшей стороны по центру на #f6f7f9
magick -size WxH xc:'#f6f7f9' icon.png -gravity center -composite PNG24:.../splash.png
```
Размеры по плотностям: mdpi ×1, hdpi ×1,5, xhdpi ×2, xxhdpi ×3, xxxhdpi ×4 от 48 dp (значок) и 108 dp (передний слой).

### Сборка APK
Всё — в docker, одной командой из корня проекта:
```
env UID=$(id -u) GID=$(id -g) docker compose run --rm android
```
Два сервиса `docker-compose.yml`:
1. `android-web` (образ `secretar-node`, `node:22-alpine`) — `npm install`, `npm run build:android`, `npx cap sync android`.
2. `android` (образ `secretar-android` из `Dockerfile.android`, запускается после успешного `android-web` через `depends_on: condition: service_completed_successfully`) — `./gradlew --no-daemon test assembleRelease`, затем копия `app/build/outputs/apk/release/app-release.apk` в `./secretar.apk` (корень проекта, вне git).

Почему два образа, а не один с Node и JDK: `node_modules/` общий с dev-контейнером на alpine (musl). `npm install` в glibc-образе заменил бы нативные бинарники сборщика (rolldown) на glibc-варианты, и dev-контейнер перестал бы собирать. Gradle Node не нужен — `capacitor.settings.gradle` берёт исходники `@capacitor/android` прямо из `node_modules/`.

`Dockerfile.android`: `eclipse-temurin:21-jdk-noble`, Android command-line tools (сборка 13114758), `platforms;android-36`, `build-tools;36.0.0` (apksigner и aapt для проверки) и `build-tools;35.0.0` — это версия по умолчанию Android Gradle Plugin 8.13; без неё Gradle пытается доставить пакет сам и падает, потому что каталог SDK пользователю хоста не открыт на запись (так и упала первая сборка). Лицензии SDK принимаются при сборке образа. Кэш Gradle — именованный том `gradle-cache` (`GRADLE_USER_HOME=/gradle`); каталог в образе открыт на запись (`1777`), потому что Docker наполняет новый том содержимым и правами этого каталога. Первая сборка скачивает дистрибутив Gradle и зависимости, следующие берут их из тома.

`test` прогоняет JUnit-тесты модуля `app` (debug и release) — без зелёных тестов APK не собирается.

### Подпись
- Ключ — `release.keystore` в корне проекта: PKCS12, RSA 4096, срок 36 500 дней, alias `secretar`. Сгенерирован один раз `keytool` в контейнере `eclipse-temurin:21-jdk-noble`, права файла 600.
- Пароли — `.env.android` в корне проекта, права 600; передаются в контейнер через `env_file` сервиса `android`. Переменные: `SECRETAR_KEYSTORE_PASSWORD`, `SECRETAR_KEY_ALIAS`, `SECRETAR_KEY_PASSWORD` (у PKCS12 пароль ключа совпадает с паролем хранилища).
- Оба файла вне git: `release.keystore` — явной строкой в `.gitignore`, `.env.android` покрыт шаблоном `.env.*`. **Потеря ключа или паролей = обновление поверх установленного APK невозможно**: Android ставит новую версию только с той же подписью, иначе — удаление приложения вместе с данными. Ключ и `.env.android` нужно хранить в резервной копии вне репозитория и переносить на другое устройство разработки вручную.
- `android/app/build.gradle`: `signingConfigs.release` читает переменные окружения, файл ключа — `rootProject.file('../release.keystore')`. `env_file` объявлен необязательным (`path: .env.android`, `required: false`, Compose 2.24+): обязательный ломал загрузку всего проекта compose, и на устройстве без файла не запускался ни один сервис, включая `dev`, `build` и `check`. Теперь без `.env.android` остальные сервисы работают, а сборка APK без паролей должна остановиться на подписи в Gradle (сборкой без файла не проверялось). Проверено `docker compose config -q` на копии compose без файла и в корне с файлом — код 0 в обоих случаях.

Команда, которой создан ключ (пароль берётся из `.env.android`, на экран не выводится):
```
docker run --rm --env-file .env.android -v "$PWD":/app -w /app --user "$(id -u):$(id -g)" \
  eclipse-temurin:21-jdk-noble sh -c 'keytool -genkeypair -keystore release.keystore \
  -storetype PKCS12 -alias "$SECRETAR_KEY_ALIAS" -keyalg RSA -keysize 4096 -validity 36500 \
  -storepass "$SECRETAR_KEYSTORE_PASSWORD" -keypass "$SECRETAR_KEY_PASSWORD" \
  -dname "CN=Secretar, O=greatermagistr007"'
```

### Версия
- `versionName` берётся из поля `version` в `package.json` (`JsonSlurper` в `android/app/build.gradle`) — второго места с номером версии нет.
- `versionCode` — целое в `android/app/build.gradle`, сейчас `6` (выдачи владельцу: `1` — 2026-11-21 первая, `2` — 2026-11-21 с датой и приоритетом в одну строку, `3` — 2026-11-21 с точным будильником полуночи, `4` — 2026-11-21 со списком задач сегодняшнего дня при запуске, `5` — 2026-11-21 с экраном «Настройки → Голос» и докачкой модели, `6` — 2026-11-21 с голосовой кнопкой и журналом). `versionName` не менялся (0.1.0): в проекте номер версии в `package.json` по выдачам не поднимается. **Перед каждой новой выдачей APK его нужно увеличить на единицу**: Android не ставит APK поверх установленного с большим `versionCode`, а одинаковый номер не позволяет отличить сборки друг от друга. Порядок выдачи: поднять `versionCode` (и при желании `version` в `package.json`) → собрать командой выше → проверить → закоммитить поднятый номер вместе с изменениями.

### Резервная копия
`android:allowBackup="true"` с правилами (с 2026-11-21): `android:fullBackupContent="@xml/backup_rules"` (Android 11 и ниже, `<full-backup-content>`) и `android:dataExtractionRules="@xml/data_extraction_rules"` (Android 12+, `<cloud-backup>` и `<device-transfer>`). Синтаксис — https://developer.android.com/identity/data/autobackup; при `minSdk` 24 нужны оба файла.
- Исключены только модель для голоса (`<exclude domain="external" path="models"/>` — каталог `getExternalFilesDir("models")`), состояние её загрузки (`<exclude domain="sharedpref" path="model_downloader.xml"/>`) и журнал голосовых нажатий с записями звука (`<exclude domain="external" path="voice-logs"/>`, с 2026-11-21: отладочные данные и голос владельца в облачной копии не нужны), [mechanic_voice.md](mechanic_voice.md). `<include>` нет — всё остальное остаётся в копии по умолчанию, в том числе задачи (IndexedDB WebView в `app_webview`) и `task_notifier.xml`.
- Зачем: по умолчанию Auto Backup берёт и `getExternalFilesDir`; модель 2,6 ГБ больше квоты облачной копии (25 МБ), и при превышении копия приложения не делается вовсе — задачи остались бы без резервной копии. При переносе на новый телефон квоты нет, но копировать 2,6 ГБ незачем, а номер загрузки DownloadManager на другом телефоне ничего не значит.
- Проверено на эмуляторе Android 15 (локальный транспорт `bmgr`): без правил — «Size quota exceeded», с правилами — «Success», копия 4,5 МБ без модели и `model_downloader.xml`, с IndexedDB.
- Не заменено на `allowBackup="false"`: это лишило бы копии и задачи.

### HTTP без шифрования
`android:usesCleartextTraffic="true"` на `<application>` (с 2026-11-21, решение Р-36): модель для голоса докачивается по HTTP с компьютера в локальной сети, у сервера нет сертификата ([mechanic_voice.md](mechanic_voice.md)).
- Без него при `targetSdk` 36 HTTP запрещён, и DownloadManager соблюдает политику запросившего приложения — проверено на эмуляторе Android 15: `Stop requested with status BAD_REQUEST: Cleartext traffic not permitted for package io.github.greatermagistr007.secretar`.
- `network_security_config` не заведён: адрес сервера вводит пользователь, это любой адрес локальной сети, а `<domain-config>` принимает только имена хостов и отдельные адреса, не диапазоны. Сузить разрешение им нельзя — получился бы `<base-config cleartextTrafficPermitted="true">` с тем же действием, но отдельным файлом. Один атрибут — минимальный способ с тем же результатом.
- Следствие: HTTP разрешён приложению целиком. Сама веб-часть грузится из APK (`https://localhost` WebView), смешанное содержимое Capacitor по умолчанию запрещает — атрибут его не открывает; других HTTP-запросов у приложения на 2026-11-21 нет (поиск `fetch(`, `http://`, `CapacitorHttp` по `src/` и `index.html` — пусто).
- **Пересмотреть при появлении сетевых обращений к внешним API** (облачные варианты голоса через нативный `CapacitorHttp` в плане этапа 5, [plan_stage_05_voice.md](plan_stage_05_voice.md)): с этим атрибутом ошибочный `http://` в адресе API пройдёт молча, без отказа системы. Тогда — `network_security_config` с запретом HTTP для доменов API или отдельная проверка схемы в коде.
- Новых разрешений докачка не добавила: DownloadManager и `getExternalFilesDir` разрешений не требуют, `INTERNET` уже был.

### Голосовая кнопка (с 2026-11-21, решения Р-34, Р-37)
- **Зависимость:** `implementation "com.google.ai.edge.litertlm:litertlm-android:0.19.1"` в `android/app/build.gradle` (Google Maven, https://dl.google.com/android/maven2/com/google/ai/edge/litertlm/litertlm-android/maven-metadata.xml). Транзитивно — gson 2.14.0, kotlin-reflect и kotlin-stdlib 2.4.0, kotlinx-coroutines-android 1.11.0 (POM 0.19.1). Kotlin-плагин Gradle не добавлен: API вызывается из Java (`ToolKt.tool`, `Contents.Companion.of`, `Message.Companion`), сборка проходит без него. Lint печатает строки `e: ... Module was compiled with an incompatible version of Kotlin. The binary version of its metadata is 2.4.0, expected version is 2.2.0` для этих библиотек — это анализатор `lintVitalAnalyzeRelease`, сборку он не останавливает (`BUILD SUCCESSFUL`).
- **Размер APK** вырос с единиц мегабайт до ~55 МБ: нативные библиотеки LiteRT-LM для `arm64-v8a` и `x86_64` (32-битных у библиотеки нет — на 32-битных телефонах голос не заработает, приложение ставится). `x86_64` нужна эмулятору; убрать её из выдачи (`abiFilters`) можно отдельным решением.
- **Разрешения:** `RECORD_AUDIO` — опасное, запрашивается при первом нажатии кнопки механизмом Capacitor (`@CapacitorPlugin(permissions = @Permission(strings = RECORD_AUDIO, alias = "microphone"))`, `checkPermissions`/`requestPermissions` в `src/lib/voice.ts`); `VIBRATE` — обычное, выдаётся при установке (сигнал «запись пошла»).
- **GPU:** в `<application>` — `<uses-native-library android:name="libvndksupport.so" android:required="false"/>` и то же для `libOpenCL.so`, как требует `docs/api/kotlin/getting_started.md` LiteRT-LM v0.19.1: с `targetSdk` 31+ системные библиотеки OpenCL приложению без этого не видны. `required="false"` — телефон без них приложение ставит, модель загружается на CPU.
- **Обновление поверх с сохранением модели:** `applicationId`, ключ подписи, каталог `models`, имя файла и ключи `model_downloader.xml` не менялись; голосовой плагин читает отметку `verified_file` загрузчика (`ModelDownloaderPlugin.PREFS`, `KEY_VERIFIED` стали видимыми в пакете).
- JUnit `WavFileTest`, `VoiceLogTest` прогоняются задачей `test` вместе с прежними.

## Jobs
Нет.

## API
Нет.

## Настройки
`.env.android` — см. «Подпись». Имена переменных без значений — в `.env.example` в корне (коммитится, исключение `!.env.example` в `.gitignore`); настоящие значения — только в `.env.android` вне git.

## Примечания

### Проверка готового APK
Из корня проекта, в том же образе:
```
docker run --rm -v "$PWD":/app -w /app secretar-android apksigner verify --print-certs secretar.apk
docker run --rm -v "$PWD":/app -w /app secretar-android aapt dump badging secretar.apk
docker run --rm -v "$PWD":/app -w /app secretar-android aapt dump permissions secretar.apk
```

### Известные границы
- **Данные APK и браузера раздельны**: задачи, созданные в браузере, в APK не видны и наоборот (требование Т-29).
- **Обновление веб-части приходит только с новым APK**: service worker в APK не работает, публикация на Pages установленное приложение не меняет.
- **Подпись привязана к одному ключу**, см. «Подпись».
