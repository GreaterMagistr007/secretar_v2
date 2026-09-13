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

## Обновление на телефоне
Service worker настроен на автообновление: после успешной публикации установленное приложение подхватывает новую версию при следующем открытии. Принудительно — перезагрузка страницы; в упорных случаях — закрыть и открыть приложение заново.
