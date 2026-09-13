---
name: deployment
description: Сборка, локальный запуск и публикация проекта Secretar на GitHub Pages
type: project
---

# Сборка и публикация

## Локальная разработка
Сборка и dev-сервер работают в docker-контейнере (решение Р-17 — окружение сборки в контейнере), образ `node:22-alpine`. Node на хосте (20.20.1) — запасной путь.

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

## Обновление на телефоне
Service worker настроен на автообновление: после успешной публикации установленное приложение подхватывает новую версию при следующем открытии. Принудительно — перезагрузка страницы; в упорных случаях — закрыть и открыть приложение заново.
