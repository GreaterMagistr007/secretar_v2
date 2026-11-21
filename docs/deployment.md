---
name: deployment
description: Сборка, локальный запуск и публикация проекта Secretar на GitHub Pages
type: project
---

# Сборка и публикация

## Локальная разработка
Сборка и dev-сервер работают в docker-контейнере (решение Р-17 — окружение сборки в контейнере), образ `node:22-alpine`. Node на хосте (20.20.1) — запасной путь.

**Проверка идёт локально, а не на GitHub Pages** (указание владельца 2026-09-13): публикация каждый раз ждёт прогона workflow и обновления кэшей, поэтому новая работа сначала смотрится на dev-сервере и только после одобрения владельцем уходит в `master`. Адрес локально — `http://localhost:5173/secretar_v2/` (путь с `base`, как на Pages).

```
docker compose up dev      # dev-сервер на http://localhost:5173
docker compose run --rm build   # продакшен-сборка в dist/
docker compose run --rm check   # svelte-check: типы и a11y
```

Команды внутри контейнера — обычные npm-скрипты (`npm run dev`, `npm run build`, `npm run check`), поэтому запасной путь без docker — те же скрипты на хосте.

## Публикация: GitHub Pages
- Репозиторий: `GreaterMagistr007/secretar_v2`, ветка `master`.
- Адрес сайта: `https://greatermagistr007.github.io/secretar_v2/`.
- Источник Pages: **GitHub Actions** (не ветка `gh-pages`).
- Workflow: `.github/workflows/deploy.yml` — собирает проект и публикует `dist/` через `actions/upload-pages-artifact` + `actions/deploy-pages`.
- Триггер: пуш в `master` и ручной запуск (`workflow_dispatch`).
- `base` сборки — `/secretar_v2/`: сайт отдаётся из подкаталога, при `base: '/'` ассеты не найдутся.

### Условие, без которого Pages не включатся
GitHub Pages на тарифе `free` работают **только для публичных репозиториев**. Репозиторий проекта был приватным (проверено 2026-09-13 через GitHub API: `private: true`, план аккаунта `free`, `GET /pages` → 404). Владелец принял решение сделать репозиторий публичным — вопрос В-5 (условия публикации на GitHub Pages).

### Разовая настройка в интерфейсе GitHub
1. Сделать репозиторий публичным: **Settings → General → Danger Zone → Change repository visibility → Change to public**, подтвердить вводом полного имени `GreaterMagistr007/secretar_v2`.
2. Включить Pages: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. После первого успешного прогона workflow сайт открывается по адресу выше; первая публикация занимает пару минут.

## Кто деплоит
Решение Р-18 (деплой на GitHub Pages выполняется в рамках проекта): публикация — это пуш в `master`, дальше работает workflow. Глобальный запрет «Claude никогда не деплоит» относится к рабочим серверам Vigbo и здесь не действует: Secretar — личный проект владельца на GitHub Pages, публикация разрешена им прямо. Разовая настройка в интерфейсе GitHub (пункты выше) выполняется владельцем — у Claude нет доступа к настройкам репозитория.

## Иконки
Исходник — `public/icons/icon.svg` (512×512): скруглённый квадрат цвета `theme_color` `#2f4858` и светлая буква «С». Буква нарисована дугой (`path`), а не текстом: в системе нет `rsvg-convert`, SVG рендерит внутренний движок ImageMagick, и шрифт с кириллицей там не гарантирован, а дуга рисуется одинаково любым рендерером.

PNG-файлы генерируются из исходника ImageMagick. Команды выполняются из каталога `public/icons`:

```
convert -background none icon.svg -resize 192x192 -depth 8 PNG32:icon-192.png
convert -background none icon.svg -resize 512x512 -depth 8 PNG32:icon-512.png
convert -background none icon.svg -resize 180x180 -background '#2f4858' -alpha remove -alpha off -depth 8 PNG24:apple-touch-icon-180.png
convert -background none icon.svg -resize 410x410 -gravity center -background '#2f4858' -extent 512x512 -alpha remove -alpha off -depth 8 PNG24:icon-maskable-512.png
```

- `apple-touch-icon-180.png` собирается без альфа-канала: iOS заменяет прозрачность чёрным.
- Maskable-вариант — буква вписана в 410 px из 512 (центральные 80 %), фон залит во весь квадрат, поэтому при любой маске системы значимая часть не обрезается.
- Меняется дизайн — правится только `icon.svg`, дальше четыре команды выше; после этого нужна пересборка, иначе в `dist/` останутся старые файлы.

## Android-приложение (APK)
Подробно — [mechanic_android.md](mechanic_android.md). Кратко:
- Сборка одной командой из корня: `env UID=$(id -u) GID=$(id -g) docker compose run --rm android`. Сервис `android-web` (образ `secretar-node`) собирает веб-часть в режиме `capacitor` (`npm run build:android`: `base: './'`, без service worker) и копирует её в `android/` (`npx cap sync android`); сервис `android` (образ из `Dockerfile.android`: JDK 21, Android SDK 36) прогоняет JUnit-тесты и собирает подписанный APK в `./secretar.apk`. Кэш Gradle — именованный том `gradle-cache`.
- Сборка для GitHub Pages от этого не меняется: `npm run build` по-прежнему с `base: '/secretar_v2/'` и service worker.
- Подпись: ключ `release.keystore` и пароли `.env.android` в корне проекта, оба вне git. Переменные `.env.android` (значения в документации не пишутся): `SECRETAR_KEYSTORE_PASSWORD`, `SECRETAR_KEY_ALIAS`, `SECRETAR_KEY_PASSWORD`. Имена без значений — в `.env.example` в корне (коммитится). `env_file` сервиса `android` необязательный: без `.env.android` остальные сервисы compose работают, не соберётся только подписанный APK. Без ключа и паролей обновление поверх установленного APK невозможно — их нужно хранить в резервной копии и переносить на другие устройства разработки вручную.
- Перед каждой новой выдачей APK поднять `versionCode` в `android/app/build.gradle` на единицу; `versionName` берётся из `version` в `package.json`.
- Claude APK не публикует и не устанавливает: работа доводится до файла `secretar.apk`, коммита и пуша (правило проекта, раздел 9 CLAUDE.md).

## Модель для голоса: раздача в локальной сети
Решение Р-36: APK без модели, приложение докачивает файл Gemma 4 E2B (2,59 ГБ) в «Настройки → Голос» с компьютера владельца в локальной сети. Подробно — [mechanic_voice.md](mechanic_voice.md). Два сервиса `docker-compose.yml`, команды из корня проекта:
```
env UID=$(id -u) GID=$(id -g) docker compose run --rm model-download   # скачать модель в ./models
env UID=$(id -u) GID=$(id -g) docker compose up -d model-server        # раздавать ./models по HTTP на порту 8088
docker compose stop model-server                                        # остановить раздачу
```
- `model-download` качает файл с Hugging Face по закреплённой ревизии в `models/gemma-4-E2B-it.litertlm` и проверяет SHA-256. Файл с верной суммой повторно не качается (только проверка, около 10 с), оборванная загрузка продолжается с места обрыва. Нужно около 2,6 ГБ свободного места.
- `model-server` (nginx) отдаёт `./models` только на чтение; перед стартом сам запускает `model-download`, поэтому вторая команда работает и без первой. Другой порт — `MODEL_PORT=9000` перед командой; тогда и в приложении адрес с `:9000`.
- **Адрес компьютера в сети** — то, что вводится в приложении: `ip -4 addr show` (Linux) — адрес вида `192.168.x.x` у сетевой карты Wi-Fi или Ethernet (не `127.0.0.1`, не `172.17.x.x` и прочие адреса docker); `ipconfig` (Windows) — «IPv4-адрес»; macOS — `ipconfig getifaddr en0`. В приложении: `192.168.x.x:8088`. Телефон и компьютер — в одной сети; включённый брандмауэр компьютера должен пропускать входящие на порт 8088 (Linux с ufw: `sudo ufw allow 8088/tcp`).
- Проверка с компьютера: `curl -I http://<адрес>:8088/gemma-4-E2B-it.litertlm` — `200`, `Content-Length: 2588147712`.
- Раздача без шифрования и без пароля: любой в той же сети может скачать файл, пока сервис запущен. Модель публичная (Apache 2.0), поэтому это допустимо; после докачки раздачу лучше остановить.

## Обновление на телефоне
Service worker настроен на автообновление: после успешной публикации установленное приложение подхватывает новую версию при следующем открытии. Принудительно — перезагрузка страницы; в упорных случаях — закрыть и открыть приложение заново.

Android-приложение публикация на Pages не обновляет: новая версия приходит только новым APK, поставленным поверх прежнего (тот же ключ подписи, больший `versionCode`).
