---
name: MEMORY
description: Индекс временной памяти Claude по проекту Secretar — что здесь лежит и куда идти за документацией
type: project
---

# Память проекта — индекс

**Здесь только временное.** Всё, что важно для понимания проекта, лежит в документации: **[../docs/INDEX.md](../docs/INDEX.md)** — читать первым.

Сюда кладутся промежуточные записи и отчёты агентов, черновики, промпты сессий, наблюдения о работе инструмента. Решения, требования, архитектура и правила сюда не попадают.

## Где смотреть состояние
Состояние проекта здесь не дублируется: оно в [../docs/INDEX.md](../docs/INDEX.md), что делать дальше — в [new-session-prompt.md](new-session-prompt.md).

## Файлы памяти
- [new-session-prompt.md](new-session-prompt.md) — готовый промпт для следующей сессии. Перезаписывается целиком в конце каждой сессии.
- [feedback_tooling.md](feedback_tooling.md) — грабли самого Claude Code и подтверждённые обходы: блокировка записи в `.claude/settings.json` из режима auto mode, кэширование хуков на момент старта сессии, обход неподключённого расширения Chrome через `playwright-core`.
- [progress_recurrence_check.md](progress_recurrence_check.md) — что именно проверено на живом приложении по этапу повторений и отметок, и каким способом.

## Отчёты по этапу повторений и отметок (2026-09-27)
- [findings_plan_stage_03.md](findings_plan_stage_03.md) — ревью плана этапа скептиком до начала работ, 20 находок.
- [progress_recurrence_data.md](progress_recurrence_data.md) — ход работы агента по слою данных (шаги 1–6 плана).
- [progress_recurrence_ui.md](progress_recurrence_ui.md) — ход работы агента по экранам (шаги 7–10 плана).
- [findings_review_a1.md](findings_review_a1.md), [findings_review_b1.md](findings_review_b1.md) — первый раунд саморевью: корректность и соответствие задаче.
- [findings_review_a2.md](findings_review_a2.md), [findings_review_b2.md](findings_review_b2.md) — второй раунд саморевью.
- [findings_review_a3.md](findings_review_a3.md), [findings_review_b3.md](findings_review_b3.md) — третий раунд саморевью.
- [findings_review_a4.md](findings_review_a4.md), [findings_review_b4.md](findings_review_b4.md) — четвёртый раунд саморевью.
- [findings_review_a5.md](findings_review_a5.md), [findings_review_b5.md](findings_review_b5.md) — пятый раунд саморевью.
- [findings_review_a6.md](findings_review_a6.md), [findings_review_b6.md](findings_review_b6.md) — шестой раунд саморевью: найдено устаревание сегодняшней даты в долгоживущем экране.
- [findings_review_a7.md](findings_review_a7.md), [findings_review_b7.md](findings_review_b7.md) — седьмой раунд саморевью: показано, что исправление шестого раунда было неполным.
- [findings_review_a8.md](findings_review_a8.md), [findings_review_b8.md](findings_review_b8.md) — восьмой раунд саморевью: выбор дня переживал размонтирование экрана; расхождения старших документов.
- [findings_review_a9.md](findings_review_a9.md), [findings_review_b9.md](findings_review_b9.md) — девятый раунд саморевью: найдена корневая причина цепочки — «сегодня» освежалось только по пробуждению.
- [findings_review_a10.md](findings_review_a10.md), [findings_review_b10.md](findings_review_b10.md) — десятый раунд: корректность без важных находок, документация дала семь; [findings_review_a10_partial.md](findings_review_a10_partial.md) — частичный отчёт, сохранённый, когда ревьюер надолго замолчал.
- [findings_review_a11.md](findings_review_a11.md), [findings_review_b11.md](findings_review_b11.md) — одиннадцатый раунд: корректность чиста, таймер проверен на переводах часов; документация дала шесть.
- [findings_review_a12.md](findings_review_a12.md), [findings_review_b12.md](findings_review_b12.md) — двенадцатый раунд: найдено, что число тестов было вписано задним числом в более ранние записи хронологии.

## Отчёты прошлых этапов
Оболочка PWA и первый этап: [progress_stage_01.md](progress_stage_01.md), [progress_app_shell.md](progress_app_shell.md). Галерея макетов календаря: [progress_gallery_a.md](progress_gallery_a.md), [progress_gallery_b.md](progress_gallery_b.md), [progress_gallery_c.md](progress_gallery_c.md). Темы и шрифты: [progress_themes_a.md](progress_themes_a.md), [progress_themes_b.md](progress_themes_b.md), [progress_themes_c.md](progress_themes_c.md), [progress_webfonts.md](progress_webfonts.md), [findings_ui_test.md](findings_ui_test.md). Сущность «Задача»: [progress_tasks_data.md](progress_tasks_data.md), [progress_tasks_ui.md](progress_tasks_ui.md).

## Отчёты агентов
Кладутся сюда же, имя не начинается с `report`: `progress_*.md`, `findings_*.md`, `notes_*.md`, `audit_*.md`. Запись — дописыванием через Bash. Правила — [../docs/rules_work.md](../docs/rules_work.md).
