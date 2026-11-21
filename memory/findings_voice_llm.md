# Голосовой ввод: ИИ-разбор фразы в tool_call «добавить задачу» — исследование фактов
Дата: 2026-11-21. Исполнитель: агент-исследователь. Распознавание речи — вне рамок (другой агент).
## План
1. Локальная ИИ: a) Gemini Nano / ML Kit GenAI Prompt API; b) MediaPipe / LiteRT-LM + Gemma; c) llama.cpp + плагины Capacitor; d) WebLLM / transformers.js в WebView; e) надёжность tool calling и дат у малых моделей.
2. Облачные LLM: Claude Haiku, OpenAI, Gemini Flash/Flash-Lite, YandexGPT/GigaChat — цена, задержка, strict schema, CORS, Россия.
3. Хранение API-ключа без сервера: BYOK, прокси (CF Workers / Vercel / Yandex Cloud Functions), Firebase AI Logic + App Check.
4. Без ИИ: chrono-node (ru), другие JS-библиотеки.
5. Сводная таблица.
Пометка «не проверено» — факт не подтверждён источником в этой сессии.

## 1a. Gemini Nano через ML Kit GenAI Prompt API (AICore)
Источники (проверено 2026-11-21): https://developers.google.com/ml-kit/genai , https://developers.google.com/ml-kit/genai/prompt/android , https://developers.google.com/ml-kit/genai/prompt/android/get-started , https://developers.google.com/ml-kit/genai/prompt/android/structured-output , анонс alpha: https://android-developers.googleblog.com/2025/10/ml-kit-genai-prompt-api-alpha-release.html (окт. 2025).
- Статус: alpha с окт. 2025; сейчас артефакт `com.google.mlkit:genai-prompt:1.0.0-beta4`, страница Prompt API: «offered in beta, not subject to any SLA or deprecation policy». GA нет.
- Минимальный Android: API 26 (Android 8.0). У проекта minSdk 24 — для этого модуля пришлось бы поднять minSdk до 26 или подключать условно.
- Устройства (страница-обзор на 2026-11-21): только флагманы/верхний сегмент. Gemini Nano 2: POCO F7 Ultra/F8 Pro/F8 Ultra/X7 Pro/X8 Pro, realme GT 7, Redmi Turbo 5, vivo T4 Ultra/X200 FE, Xiaomi 15/15T/15 Ultra/17/17T/17 Ultra. Gemini Nano 3: Pixel 9, OPPO Reno 14 Pro/15 Pro/16 Pro, realme GT 7T, Googlebook-и. Gemini Nano 4: Pixel 10/11, Samsung Galaxy S25/S26 и др. Устройства среднего и бюджетного сегмента не поддерживаются. Модель скачивается системой (checkStatus → DOWNLOADABLE → download()), в APK не входит.
- Русский язык: явного подтверждения НЕТ. В сниппете поиска со страницы get-started — «validated languages: English, Korean»; на текущей версии страницы списка нет; обзор: «language support may vary depending on device configuration and downloaded models». Итог: русский — не проверено, требует теста на устройстве.
- Контекст: вход < 4000 токенов (get-started).
- Structured output: есть, через KSP-аннотации `@Generable`/`@Guide` (`genai-schema-compiler:1.0.0-alpha1`), ТОЛЬКО Kotlin, minSdk 26, KSP ≥ 2.3.6; типы String/Int/Double/Boolean/List/вложенные классы, enum — через `enumValues` у строки; типа «дата» нет. Проверка: `isStructuredOutputFeatureAvailable()`.
- Function calling: в GenerativeModel не описан; упоминается только в отдельном слое `AgentRunner` (не изучен — не проверено). Для нашей задачи достаточно structured output (одна «функция»).
- Ограничения: инференс только когда приложение на переднем плане (из фоновой службы — `BACKGROUND_USE_BLOCKED`); поминутная квота (`BUSY`) и суточная по батарее (`PER_APP_BATTERY_USE_QUOTA_EXCEEDED`).
- Capacitor: готового плагина не искал отдельно (см. 1c); вызов только из нативного кода → нужен свой плагин, причём на Kotlin (structured output Kotlin-only) — в проекте сейчас Java (`TaskNotifier`), придётся добавить Kotlin + KSP в Gradle.
- Вывод: покрывает малую долю устройств, русский не подтверждён, API бета → годится только как опциональный офлайн-путь «если доступно», не как основной.

## 1b. MediaPipe LLM Inference / LiteRT-LM + Gemma
Источники (проверено 2026-11-21): https://developers.google.com/edge/litert-lm/overview , https://developers.google.com/edge/litert-lm/android , https://developers.googleblog.com/en/blazing-fast-on-device-genai-with-litert-lm/ (19.05.2026), https://developers.googleblog.com/en/bring-state-of-the-art-agentic-skills-to-the-edge-with-gemma-4/ (02.04.2026), https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm , https://developers.google.com/edge/mediapipe/solutions/genai/llm_inference , https://blog.google/technology/developers/functiongemma/ , https://ai.google.dev/gemma/docs/mobile-actions
- MediaPipe LLM Inference API: по официальному гайду — maintenance-only (в разных кэшированных версиях страницы: «Android и iOS deprecated, Web нет»), новые функции только в LiteRT-LM. Для нового кода брать LiteRT-LM.
- LiteRT-LM: «production-ready»; Android API — Kotlin (Stable), артефакт `com.google.ai.edge.litertlm:litertlm-android` (точную версию не выяснял — в доках `latest.release`; не проверено). Backend CPU/GPU/NPU. JS-API (web) — Early Preview.
- Function calling: есть — Kotlin `ToolSet` + аннотации `@Tool`/`@ToolParam` или OpenAPI-описание; constrained decoding для структурированного вывода; рантайм возвращает приложению tool-call и продолжает после результата. Работает только с моделями с поддержкой tools (Gemma 4, FunctionGemma).
- Вышла Gemma 4 (апр. 2026), edge-варианты E2B и E4B; лицензия Apache 2.0 (у Gemma 3/3n — Gemma Terms of Use; не перепроверял). Заявлено 140+ языков; отдельных замеров по русскому нет — качество русского не проверено.
- Размеры и скорость (официальная таблица, только флагманы):
  - Gemma 4 E2B: файл 2583 МБ; Galaxy S26 Ultra GPU — prefill 3808 ток/с, decode 52 ток/с, TTFT 0,3 с, ~676 МБ CPU-памяти; CPU — 557/47 ток/с, TTFT 1,8 с, 1733 МБ. «<1,5 ГБ памяти на некоторых устройствах».
  - Gemma 4 E4B: 3654 МБ; S26 Ultra CPU 195/18, GPU 1293/22.
  - Gemma 3 1B: 1005 МБ; S24 Ultra CPU 177/33, GPU 1191/24.
  - Qwen3-0.6B: 586 МБ; vivo X300 Pro CPU 165/9, GPU 580/21.
  - FunctionGemma 270M: 289 МБ; S25 Ultra CPU 2238/154. Специализирована на function calling, но «из коробки» на Mobile Actions 58%, после дообучения 85% (данные Google). Многоязычных замеров нет.
  - Gemma 3n E2B (предыдущее поколение): S24 Ultra ~111/16 ток/с (таблица разобрана неуверенно — не проверено).
  - Замеров на «среднем» телефоне (Snapdragon 7-й серии, 6–8 ГБ ОЗУ) в официальных источниках НЕТ. Оценка (не факт): в 2–4 раза медленнее флагмана; для нашей задачи (~600 ток вход, ~60 ток выход) на E2B CPU среднего телефона — порядка 3–8 с.
- Доставка модели: в APK нельзя (2,5 ГБ, лимит Play — не проверял в этой сессии). Модели лежат на Hugging Face (litert-community); схема — скачивание при первом включении функции в файлы приложения. Требует места 0,3–3,7 ГБ и Wi-Fi. Альтернатива: «Android's built-in Gemma 4 can be accessed through AICore» — это тот же путь 1a (только поддерживаемые устройства).
- Capacitor: готового плагина LiteRT-LM для Capacitor не нашёл (не искал исчерпывающе); нужен свой Kotlin-плагин. Для Flutter есть community `flutter_gemma` — нам не подходит.
- Вывод: технически лучший офлайн-вариант (официальный function calling), но цена — загрузка 0,3–2,6 ГБ, Kotlin-плагин, неизвестное качество русского и дат на малых моделях, скорость на средних телефонах не измерена.

## 1c. llama.cpp на Android + плагины Capacitor
Источники (2026-11-21): npm registry (https://registry.npmjs.org/<пакет>), https://unpkg.com/llama-cpp-capacitor@0.1.5/README.md , https://github.com/Cap-go/capacitor-llm , https://capawesome.io/docs/sdks/capacitor/llm/ , HF API (https://huggingface.co/api/models/<repo>/tree/main), https://huggingface.co/qualcomm/Qwen3-1.7B , https://huggingface.co/Qwen/Qwen3.5-4B
- Размеры GGUF (HF API, точные): Qwen3-0.6B Q4_K_M 397 МБ; Qwen3-1.7B Q4_K_M 1107 МБ; Qwen3-4B-Instruct-2507 Q4_K_M 2497 МБ; Llama-3.2-1B-Instruct Q4_K_M 808 МБ; Llama-3.2-3B Q4_K_M 2019 МБ; gemma-4-E2B-it Q4_K_M 3107 МБ.
- Новее Qwen3: вышла Qwen3.5 (0.8B/2B/4B/9B, февр.–март 2026, Apache-2.0, «201 язык», по умолчанию thinking-режим кроме 0.8B). Карточка Qwen3.5-4B: BFCL-V4 50,3; TAU2-Bench 79,9; 9B — 66,1/79,1. Для 0.8B/2B официальных BFCL не нашёл.
- Скорость (только флагманы): Qwen3-1.7B на Snapdragon 8 Elite — 39–57 ток/с (Qualcomm GENIE, w4a16, NPU, 4096 ctx); llama.cpp q4_0 — по сниппету поиска 36–48 ток/с при 512 ctx, 13–21 ток/с при 4096 ctx (строки таблицы не разобраны по чипам — не проверено). Snapdragon 7-й серии в таблицах Qualcomm нет. Замеров на средних телефонах из первоисточников нет.
- Готовые плагины Capacitor (npm, дата последней публикации):
  - `llama-cpp-capacitor` 0.1.5 (18.02.2026), MIT, peer `@capacitor/core >=8.0.0` — совместим с Capacitor 8 по peer. Распакованный размер пакета 77 МБ (нативные библиотеки). ABI arm64-v8a/armeabi-v7a/x86/x86_64. Есть `response_format: json_schema` → GBNF и сырой `grammar` (гарантированно валидный JSON), tool calling не упомянут. Нет web. README противоречив (`npm install llama-cpp`), один автор (arusatech) — зрелость низкая.
  - `@capgo/capacitor-llm` 8.2.4 (19.11.2026), MPL-2.0, peer Capacitor >=8 — активно поддерживается. Android: Gemini Nano через ML Kit `genai-prompt` (по умолчанию), LiteRT-LM `.litertlm` (Gemma 4 E2B/E4B), legacy MediaPipe `.task`; web — `@mediapipe/tasks-genai`. Есть `downloadModel()` с прогрессом. Function calling / structured output в README НЕ упомянуты (только чат и стриминг текста) — значит JSON придётся просить промптом и валидировать.
  - `@capawesome-team/capacitor-llm` — только для платных Capawesome Insiders; только Gemini Nano (Android) / Apple Foundation Models; кастомных моделей нет.
  - `@cantoo/capacitor-llama` 0.1.6 (18.08.2026), MIT, peer >=6, внутри `@wllama/wllama` (wasm) и `node-llama-cpp` — по сути web-wasm, не нативный.
  - `dust-llm-capacitor` 0.2.19 (09.03.2026), Apache-2.0, peer ^7||^8, требует ещё `dust-core-capacitor`/`dust-serve-capacitor` — экосистема одного автора.
- Качество русского и относительных дат у моделей ≤2B: публичных замеров на русском не нашёл — не проверено. Общая картина по англ. бенчмаркам — в 1e.

## 1d. WebLLM / transformers.js в WebView (WebGPU)
Источники (2026-11-21): https://developer.chrome.com/blog/new-in-webgpu-121 , https://groups.google.com/a/chromium.org/g/blink-dev/c/YFWuDlCKTP4 (Intent to Ship WebGPU on Android), https://groups.google.com/a/chromium.org/g/blink-dev/c/N3RlLGCOTJ4 (Intent to Ship WebGPU Compatibility mode), https://developer.chrome.com/blog/new-in-webgpu-146 (25.02.2026), caniuse JSON https://raw.githubusercontent.com/Fyrd/caniuse/main/features-json/webgpu.json
- Chrome для Android: WebGPU включён по умолчанию с Chrome 121 (янв. 2024), сначала Adreno/Mali на Android 12+. Compatibility mode (через OpenGL ES 3.1, для старых устройств) — «Shipping on Android 146, WebView 146» по intent-у.
- Android System WebView (то, в чём работает Capacitor-APK): данные противоречат. Intent 121 — «WebView application risks: None», явного «включено в WebView» нет; intent compat-mode пишет «immediately available on Android WebView where hardware support is available»; caniuse (текущая база) для «Android Browser 157» — `n` (не поддерживается), для Chrome Android 157 — `y`. Итог: WebGPU в WebView — НЕ ПРОВЕРЕНО, нужен `navigator.gpu` тест на реальном устройстве. Для PWA в Chrome Android — есть (Android 12+, Adreno/Mali).
- Скорость WebLLM/transformers.js на Android-телефоне: публичных замеров не нашёл. Найдено косвенно: Llama-3.2-1B q4 в WebLLM — загрузка ~695 МБ, ~880 МБ GPU-памяти (вторичный источник https://pinggy.io/blog/run_llm_in_browser_webgpu/); статьи 2026 о запуске на телефонах описывают отказы/зависания (iPhone Safari перезагружает вкладку) — без Android-цифр. LiteRT-LM Web-вариант Gemma 4 E2B: 2341 МБ, ~1,8 ГБ GPU (замер только на MacBook M4 Max).
- Минусы именно для нас: модель 0,4–2,3 ГБ в кэше браузера (Cache Storage/OPFS может быть вытеснен системой), холодная загрузка в GPU десятки секунд (не измерено), высокий риск OOM в WebView на устройствах 4–6 ГБ ОЗУ. Плюс — единый код для PWA и APK.
- Вывод: для MVP не годится; как эксперимент — только после проверки `navigator.gpu` в WebView целевых телефонов.

## 1e. Надёжность tool calling и арифметики дат у малых моделей (≤4B)
Источники (2026-11-21): https://gorilla.cs.berkeley.edu/leaderboard.html (BFCL V4), https://huggingface.co/Qwen/Qwen3.5-4B , https://arxiv.org/pdf/2611.02978 (CAREFUL-Bench), https://ai.plainenglish.io/5-tiny-language-models-for-tool-calling-part-3-ebcda32c2518 (вторичный), https://ai.google.dev/gemma/docs/mobile-actions , https://arxiv.org/html/2505.16088v3 (DateAugBench), https://arxiv.org/abs/2603.19017 (MultiTempBench, март 2026)
- BFCL V4 (общий балл включает multi-turn/агентные задачи, поэтому занижен относительно «одного простого вызова»): Llama-3.2-1B ≈ 10,8 (вторичный источник, не сверено с лидербордом); Qwen3-1.7B ≈ 13,5 (таблица в CAREFUL-Bench повреждена — не проверено); xLAM-2-3B ≈ 48; Phi-4-mini и Falcon3-3B — около нуля (там же); Qwen3.5-4B — 50,3, Qwen3.5-9B — 66,1 (официальная карточка). Фронтир-модели ≈ 75 (вторичный).
- FunctionGemma 270M: 58% → 85% на Mobile Actions только после дообучения (Google).
- Замеров «одна короткая русская фраза → один вызов с датой» для малых моделей не найдено. Бенчмарка, проверяющего разрешение «в следующий понедельник» у малых моделей, тоже нет.
- Арифметика дат: DateAugBench — фрагментация дат токенизатором стоит до 10 п.п. точности, крупные модели компенсируют лучше малых; MultiTempBench (5 языков, арифметика дат) — узкое место зависит от языка; работы 2025–2026 отмечают, что LLM «приближают» ответ в арифметике дат (ошибки на ±1 день, переходы месяца/года).
- Практический вывод (рекомендация, не факт из источника): малой модели нельзя доверять вычисление даты. Снять арифметику с модели: (а) передавать в системный промпт таблицу ближайших 14–21 дней «пн 2026-11-23, вт 2026-11-24 …» — модель только выбирает строку; или (б) модель возвращает не дату, а нормализованное выражение (`weekday: "monday", offset_weeks: 0` / `relative_days: 2`), дату считает код; плюс (в) проверка/подстраховка детерминированным парсером (см. п. 4). Для облачных моделей класса Haiku/Flash-Lite это тоже снижает ошибки, но там критичность ниже.
- Неоднозначность «в понедельник» (ближайший будущий vs через неделю, если сегодня понедельник) — решается правилом в промпте и в коде, а не моделью.

## 2. Облачные LLM для разбора одной фразы
Источники (2026-11-21): https://platform.claude.com/docs/en/about-claude/pricing , https://www.anthropic.com/supported-countries , исходник SDK https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/main/src/client.ts , https://developers.openai.com/api/docs/pricing , https://developers.openai.com/api/docs/models/gpt-6-luna , https://developers.openai.com/api/docs/supported-countries , https://aistudio.google.com/docs/pricing , https://aistudio.google.com/docs/available-regions , https://aistudio.yandex.ru/docs/ru/ai-studio/pricing , https://yandex.cloud/en/docs/ai-studio/concepts/generation/function-call , https://developers.sber.ru/docs/ru/gigachat/tariffs/individual-tariffs (обновл. 07.10.2026), https://artificialanalysis.ai/models/comparisons/claude-haiku-5-5-vs-gemini-3-5-flash-lite
Собственная проверка CORS (2026-11-21, curl OPTIONS-preflight с Origin https://example.github.io, бесплатно, без ключей):
- api.anthropic.com/v1/messages → 200, `access-control-allow-origin: *`, allow-headers `x-api-key,anthropic-version,content-type,anthropic-dangerous-direct-browser-access`.
- api.openai.com/v1/responses → 200, `allow-origin: *`.
- generativelanguage.googleapis.com (Gemini) → 200, origin отражается, `x-goog-api-key` разрешён.
- llm.api.cloud.yandex.net (YandexGPT, оба API) → 405/400, CORS-заголовков нет → из браузера/WebView напрямую НЕЛЬЗЯ.
- gigachat.devices.sberbank.ru → TLS-цепочка «Russian Trusted Sub CA» (НУЦ Минцифры), curl: «self-signed certificate in chain»; preflight с -k → 405 без CORS. Из браузера/WebView напрямую НЕЛЬЗЯ (и сертификат не доверен Android по умолчанию — нужен network_security_config в нативном коде или прокси).

### Claude Haiku 5.5 (`claude-haiku-5-5`)
- Цена (официальная страница): $0.10 вход / $0.50 выход за 1M (промпт до 100K токенов; свыше — $0.50/$2.50); кэш-чтение $0.01; batch −50%. Ваши данные $0.10/$0.50 — ПОДТВЕРЖДЕНЫ.
- Tool use добавляет системный промпт 286 токенов (tool_choice auto/none) или 406 (any/tool) — официально. Forced tool_choice у Haiku 5.5 поддерживается (в таблице есть 406), запрет any/tool касается Opus 5.5/Sonnet 5.5/Fable.
- Strict tool use: `strict: true` на определении инструмента + `additionalProperties: false` → вход гарантированно валиден по схеме (документация навыка claude-api, кэш 2026-11-03).
- Мышление у Haiku 5.5 включено по умолчанию (effort по умолчанию medium); выключение `thinking: {type: "disabled"}` допустимо только при effort ≤ high. Для короткой фразы: выключить мышление или effort `low` — иначе растут задержка и выходные токены (мышление тарифицируется как выход).
- Задержка: Artificial Analysis (их длинные бенчмарк-промпты, с рассуждением): TTFT low 6,2 с, medium 9,3 с; скорость вывода ~220 ток/с. Для нашего короткого запроса без мышления — не измерено; оценка (не факт) 1–2 с.
- Браузер: CORS работает (проверено), SDK требует `dangerouslyAllowBrowser: true`, который шлёт заголовок `anthropic-dangerous-direct-browser-access: true` (подтверждено исходником SDK, строки 2132–2133).
- Россия: НЕ в списке поддерживаемых стран («Any country or region not listed is unsupported», в т. ч. по физическому местонахождению). Оплата — карты, USD. Российские карты — не проверено, по общеизвестным данным не принимаются.
### OpenAI
- Самые дешёвые с function calling (официальный прайс, standard): `gpt-5-nano` $0.05/$0.40 (кэш $0.005); `gpt-6-luna` $0.10/$0.50 (вышла ~22.09.2026 по сторонним данным; официальная страница модели: function calling и structured outputs есть, function calling рекомендован через Responses API, в Chat Completions — только при reasoning_effort=none); `gpt-4o-mini` $0.15/$0.60; `gpt-5.4-nano` $0.20/$1.25.
- Strict: structured outputs / `strict: true` у function calling — общеизвестно для OpenAI; для конкретно gpt-5-nano в этой сессии не перепроверял.
- gpt-5-nano — рассуждающая модель: reasoning-токены оплачиваются как выход, задержка растёт; нужен минимальный effort (не проверено в этой сессии).
- CORS: да (проверено). Россия: НЕ в списке поддерживаемых стран, страница предупреждает о блокировке аккаунта.
### Google Gemini (AI Studio / Gemini API)
- Цены (paid): `gemini-2.5-flash-lite` $0.10/$0.40; `gemini-3.1-flash-lite` $0.25/$1.50; `gemini-3.5-flash-lite` $0.30/$2.50; `gemini-3-flash-preview` $0.50/$3.00; `gemini-3.6-flash`/`3.8-flash` $0.75/$3.75 до 31.12.2026, потом $1.50/$7.50. `gemini-2.5-flash` устарела: с 01.12.2026 перенаправляется на 3.5 Flash-Lite.
- Бесплатный уровень для всех этих моделей — «Free of charge», но данные бесплатного уровня используются для улучшения продуктов Google; лимиты запросов на странице не указаны (не проверено).
- Задержка: Gemini 3.5 Flash-Lite TTFT 4,6 с, 310 ток/с (Artificial Analysis, длинные промпты). Для короткой фразы — не измерено.
- Function calling — есть (общеизвестно); режим строгого соответствия схеме для function calling — не перепроверял (не проверено).
- CORS: да (проверено). Россия: НЕ в списке доступных регионов (Казахстан есть).
### YandexGPT / Alice AI (Yandex AI Studio)
- Цены (руб. за 1000 токенов, синхронно, с НДС): Alice AI LLM Flash 0,1 вход / 0,2 выход (токены инструментов 0,025); Alice AI LLM 0,5/1,2; YandexGPT Pro 5.1 0,8/0,8; Qwen3.6 35B 0,2/0,3. YandexGPT Lite — 0,20 ₽/1000 (вторичные источники, авг. 2026; на текущей странице в рублёвой таблице не указана).
- Function calling: есть в Text Generation API и OpenAI-совместимом API (`https://llm.api.cloud.yandex.net/v1`), «structured response» — отдельная возможность; параметры json_schema через OpenAI-совместимый API — не подтверждены. gpt-oss в Yandex — без function calling.
- Нужен платёжный аккаунт Yandex Cloud + folder ID; стартовый грант на странице не указан (не проверено). Работает из России, оплата рублями.
- CORS НЕТ (проверено) → только через прокси (например Yandex Cloud Functions) или нативный HTTP-клиент в APK (CapacitorHttp обходит CORS на Android, но ключ остаётся в APK).
### GigaChat (Сбер)
- Физлица: Freemium на 12 месяцев — 250 млн токенов Lite, 40 млн Pro, 25 млн Max, 50 млн GigaChat 3 Ultra; генерация в один поток. Пакеты: GigaChat 2 Lite 20 млн токенов = 1300 ₽ (65 ₽/1M), Pro 3 млн = 1500 ₽ (500 ₽/1M), Max 3 млн = 1950 ₽. С 01.09.2026 новые клиенты платят через cloud.ru.
- Function calling: в документации есть раздел о функциях (переработан в мае 2026, по changelog); строгость схемы — не проверено.
- CORS нет, сертификат НУЦ Минцифры (проверено) → только прокси или нативный клиент с добавленным корневым сертификатом. Авторизация — OAuth-токен на 30 мин по ключу (общеизвестно, не перепроверял).
### Стоимость одного обращения (расчёт: вход 700 токенов вкл. системный промпт инструментов, выход 100, без мышления)
- Claude Haiku 5.5: 700×0.10/1M + 100×0.50/1M = $0.00007 + $0.00005 = **$0.00012** (≈ 8 300 обращений на $1).
- gpt-5-nano: $0.000035 + $0.00004 = **$0.000075** (+ reasoning-токены).
- gpt-6-luna: **$0.00012**.
- Gemini 2.5 Flash-Lite: $0.00007 + $0.00004 = **$0.00011**; Gemini 3.1 Flash-Lite: **$0.000325**; на бесплатном уровне — $0.
- Alice AI LLM Flash: 0,7×0,1 + 0,1×0,2 = **≈0,09 ₽**.
- GigaChat 2 Lite: 800×65/1M = **≈0,05 ₽**; в Freemium — 0 ₽ (250 млн токенов ≈ 300 тыс. обращений).
- При 30 обращениях в день: Haiku ≈ $0.11/мес, Gemini Flash-Lite ≈ $0.10/мес, GigaChat — бесплатно. Цена не является фактором выбора; факторы — доступность из РФ, CORS, ключ.

## 3. Где держать API-ключ без своего сервера
Источники (2026-11-21): https://developers.cloudflare.com/workers/platform/limits , https://yandex.cloud/ru/docs/functions/pricing , https://yandex.cloud/ru/docs/billing/concepts/serverless-free-tier , https://firebase.google.com/docs/ai-logic/app-check , https://firebase.google.com/docs/ai-logic/security-checklist , https://developer.android.com/ai/gemini , https://blog.cloudflare.com/russian-internet-users-are-unable-to-access-the-open-internet , https://en.zona.media/article/2025/06/27/cloud_confirmed
- Базовый факт: ключ, вшитый в APK или в JS PWA, извлекается (APK распаковывается, JS виден в devtools). SDK Anthropic прямо пишет, что браузерный режим «risks exposing your secret API credentials». Обфускация не защищает. Для личного приложения одного владельца риск — только его кошелёк, но APK/PWA на GitHub Pages публичны.
### 3.1 BYOK — ключ вводит пользователь в настройках
- Плюсы: ноль инфраструктуры, ключ не в репозитории и не в сборке; все три зарубежных API пускают из браузера (CORS проверен, см. п. 2). Для Anthropic — заголовок `anthropic-dangerous-direct-browser-access: true`.
- Минусы: ключ хранится в localStorage/IndexedDB (в APK — можно в Android Keystore через нативный плагин) — читается при XSS или физическом доступе; пользователю нужно завести аккаунт у провайдера; для Yandex/GigaChat не работает в PWA (нет CORS), в APK — только через нативный HTTP (CapacitorHttp) и, для GigaChat, с доверием к сертификату НУЦ Минцифры.
- Рекомендуемая мера (не факт, практика): отдельный ключ с лимитом расходов в консоли провайдера.
### 3.2 Прокси-функция
- Cloudflare Workers Free: 100 000 запросов/сутки, 10 мс CPU на запрос (ожидание ответа LLM в CPU-время не входит — общеизвестно, не перепроверял), 50 подзапросов, сброс в 00:00 UTC, превышение → Error 1027. Минус для РФ: с июня 2025 трафик Cloudflare из России ограничивается («16 КБ на соединение», −30% трафика по Cloudflare Radar 10–20.06.2025); Cloudflare: «не может восстановить подключение для пользователей из России». Доступность workers.dev из РФ — не проверено. Плюс: Worker ходит к Anthropic/OpenAI со своих IP (вопрос «поддерживаемой страны» для конечного пользователя формально остаётся — условия провайдеров запрещают использование из неподдерживаемых регионов).
- Vercel Hobby: бесплатный план только для некоммерческого использования; лимиты в этой сессии не перепроверял (не проверено).
- Yandex Cloud Functions: первый 1 млн вызовов/мес и 10 ГБ×ч бесплатно (free tier, остаток сгорает в конце месяца). Работает из РФ, естественная пара для YandexGPT/GigaChat (нет проблем с CORS — прокси сам отдаёт CORS-заголовки). Нужен платёжный аккаунт Yandex Cloud.
- Общий минус любого прокси: публичный URL без авторизации = бесплатный доступ к LLM для любого, кто его найдёт. Нужна своя защита: общий секрет в приложении (тоже извлекаем), лимит запросов по IP/суткам, проверка Origin (обходится вне браузера). Это фактически и есть «своя серверная часть» (решение Р-22 — сервер в планах), только минимальная.
### 3.3 Firebase AI Logic (бывш. Vertex AI in Firebase) + App Check
- Только модели Gemini (Gemini Developer API или Vertex AI). Клиентский SDK вызывает Gemini через прокси Firebase, ключ Gemini в приложении не хранится; Firebase API key лишь идентифицирует проект, авторизацию даёт App Check.
- App Check на Android — Play Integrity (или reCAPTCHA Enterprise для web); с июля 2026 мастер настройки включает enforcement автоматически; есть limited-use токены (одноразовые) против повторного использования; debug-провайдер для разработки.
- Минусы для нас: Play Integrity работает для приложения из Google Play (для APK, установленного вручную, — не проверено, вероятно не пройдёт проверку); нужен нативный Firebase SDK (Kotlin/Java) или web-SDK + плагин Capacitor; доступность из РФ для конечного пользователя — не проверено (Gemini API: РФ не в списке регионов). Привязка к Google.
### 3.4 Сравнение кратко
- Быстрее всего и без инфраструктуры: BYOK (пользователь — сам владелец).
- Без ключа на устройстве и с работой из РФ: Yandex Cloud Functions + YandexGPT/Alice/GigaChat.
- Без своего кода на сервере, но только Gemini и только с Play: Firebase AI Logic + App Check.

## 4. Детерминированная альтернатива без ИИ
Источники (2026-11-21): npm registry https://registry.npmjs.org/chrono-node , файлы пакета https://unpkg.com/chrono-node@2.10.3/?meta , репозиторий https://github.com/wanasit/chrono , поиск npm https://registry.npmjs.org/-/v1/search?text=russian%20date%20parser
- `chrono-node` 2.10.3 (12.10.2026), MIT, без зависимостей. Локали: ar, de, en, es, fi, fr, id, it, ja, nl, pt, ru, sv, uk, vi, zh — русский ЕСТЬ (`chrono.ru`, подпуть `chrono-node/ru`). ESM-код всех локалей ~554 КБ несжатого JS; русская локаль ~30 КБ + общее ядро (точный размер бандла не измерял).
- Собственный прогон (изолированно в scratchpad, `chrono.ru.parse(text, ref, {forwardDate: true})`, опорная дата суббота 2026-11-21 10:00):
  - «завтра в 12» → 2026-11-22 12:00 ✔; «послезавтра» → 23.11 ✔; «через 3 дня» → 24.11 ✔; «через два дня» → 23.11 ✔ (числительные словами); «через неделю» → 28.11 ✔; «в пятницу в 18:30» → 27.11 18:30 ✔; «сегодня в 15» → 21.11 15:00 ✔; «25 декабря» → 25.12 ✔; «1 января» → 2027-01-01 ✔ (forwardDate); «в среду вечером» → 25.11 20:00 ✔; «маникюр в понедельник в полдень» → 23.11 12:00 ✔; «на следующей неделе» → 28.11 (= +7 дней).
  - «в понедельник маникюр в 12» → только «в понедельник» = 23.11, время «в 12» НЕ связано (слово между ними). Дата верна.
  - «в 12 часов» → ОШИБКА: «12 часов» понято как длительность, 21.11 22:00.
  - «в субботу» при сегодняшней субботе → сегодня (21.11), а не через неделю.
  - При опорной дате понедельник 23.11: «в понедельник» → сегодня 23.11; «в следующий понедельник» → 30.11; «через месяц» → 23.12; «через полчаса» → 10:30; «к 9 утра» → завтра 09:00; «каждый понедельник» → просто 23.11 (повторение не распознаётся — нужно своё правило для recurrence).
  - Неизвестные компоненты chrono подставляет по умолчанию (12:00 для дня недели) — смотреть `start.isCertain()`/`knownValues`, а не только `date()`.
- Вывод: для поля `date` (у задачи нет времени) chrono-node ru покрывает типичные фразы; годится как (а) офлайн-фолбэк без ИИ, (б) сверка даты, которую вернула LLM: если chrono нашёл дату с уверенным днём и она расходится с LLM — показать пользователю на подтверждение. Текст задачи (вычесть найденный фрагмент: «маникюр»), приоритет и повторяемость chrono не даёт — нужны свои простые правила (словарь «каждый/ежедневно/еженедельно», «важно/срочно»).
- Другие JS-библиотеки с русским: поиском npm не найдено живых аналогов. natasha/yargy — только Python, JS-порта не найдено. `any-date-parser` 2.2.4 — форматы дат, не естественный русский язык (не проверял детально). Duckling (Facebook, Haskell, есть ru) — серверный, не JS (общеизвестно, не перепроверял).

## 5. Сводная таблица
Обращение = ~700 токенов вход (с системным промптом инструментов) + ~100 выход. «Не изм.» — замеров для нашего сценария нет.

| Способ | Офлайн | Цена за обращение | Задержка | Русский и даты | Размер на устройстве | Покрытие устройств | Сложность внедрения |
|---|---|---|---|---|---|---|---|
| Gemini Nano, ML Kit Prompt API (AICore) | да | 0 | не изм.; вход ≤4000 ток. | русский не подтверждён (валидированы en/ko); даты — малая модель, ненадёжно | 0 в APK, модель качает система | только флагманы (Pixel 9–11, Galaxy S25/S26, топ Xiaomi/OPPO/vivo); minSdk 26; только на переднем плане, квоты | высокая: Kotlin-плагин + KSP (structured output Kotlin-only), бета-API |
| LiteRT-LM + Gemma 4 E2B (или FunctionGemma 270M) | да | 0 | флагман S26 Ultra GPU: TTFT 0,3 с, 52 ток/с → ~1–2 с; средний телефон — не изм. | 140+ языков заявлено, русский не измерен; даты — ненадёжно без табличной подсказки | E2B 2,58 ГБ; E4B 3,65 ГБ; FunctionGemma 0,29 ГБ (нужно дообучение) | устройства с 6–8+ ГБ ОЗУ (оценка); первая загрузка по сети | высокая: свой Kotlin-плагин (или `@capgo/capacitor-llm` без tool calling), загрузчик модели |
| llama.cpp (`llama-cpp-capacitor` 0.1.5) + Qwen3/3.5 0.6–4B GGUF | да | 0 | Qwen3-1.7B на 8 Elite ~36–48 ток/с; средний — не изм. | 4B — BFCL-V4 50,3 (Qwen3.5); ≤2B — BFCL ~10–14; русский не измерен | 0,4 ГБ (0.6B) / 1,1 ГБ (1.7B) / 2,5 ГБ (4B) + 77 МБ нативных библиотек | arm64, ОЗУ по размеру модели | средняя-высокая: плагин сырой (один автор), JSON-схема через GBNF есть |
| WebLLM / transformers.js в WebView | да после загрузки | 0 | не изм.; на телефонах сообщают о сбоях | как у малых моделей | 0,4–2,3 ГБ в кэше браузера | WebGPU в Android WebView не подтверждён (caniuse: нет); Chrome Android 12+ — да | средняя по коду, высокий риск по работоспособности |
| Claude Haiku 5.5 (облако) | нет | ~$0.00012 | не изм. для короткого запроса; AA (длинные промпты, low effort) TTFT 6,2 с; без мышления — оценка 1–2 с | высокое (оценка, не замер); strict tool use гарантирует схему | 0 | любое устройство с сетью; РФ — не поддерживается | низкая: fetch из браузера (CORS есть), BYOK или прокси |
| OpenAI gpt-5-nano / gpt-6-luna | нет | $0.000075 / $0.00012 | не изм. | высокое (оценка); strict structured outputs | 0 | РФ — не поддерживается | низкая (CORS есть) |
| Gemini 2.5 / 3.1 Flash-Lite | нет | $0.00011 / $0.000325; есть бесплатный уровень (данные идут на обучение) | AA 3.5 Flash-Lite TTFT 4,6 с (длинные промпты) | высокое (оценка) | 0 | РФ — не в списке регионов | низкая (CORS есть); вариант Firebase AI Logic + App Check — средняя |
| Alice AI LLM Flash / YandexGPT (Yandex AI Studio) | нет | ~0,09 ₽ | не изм. | русский — родной (оценка); function calling есть | 0 | работает из РФ, оплата в рублях | средняя: нет CORS → прокси (Yandex Cloud Functions, 1 млн вызовов/мес бесплатно) или нативный HTTP |
| GigaChat 2 Lite (Сбер) | нет | ~0,05 ₽; Freemium физлицам 250 млн ток./год | не изм. | русский — родной (оценка); функции есть, строгость не проверена | 0 | работает из РФ | средняя-высокая: нет CORS, сертификат НУЦ Минцифры, OAuth-токен на 30 мин |
| chrono-node 2.10.3 (ru), без ИИ | да | 0 | миллисекунды (оценка) | даты: типовые фразы верно; ошибки — «в 12 часов», связка дня и времени через слово, повторяемость не распознаёт | ~30 КБ локаль + ядро | все | низкая: npm-пакет в PWA и APK |

## 6. Выводы для выбора (кратко)
1. Локальная ИИ на телефоне в ноябре 2026 работает только на флагманах или ценой загрузки 0,4–2,6 ГБ модели; tool calling «из коробки» надёжен только у LiteRT-LM + Gemma 4 / FunctionGemma; русский и арифметика дат у малых моделей не измерены. Для MVP — не основной путь.
2. Облако: одно обращение стоит доли цента у всех; решают доступность из РФ, CORS и где лежит ключ. Зарубежные (Claude/OpenAI/Gemini) — CORS есть, но РФ не поддерживается. Российские (Yandex, GigaChat) — работают из РФ, но без CORS → нужен прокси или нативный HTTP.
3. Даты не доверять модели: передавать в системный промпт таблицу ближайших дней (дата ↔ день недели) или просить нормализованное выражение и считать дату кодом; сверять с chrono-node ru.
4. chrono-node ru — дешёвый офлайн-фолбэк и контроль даты; текст, приоритет и повторяемость — своими правилами.
5. Открытые вопросы для теста на реальном устройстве: `navigator.gpu` в WebView; качество Gemini Nano на русском; доступность выбранного облачного API из сети владельца.
