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
- [feedback_tooling.md](feedback_tooling.md) — грабли самого Claude Code и подтверждённые обходы: блокировка записи в `.claude/settings.json` из режима auto mode, кэширование хуков на момент старта сессии, обход неподключённого расширения Chrome через `playwright-core`, отправка APK и чтение скриншотов в Telegram, эмулятор Android, подмена часов в браузере.
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
- [findings_review_a12.md](findings_review_a12.md), [findings_review_b12.md](findings_review_b12.md) — двенадцатый раунд, последний: корректность чиста, 19 мутаций все поймались; найдено, что число тестов было вписано задним числом в более ранние записи хронологии, и что пустой файл ронял прогон целиком.

## Замеры макетов галереи под вопрос В-7 (2026-09-27)
- [notes_gallery_render.md](notes_gallery_render.md) — рендер всех 30 макетов в браузере: живая геометрия сетки, проверка узкого экрана.
- [notes_gallery_a.md](notes_gallery_a.md) — разбор кода v01–v10, [notes_gallery_c.md](notes_gallery_c.md) — v21–v30.
- [notes_gallery_b.md](notes_gallery_b.md) — разбор кода v11–v20 (агент надолго замолчал из-за затёртого соседом скрипта, но работу довёл до конца); [notes_gallery_b2.md](notes_gallery_b2.md) — замена, запущенная на время молчания, по шести кандидатам v11, v13, v16, v17, v19, v20. Два независимых разбора шести общих макетов дали совпадающие числа — это сверка, а не дубль.
Итог отбора — в документации: [../docs/reference_gallery_calendar.md](../docs/reference_gallery_calendar.md).

## Этап 4: Android-приложение и уведомление (2026-11-21)
- [progress_android.md](progress_android.md) — ход реализации: Capacitor, мост, нативная часть, сборка и подпись APK.
- [findings_android_emulator.md](findings_android_emulator.md) — проверка APK на эмуляторе Android 15: 11 сценариев с выводом adb, замечание об окне будильника до часа.
- [findings_skeptic_android.md](findings_skeptic_android.md) — скептик перед пушем: 3 важные находки, 9 мелочей.
- [findings_exact_alarm.md](findings_exact_alarm.md) — проверка точного будильника полуночи (Р-33) на эмуляторе, включая принудительный Doze.
- [progress_android_fixes.md](progress_android_fixes.md) — исправления по скептику, доказательство мутации теста восточной зоны.
Образ эмулятора `secretar-emu-check` (около 6 ГБ) оставлен в docker для локальных тестов APK по указанию владельца.

## Работа без решений владельца (2026-11-03)
- [progress_contrast.md](progress_contrast.md) — контраст тем по решению Р-26: карта «токен → фон», было → стало, пересчёт, доработка после скептика.
- [progress_search_parity.md](progress_search_parity.md) — паритет двух реализаций `search`: порядок курсора Dexie, тесты, мутации.
- [findings_skeptic_contrast_search.md](findings_skeptic_contrast_search.md) — скептик перед пушем: пять пропущенных пар контраста, слабый тест наименьшего токена.

## Отчёты прошлых этапов
Оболочка PWA и первый этап: [progress_stage_01.md](progress_stage_01.md), [progress_app_shell.md](progress_app_shell.md). Галерея макетов календаря: [progress_gallery_a.md](progress_gallery_a.md), [progress_gallery_b.md](progress_gallery_b.md), [progress_gallery_c.md](progress_gallery_c.md). Темы и шрифты: [progress_themes_a.md](progress_themes_a.md), [progress_themes_b.md](progress_themes_b.md), [progress_themes_c.md](progress_themes_c.md), [progress_webfonts.md](progress_webfonts.md), [findings_ui_test.md](findings_ui_test.md). Сущность «Задача»: [progress_tasks_data.md](progress_tasks_data.md), [progress_tasks_ui.md](progress_tasks_ui.md).

## Отчёты агентов
Кладутся сюда же, имя не начинается с `report`: `progress_*.md`, `findings_*.md`, `notes_*.md`, `audit_*.md`. Запись — дописыванием через Bash. Правила — [../docs/rules_work.md](../docs/rules_work.md).

## Отчёты по голосовому управлению (2026-11-21, вопрос В-18)
- [findings_voice_stt.md](findings_voice_stt.md) — исследование распознавания русской речи: системный распознаватель, Web Speech в WebView, облачные и локальные модели, сводная таблица.
- [findings_voice_llm.md](findings_voice_llm.md) — исследование ИИ-разбора: локальные модели на телефоне, облачные провайдеры, CORS, доступность из России, хранение ключа, `chrono-node`.
- [findings_skeptic_voice.md](findings_skeptic_voice.md) — ревью скептиком черновика плана этапа 5, находки Н-1…Н-25.
- [findings_voice_audio_llm.md](findings_voice_audio_llm.md) — локальные модели со звуком на входе для Android (Gemma 4 E2B на LiteRT-LM — кандидат).
- [findings_skeptic_voice_audio.md](findings_skeptic_voice_audio.md) — ревью выбора локальной модели, находки С-1…С-15 (нет ToolChoice.Required в 0.19.1, Java вместо Kotlin, опыт на хосте первым).
- [progress_voice_toast.md](progress_voice_toast.md), [findings_skeptic_toast.md](findings_skeptic_toast.md) — всплывающее сообщение: журнал реализации, ревью Т-1…Т-10.
- [progress_voice_model_download.md](progress_voice_model_download.md), [progress_voice_model_download_fix.md](progress_voice_model_download_fix.md), [findings_skeptic_model_download.md](findings_skeptic_model_download.md) — докачка модели (Р-36): журналы реализации и исправлений, ревью Д-1…Д-12.
- [progress_voice_button.md](progress_voice_button.md) — голосовая кнопка и журнал нажатий (Р-37): журнал реализации, факты API LiteRT-LM 0.19.1, проверка на эмуляторе.
- [findings_skeptic_voice_button.md](findings_skeptic_voice_button.md) — ревью голосовой кнопки, находки Г-1…Г-10 (тишина, гонка нажатий, полнота журнала); Г-1…Г-8 исправлены, Г-9 и Г-10 оставлены.
- [findings_voice_phone_log_1.md](findings_voice_phone_log_1.md) — первый журнал голосовой кнопки с телефона владельца: 2 из 2 фраз верно, инференс 12–14 с на GPU, загрузка 51 с.
- [progress_voice_speed.md](progress_voice_speed.md), [findings_skeptic_voice_speed.md](findings_skeptic_voice_speed.md) — разбивка времени ответа модели в журнале и ночное правило (Р-38): журнал реализации, ревью Ск-1…Ск-11.
