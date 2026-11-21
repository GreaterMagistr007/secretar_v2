# Исследование: офлайн-модель со ЗВУКОВЫМ входом и вызовом функций (Android, Capacitor)

Дата начала: 2026-11-21. Агент-исследователь. Контекст: решение Р-34 (офлайн-модель, встроенная в приложение, звук сразу в модель, вызов `add_task`).
Правило: у каждого факта — ссылка и дата проверки; непроверенное помечено «не проверено».

## План разделов
1. Что уже известно из прошлых исследований (findings_voice_llm.md, findings_voice_stt.md)
2. Модели со звуковым входом (по каждой: размер, лицензия, русский, вызов функций, формат/длина звука)
3. Рантаймы Android и поддержка звукового входа
4. Скорость и ОЗУ на телефонах
5. Модель внутри APK: лимиты, assets, mmap, альтернативы
6. Запасной путь в два шага (GigaAM v3 → текстовая модель)
7. Проверка на эмуляторе x86_64
8. Сводка (таблица, рекомендации, что узнать только опытом)

## 1. Что уже известно (из memory/findings_voice_llm.md и findings_voice_stt.md, 2026-11-21)
- LiteRT-LM: Kotlin API (Stable), `com.google.ai.edge.litertlm:litertlm-android`, function calling через `ToolSet`/`@Tool`, constrained decoding. Gemma 4 E2B `.litertlm` 2583 МБ (S26 Ultra GPU: TTFT 0,3 с, 52 ток/с; CPU 47 ток/с, 1733 МБ); E4B 3654 МБ. FunctionGemma 270M 289 МБ (58% на Mobile Actions без дообучения). MediaPipe LLM Inference — maintenance-only.
- llama.cpp: `llama-cpp-capacitor` 0.1.5 (MIT, ABI вкл. x86_64, GBNF/json_schema, tool calling не упомянут, незрелый). Qwen3 GGUF 0,4–2,5 ГБ.
- `@capgo/capacitor-llm` 8.2.4: Gemini Nano / LiteRT-LM / MediaPipe, без function calling в README; аудиовход тогда не проверялся.
- GigaAM v3 через sherpa-onnx: модели 163–167 МБ, ср. WER 9.1 (данные авторов), скорость на телефоне не измерена; sherpa-onnx v2.0.2 (2026-11-19), Android arm64/arm32/x86/x64, готового Capacitor-плагина нет.
- Приём звука моделями тогда НЕ исследовался — это предмет настоящего отчёта.

## 2. Модели со звуковым входом

### 2.1 Gemma 4 E2B / E4B (Google) — проверено 2026-11-21
- Аудиовход: ЕСТЬ у E2B, E4B и 12B (26B A4B и 31B — только текст+картинка). Карточка https://huggingface.co/google/gemma-4-E2B-it : «audio featured natively on the E2B, E4B, and 12B models», ASR и перевод речи в текст «across multiple languages», максимум 30 с звука. Лицензия Apache 2.0 (HF API: license=apache-2.0, создано 2026-03-02, обновлено 2026-11-03). Параметры E2B: 2,3B эффективных (5,1B с эмбеддингами).
- Формат звука (https://ai.google.dev/gemma/docs/capabilities/audio): моно, 16 кГц, float32 в [-1,1]; многоканальный сводится к одному; 25 аудиотокенов в секунду у Gemma 4 (у Gemma 3n — 6,25 ток/с); максимум 30 с. Значит фраза 3–5 с = 75–125 аудиотокенов.
- Вызов функций: нативный («Native support for structured tool use», карточка); в LiteRT-LM — `ToolSet` + constrained decoding.
- Русский: в карточке языки аудио НЕ перечислены; бенчмарки FLEURS (E2B 0.09, E4B 0.08 — вероятно WER-доля, но в карточке не сказано) и CoVoST (33.47/35.54) — агрегат по языкам, отдельной цифры по русскому нет. Качество русской речи — НЕ проверено.
- ВАЖНО, проверено мной по заголовкам файлов (HTTP Range первых 256 КБ, секции модели): обычные `.litertlm` из litert-community СОДЕРЖАТ аудиоэнкодер — секции `tf_lite_audio_encoder_hw`, `tf_lite_audio_adapter`, `tf_lite_end_of_audio` есть в `gemma-4-E2B-it.litertlm`, `gemma-4-E2B-it-gpu.litertlm`, `gemma-4-E4B-it.litertlm`; в шаблоне чата есть токены `<|audio|>`. Карточка: «Vision and Audio models are loaded on demand to further reduce memory consumption».
- Точные размеры (HF API tree, 2026-11-21), байт: E2B `gemma-4-E2B-it.litertlm` 2 588 147 712 (2,59 ГБ, CPU/общий); `-gpu.litertlm` 2 340 870 772 (2,34 ГБ); `-web.litertlm` 2 008 432 640; Qualcomm QCS8275 2 722 352 245; Tensor G5 3 206 299 658. E4B: `gemma-4-E4B-it.litertlm` 3 659 530 240 (3,66 ГБ); `-gpu.litertlm` 3 310 938 740 (3,31 ГБ).
- Замеры (карточка, только текст, S26 Ultra): E2B CPU prefill 557 / decode 46,9 ток/с, TTFT 1,8 с, 1733 МБ; GPU 3808 / 52,1, TTFT 0,3 с, 676 МБ CPU-памяти. Аудио-замеров (время энкодера) в карточке НЕТ.
- LiteRT-LM релиз v0.19.1 (05.11.2026): «vision and audio support for Gemma 4 on the Artisan GPU backend» — т.е. на GPU-бэкенде аудио для Gemma 4 появилось только в последней версии; на CPU — раньше (точная версия не установлена). https://github.com/google-ai-edge/LiteRT-LM/releases

### 2.2 Gemma 3n E2B / E4B (Google, июнь 2025) — проверено 2026-11-21
- Аудиовход есть (карточка https://huggingface.co/google/gemma-3n-E2B-it-litert-lm : «support multimodal inputs, including text, vision, and audio»; 6,25 аудиотокена/с, один канал). Лицензия — Gemma Terms of Use (HF API license=gemma), репозиторий gated (заголовок файла прочитать не удалось — 401), поэтому наличие аудиоэнкодера именно в `.litertlm` по файлу НЕ проверено; Google указывает демо «Audio Scribe» в AI Edge Gallery.
- Размеры (HF API): `gemma-3n-E2B-it-int4.litertlm` 3 655 827 456 (3,66 ГБ); E4B int4 4 919 541 760 (4,92 ГБ — выше ориентира); старый `.task` (MediaPipe) E2B 3 136 226 711.
- Скорость (карточка, текст): S24 Ultra CPU 110,5 / 16,1 ток/с, GPU 816 / 15,6; vivo X300 Pro NPU 1671 / 28,4.
- Вызов функций: в карточке не упомянут; LiteRT-LM tools заявлены для Gemma 4/FunctionGemma. Вывод: Gemma 3n проигрывает Gemma 4 E2B по всем параметрам (больше файл, медленнее, нет нативных tools, не Apache) — брать только как запасной вариант.

### 3.1 LiteRT-LM (Android) — проверено 2026-11-21
- Maven: `com.google.ai.edge.litertlm:litertlm-android`, последняя 0.19.1 (maven-metadata.xml, lastUpdated 2026-11-05). AAR 21 МБ; minSdkVersion 24 (из AndroidManifest AAR — совпадает с нашим); нативные библиотеки ТОЛЬКО `arm64-v8a` (22,7 МБ) и `x86_64` (26,9 МБ) — armeabi-v7a нет (32-битные телефоны не поддерживаются), x86_64 для эмулятора ЕСТЬ. Зависимости: gson 2.14.0, kotlin-reflect 2.4.0, kotlinx-coroutines-android 1.11.0.
- Аудио в Kotlin API: `Content.AudioBytes(byteArray)` и `Content.AudioFile(...)` в сообщении; `EngineConfig(audioBackend = Backend.CPU())` (или NPU). Документ https://developers.google.com/edge/litert-lm/android ; формат байтов на странице не указан (см. ниже проверку исходников).
- Модель грузится по пути к файлу (`modelPath`), про assets в доке ничего; `cacheDir` ускоряет вторую загрузку.

- Исходники Kotlin (main, 2026-11-21, https://github.com/google-ai-edge/LiteRT-LM/tree/main/kotlin/java/com/google/ai/edge/litertlm): `Content.AudioBytes(bytes: ByteArray)` («Audio provided as raw bytes», в JSON уходит base64 blob) и `Content.AudioFile(absolutePath)`. Предобработка звука в C++ через miniaudio (`runtime/components/preprocessor/audio_preprocessor_miniaudio.h`), тестовые данные — `.wav`; т.е. байты, по всей видимости, — содержимое файла (WAV), декодируемое и ресемплируемое рантаймом. Точный набор принимаемых форматов (WAV PCM16 точно; mp3/flac/ogg?) — НЕ проверено; безопасный путь — писать WAV 16 кГц моно PCM16 (`AudioRecord`) и отдавать `AudioBytes`/`AudioFile`.
- `EngineConfig(modelPath: String, backend, visionBackend, audioBackend: Backend? = null — если null, аудио-исполнитель не создаётся, maxNumTokens, cacheDir …)`. Модель — только ПУТЬ к файлу (нет FileDescriptor/assets).
- Constrained decoding: `ToolChoice.Required` / конкретная функция («must call the function [name]») при `ExperimentalFlags.enableConversationConstrainedDecoding = true`; `ResponseFormat.json(schema)` и REGEX; `ConversationConfig(tools, automaticToolCalling=false, maxOutputToken, thinkingConfig, systemInstruction …)`. Для нас: `ToolChoice` = обязательный вызов `add_task` → модель не может «ответить текстом» вместо вызова.
- «LiteRT Omni» (экспериментально, каталог `omni/` в репозитории LiteRT-LM, README 2026-11): C++-API `OmniEngine`/`OmniSession` и CLI `omni_runner`, есть сборка под Android arm64. Any-to-Any: `minicpm-o-4.5` и `qwen2.5-omni-3b` (аудио+текст+картинка → текст+звук); ASR: parakeet-tdt-0.6b-v3, parakeet-ctc-0.6b, whisper-tiny, qwen3-asr-0.6b, moonshine-tiny. Kotlin-API для Omni НЕ найден — только C++ (свой JNI). Tool calling в Omni не описан. Готовых `.litertlm` для Qwen2.5-Omni-3B/MiniCPM-o в litert-community поиском HF API не найдено (README ссылается на исходные репозитории) — конвертировать самому, НЕ проверено.
- В litert-community найдены новые (2026-10/11) Liquid AI omni-модели: `LFM3-Omni-2B-LiteRT` (2026-10-28, any-to-any, speech), `d1-Omni-2B-LiteRT` (2026-11-02, audio-text-to-text), `d1-omni-600M-LiteRT` (2026-10-08, теги языков включают ru). Разобраны в 2.x ниже.

### 2.3 Liquid AI: LFM2-Audio / LFM2.5-Audio / LFM3-Audio / LFM3-Omni / d1-Omni — проверено 2026-11-21 (HF API + карточки)
- LFM2-Audio-1.5B (2025-08-28) и LFM2.5-Audio-1.5B (2025-12-18): теги языка только `en` (есть отдельная LFM2.5-Audio-1.5B-JP); русская речь НЕ заявлена → для нас не годятся. GGUF LFM2.5-Audio Q4_0 696 МБ + mmproj Q4_0 220 МБ (+ токенайзер/вокодер для вывода речи).
- LFM3-Audio-2B (2026-09-08): языки ar, da, de, el, en, es, fi, fr, he, it, ja, ko, nl, pl, pt, sv, tr, zh — русского НЕТ.
- LFM3-Omni-2B (2026-10-21, https://huggingface.co/LiquidAI/LFM3-Omni-2B): 2,17B, вход текст/картинка/видео/звук 16 кГц, контекст 32K; вызов функций ЕСТЬ (схемы через `tools=` в chat template, вывод `<tool_call><function=…><parameter=…>`, «Requests can be spoken or written»). НО: в карточке 19 «speech languages» — русского среди них НЕТ (русский только в текстовых языках); ASR WER English 6,36 (ESB), FLEURS 9 языков 6,72 (Gemma 4 E4B 6,54 для сравнения) — без русского. Лицензия LFM Open License v1.0: коммерческое использование организациями с выручкой ≥10 млн $ не лицензировано.
  - GGUF (HF API): Q4_0 1 049 617 920 + mmproj Q4_0 270 576 544 ≈ 1,32 ГБ; Q4_K_M 1 099 630 080 + mmproj 291 586 720 ≈ 1,39 ГБ; Q8_0 1,85 ГБ + mmproj 0,51 ГБ. Рантаймы по карточке: Transformers, SGLang, llama.cpp (GGUF), OpenVINO.
  - LiteRT-версия `litert-community/LFM3-Omni-2B-LiteRT` (2026-10-28): `LFM3-Omni-2B_int8.litertlm` 3,23 ГБ, LiteRT-LM 0,18.1; вход звука 16 кГц моно 16-бит WAV, окна по 30 с; tool calling НЕ нативный в LiteRT-LM («Tool calls come back as message text; your app parses them»); тег языка только en. Замер Galaxy S26: GPU prefill 1139 / decode 27 ток/с, TTFT 0,93 с, пик 1,05 ГБ + 3,08 ГБ GPU; CPU 557 / 25,9, TTFT 1,8 с, пик 3,42 ГБ.
  - Вывод: интересна как «звук → tool_call» за ~1,3 ГБ (GGUF), но русская речь официально не поддержана — пробовать только как эксперимент «а вдруг понимает».
- d1-Omni-2B / d1-omni-600M (2026-10, теги включают ru): по названию и тегу `decision` — специализированные «decision»-модели (не изучал подробно, назначение не проверено); d1-omni-600M — pipeline image-text-to-text, аудио не заявлено.

### 2.4 Voxtral (Mistral) — проверено 2026-11-21
- Voxtral-Mini-3B-2507 (2025-07, https://huggingface.co/mistralai/Voxtral-Mini-3B-2507): Apache 2.0; ~4,7B параметров по safetensors (заявлено 3B LLM + энкодер); языки речи: en, es, fr, pt, hi, de, nl, it — РУССКОГО НЕТ. Function calling «напрямую из голоса» заявлен. До 30 мин звука (32K контекст). Офиц. рантайм vLLM/Transformers (GPU ~9,5 ГБ). llama.cpp: есть `ggml-org/Voxtral-Mini-3B-2507-GGUF` — Q4_K_M 2 473 001 920 + mmproj Q8_0 715 714 080 ≈ 3,19 ГБ.
- Voxtral-Mini-4B-Realtime-2602 (2026-01, https://huggingface.co/mistralai/Voxtral-Mini-4B-Realtime-2602): Apache 2.0; ~3,4B LLM + ~970M энкодер; РУССКИЙ ЕСТЬ: FLEURS ru 6,02% при задержке 480 мс (5,41% при 2,4 с). Но это ЧИСТАЯ транскрипция (стриминговый ASR), чат/понимание/function calling не заявлены → «звук сразу в модель с вызовом функции» не даёт; годится только как STT-ступень двухшагового пути, и она тяжёлая. GGUF `ggml-org/Voxtral-Mini-4B-Realtime-2602-GGUF` (2026-10-16): Q4_K_M 2 551 244 000 + mmproj Q8_0 1 063 756 032 ≈ 3,6 ГБ. Карточка пишет, что llama.cpp не поддерживается — но GGUF от ggml-org вышел позже карточки; поддержка в llama.cpp — см. раздел 3 (llama.cpp).
- Вывод: Voxtral Mini 3B — есть function calling, нет русского; Realtime — есть русский, нет function calling. Для нашей задачи ни одна не подходит «как есть»; Mini 3B — только эксперимент «поймёт ли русский» (без гарантии).

### 2.5 Qwen Omni — проверено 2026-11-21
- Малых Omni у Qwen с открытыми весами — только Qwen2.5-Omni-3B (2025-04-30) и 7B. Qwen3-Omni — только 30B-A3B (не для телефона). Qwen3.5-Omni (тех. отчёт 22.04.2026, arXiv 2604.15804) — по найденным источникам открытых малых весов нет; в HF API поиск «Qwen3.5-Omni» даёт только сторонние файнтюны (не официальные) — не проверено/не годится. Отдельно есть Qwen3-ASR-0.6B/1.7B (2026-01-28) — чистый ASR, не LLM с инструментами.
- Qwen2.5-Omni-3B (https://huggingface.co/Qwen/Qwen2.5-Omni-3B): лицензия `qwen-research` (исследовательская, текст в карточке не приведён — коммерческое использование, по всей видимости, ограничено; НЕ проверено); safetensors ~6B параметров (с энкодерами и talker). Тег языка только en; бенчмарки речи — en/zh/yue/fr (+de/es в CoVoST), РУССКОГО нет. Function calling в карточке НЕ упомянут (у Qwen2.5 текстовой части формат `<tool_call>` в Hermes-стиле есть, но для Omni-3B не заявлен — только промптом, не проверено).
- Размеры: GGUF `ggml-org/Qwen2.5-Omni-3B-GGUF` Q4_K_M 2 104 931 648 + mmproj Q8_0 1 538 031 328 ≈ 3,64 ГБ (mmproj включает и зрение, и звук). MNN `taobao-mnn/Qwen2.5-Omni-3B-MNN` всего 4,02 ГБ, но для «звук→текст» нужны llm.mnn.weight 1 737 291 202 + embeddings_bf16.bin 622 329 856 + audio.mnn.weight 368 027 842 ≈ 2,73 ГБ (talker/dit/bigvgan/visual ≈ 1,26 ГБ можно не класть — не проверено, что MNN грузит без них).
- Вывод: русская речь не заявлена, лицензия исследовательская, нативного tool calling нет → слабый кандидат; интересен только тем, что есть готовое Android-приложение MNN с Omni (см. раздел 3).

### 2.6 Phi-4-multimodal-instruct (Microsoft, 2025-02) — проверено 2026-11-21
- https://huggingface.co/microsoft/Phi-4-multimodal-instruct : 5,6B параметров, MIT. Языки АУДИО: en, zh, de, fr, it, ja, es, pt — РУССКОГО НЕТ (русский только в текстовых). Function calling есть (инструменты JSON в system prompt между `<|tool|>…<|/tool|>`). Звук до ~40 с, форматы — всё, что читает soundfile. OpenASR WER 6,14% (en).
- ONNX (onnxruntime-genai) `microsoft/Phi-4-multimodal-instruct-onnx`: в репозитории только GPU-вариант int4 (`gpu/gpu-int4-rtn-block-32`), всего 5,14 ГБ (text 2,18+0,24 ГБ, embedding 1,23 ГБ, speech 0,52+0,31 ГБ, vision 0,63 ГБ); CPU/мобильной сборки в репозитории НЕТ. Даже без зрения ≈4,5 ГБ — выше ориентира.
- Вывод: не подходит (нет русской речи, слишком большой, нет мобильной сборки).

### 2.7 Ultravox (Fixie) — проверено 2026-11-21
- Малый вариант — только `fixie-ai/ultravox-v0_5-llama-3_2-1b` (2025-02, MIT): замороженная Llama 3.2 1B Instruct + дообученный энкодер whisper-large-v3-turbo + адаптер. Тег «42 languages», список не приведён; в оценке есть CoVoST2 ru→en 24,12 BLEU — т.е. русский звук модель «слышит» (косвенно). Function calling в карточке не упомянут (Llama 3.2 1B формально умеет tools, но 1B — слабая; только промптом/грамматикой). Звук 16 кГц.
- Размеры (HF API, `ggml-org/ultravox-v0_5-llama-3_2-1b-GGUF`): Llama-3.2-1B Q4_K_M 807 694 464 + mmproj f16 1 371 123 616 ≈ 2,18 ГБ (mmproj = энкодер whisper-large-v3-turbo в f16, квантованного mmproj в репозитории нет). Новые версии Ultravox (v0.6/0.7) — только 8B+ (Llama 3.1 8B, Gemma 3 27B, Qwen3 32B, GLM) — не для телефона.
- Поддержка в llama.cpp (`mtmd`) — есть (GGUF от ggml-org; подробнее раздел 3).
- Вывод: «STT-энкодер Whisper + маленькая LLM» в одной модели; качество понимания русской фразы и дат у 1B-модели — сомнительно, экспериментальный кандидат.

### 2.8 MiniCPM-o 4.5 (OpenBMB, 2026-02) — проверено 2026-11-21
- Apache 2.0, 9,37B параметров (HF API safetensors). GGUF основной модели Q4_0 4 773 679 904 (4,77 ГБ) + отдельные audio/vision/tts — больше ориентира 4 ГБ. Есть в LiteRT Omni (экспериментально, C++). Русская речь не проверена (языковых тегов нет). Вывод: для телефона слишком тяжела.

### 2.9 Русская речь у Gemma — что известно (2026-11-21)
- Официальных цифр WER/CER на русском для Gemma 4 E2B/E4B и Gemma 3n НЕТ (карточка, https://ai.google.dev/gemma/docs/capabilities/audio , абстракт тех. отчёта Gemma 4 https://arxiv.org/abs/2607.02770 — полный текст не разбирал). Документация Google: многоязычный ASR заявлен именно для Gemma 4 E2B/E4B/12B; для 3n — нет. Шаблон промпта ASR от Google: «Transcribe the following speech segment in {LANGUAGE} into {LANGUAGE} text».
- Косвенно: arXiv 2604.10014 (смещения омни-моделей) приводит случаи, когда Gemma транскрибировала английскую речь как русскую (т.е. русский в обучении был) — точность на русском не измерена.
- Вывод: качество русской речи у всех кандидатов — главный неизвестный, проверяется только опытом (набор из 20–30 своих фраз).

## 3. Рантаймы Android и звуковой вход (продолжение)

### 3.2 llama.cpp (`mtmd`) — проверено 2026-11-21
- Официальный список аудиомоделей (https://github.com/ggml-org/llama.cpp/blob/master/docs/multimodal.md): только звук — Ultravox 0.5 1B/8B, Voxtral Mini 3B, Qwen3-ASR 0.6B/1.7B; звук+зрение — Qwen2.5-Omni 3B/7B, Qwen3-Omni 30B-A3B, **Gemma 4 E2B и E4B** (`ggml-org/gemma-4-E2B-it-GGUF`). Gemma 3n, LFM2-Audio, Voxtral Realtime в списке НЕТ (для LFM3-Omni GGUF есть у Liquid, поддержка в mtmd — по карточке Liquid, в документации llama.cpp не указана — не проверено). Qwen2-Audio — «very poor result».
- Размеры Gemma 4 GGUF (HF API): E2B Q4_0 2 841 481 184 + mmproj Q8_0 557 368 096 ≈ 3,40 ГБ (против 2,59 ГБ у `.litertlm`); E4B Q4_0 4 590 807 392 + mmproj 559 874 848 ≈ 5,15 ГБ (выше ориентира). Q4_K_M для Gemma 4 в ggml-org нет.
- Tool calling в llama.cpp: через Jinja chat template модели + `tools`/`tool_choice` (OpenAI-совместимо) и ленивая грамматика (`grammar_lazy`, `grammar_triggers`) либо `json_schema` → GBNF — гарантированно валидный JSON.
- Последний релиз llama.cpp: `v1.0.0` от 2026-11-13 (GitHub API releases/latest); готовых Android-артефактов (AAR) в релизе нет — сборка под Android через NDK самостоятельно.

### 3.3 Готовые плагины Capacitor — проверено 2026-11-21 (npm registry + README из unpkg + исходники)
- `@capgo/capacitor-llm` 8.2.4 (19.11.2026, MPL-2.0): Android-бэкенд LiteRT-LM, но зависимость `com.google.ai.edge.litertlm:litertlm-android:0.10.0` (старая; актуальная 0.19.1) — аудио для Gemma 4 на GPU появилось только в 0.19.1. В README и исходниках НЕТ аудиовхода и НЕТ tool calling. «Bundled asset» (`/android_asset/...litertlm`) реализован КОПИРОВАНИЕМ ассета в файл (`LLM.java:420–442`, `copyAssetToFile`) — место на устройстве удваивается. Требует API 26+ (у нас minSdk 24). Для нас — только как образец кода.
- `capacitor-gemma-3n` 1.0.0 (22.01.2026, MIT, один автор, https://github.com/jacquesdupontd/capacitor-gemma-3n): MediaPipe LLM Inference + Gemma 3n `.litertlm`, ЕСТЬ `generateFromAudio({audioBase64: WAV 16 кГц моно, prompt})` и стриминг. Но peer `@capacitor/core ^7.0.0` (у нас 8 — совместимость не проверена), tool calling нет, модель ищется в files/внешней памяти/Download. Пригоден как пример «звук → Gemma на Android из Capacitor».
- `llama-cpp-capacitor` 0.1.5 (18.02.2026, MIT): заявлены мультимодальность с аудио (`initMultimodal({path: mmproj})`, `getMultimodalSupport()` → `{vision, audio}`), tools/tool_choice, json_schema/grammar; ABI arm64-v8a, armeabi-v7a, x86, x86_64. Но версия вышла ДО Gemma 4 (апрель 2026) — встроенный llama.cpp Gemma 4 аудио, скорее всего, не знает; нужна пересинхронизация с upstream (у плагина есть скрипт sync) — не проверено.
- `@cantoo/capacitor-llama` 0.1.6 (18.08.2026, MIT, peer Capacitor >=6, обёртка llama.cpp в духе llama.rn): tools/tool_choice/json_schema/grammar есть, `is_model_asset` (загрузка модели из ассетов — механизм не проверен); аудио/мультимодальность в README НЕ найдены.
- Вывод: готового Capacitor-плагина «звук + tool calling + Capacitor 8» нет. Реалистично — свой Kotlin-плагин поверх LiteRT-LM 0.19.1 (рядом с нашим `TaskNotifier`), это ~1 класс Engine/Conversation + запись звука.

### 3.4 MNN-LLM (Alibaba) — проверено 2026-11-21
- Приложение MnnLlmChat (https://github.com/alibaba/MNN/blob/master/apps/Android/MnnLlmChat/README.md), версия 0.8.3: аудио→текст для Qwen2-Audio-7B, Qwen2.5-Omni 3B/7B (с v0.4.3/0.4.4), LFM2-Audio; Gemma 4 добавлена (про аудио Gemma 4 в README не сказано). Авторы: протестировано только на OnePlus 13 и Xiaomi 14 Ultra. Заявлены ускорения против llama.cpp (prefill CPU ×8,6, decode ×2,3) — замеры самих авторов. Function calling в README не упомянут.
- Модели (HF API, taobao-mnn): `gemma-4-E2B-it-MNN` (2026-04-09) СОДЕРЖИТ `audio.mnn.weight` 589 877 376 — т.е. аудиоэнкодер Gemma 4 экспортирован; всего 3 739 999 029 (llm.mnn.weight 1,44 ГБ + ple_embeddings_int4 1,47 ГБ + audio 0,59 + visual 0,23); без зрения ≈3,51 ГБ. Есть `LFM2-Audio-1.5B-MNN`, `LFM2-1.2B-Tool-MNN`, `Qwen2.5-Omni-3B-MNN` (для звука→текст ≈2,73 ГБ).
- MNN последний релиз 3.6.2 (2026-10-29). Android-SDK: Java/JNI-обёртка в составе приложения (готового Maven-артефакта для LLM не проверял). ABI — по сборке 64-бит; x86_64 для эмулятора — не проверено.
- Вывод: рабочий альтернативный рантайм для Gemma 4 E2B со звуком и для Qwen2.5-Omni, но tool calling придётся делать промптом+разбором; интеграция — свой JNI, сложнее LiteRT-LM.

### 3.5 ExecuTorch (PyTorch) — проверено 2026-11-21
- Блог 16.03.2026 (https://pytorch.org/blog/building-voice-agents-with-executorch-a-cross-platform-foundation-for-on-device-audio/): голосовые модели — Voxtral Realtime (только Linux/macOS/Windows, Android НЕТ), Parakeet TDT и Whisper (Android-приложения в executorch-examples), Sortformer, Silero VAD. MultiModal runner умеет аудио (примеры Llava, Voxtral). Voxtral Realtime int4 — 5–6 ГБ. Gemma 4/3n со звуком, Qwen-Omni на ExecuTorch Android — НЕ найдено.
- Вывод: для «звук → LLM → функция» на Android не подходит (нет готовой модели нашего класса); ExecuTorch имеет смысл только для STT-ступени (Whisper/Parakeet — русский у Parakeet v3 есть? не проверено).

### 3.6 MediaPipe LLM Inference — проверено 2026-11-21
- Аудио для Gemma 3n в MediaPipe LLM Inference API появилось в сентябре 2025 (блог https://developers.googleblog.com/google-ai-edge-gallery-now-with-audio-and-on-google-play/ 09.09.2025): пакетный режим, клипы до 30 с, стриминга нет, языки не перечислены. API в режиме maintenance-only, Google рекомендует LiteRT-LM. Вывод: не брать для нового кода (кроме как образец — плагин `capacitor-gemma-3n` построен на нём).

### 3.7 ONNX Runtime GenAI — проверено 2026-11-21
- Android: сборка AAR вручную (гайд Arm, пример Phi-3-mini, ORT GenAI 0.9.0, https://learn.arm.com/learning-paths/mobile-graphics-and-gaming/build-android-chat-app-using-onnxruntime/ ). Для Phi-4-multimodal в офиц. репозитории только GPU-int4 (5,14 ГБ), CPU/мобильной версии нет («stay tuned» в зеркале карточки). Работающего Android-примера со звуком не найдено. Вывод: не годится.

## 5. Модель внутри APK — проверено 2026-11-21
Ключевой факт: все кандидаты с аудио — больше 2 ГиБ (2 147 483 648 байт): Gemma 4 E2B `.litertlm` 2 588 147 712, `-gpu` 2 340 870 772; Gemma 4 E2B GGUF+mmproj 3,40 ГБ. Значит APK с моделью гарантированно > 2 ГиБ.

### 5.1 Сборка (Gradle/AGP)
- Unreal-форум (15–17.03.2025, https://forums.unrealengine.com/t/how-to-package-game-with-one-file-larger-than-2-gb-for-android/2391132): файл > 2 ГБ в ассетах роняет задачу AGP `:app:compressReleaseAssets` (CompressAssetsWorkAction) с «Required array size too large» — предел Java-массива (int). Обход у них — вынести данные из APK.
- Unity Issue UUM-27042 «Gradle throws errors when attempting to build APK with 2GB or larger assets» — закрыт «By Design» (страница не открылась полностью; заголовок и статус из поисковой выдачи).
- Gradle-форум: «Zip64 required but forbidden» в `PackageAndroidArtifact$IncrementalSplitterRunnable` (https://discuss.gradle.org/t/android-studio-packagedebug-too-many-assets-zip64-fail/42604).
- Поможет ли `androidResources.noCompress += "litertlm"` пройти `compressReleaseAssets` для файла > 2 ГБ — НЕ проверено (дешёвый опыт: собрать тестовый APK с файлом-заглушкой 2,6 ГБ).

### 5.2 Установка
- Исходники платформы (AOSP main, `frameworks/base/core/java/android/util/apk/VerityBuilder.java`, строки 314 и 469): `Math.toIntExact(signatureInfo.apkSigningBlockOffset)` — смещение блока подписи (≈ размер APK) приводится к int. Если подпись APK содержит verity-дайджест (`CONTENT_DIGEST_VERITY_CHUNKED_SHA256`, `ApkSigningBlockUtils.java:127`), то при APK > 2 ГиБ это даёт ArithmeticException «integer overflow». Ровно такую ошибку описывают пользователи: «INSTALL_PARSE_FAILED_NO_CERTIFICATES: Failed collecting certificates … APK Signature Scheme v2 … integer overflow» (https://itch.io/post/7971353), Quest 2: APK < 2 ГБ ставится, ~3 ГБ — нет (https://communityforums.atmeta.com/discussions/dev-unity/can-unity-break-the-2gb-apk-install-limit/974824 , 2022). Добавляет ли наш AGP verity-дайджест в подпись — НЕ проверено; сам по себе путь кода с пределом 2 ГиБ подтверждён по исходникам.
- Классический ZIP: смещения 32-битные без знака (4 ГиБ); APK 2–4 ГиБ формально обходится без zip64. libziparchive умеет записи > 4 ГиБ (`ZipEntry64`, bug 150900468, ~Android 11) — для minSdk 24 не опора.
- Место при установке: скачанный APK (2,7 ГБ) + копия в /data/app (2,7 ГБ) + (если рантайм требует путь) извлечённая модель (2,6 ГБ) → пик ~8 ГБ, постоянно ~5,3 ГБ. Время установки: проверка подписи читает весь APK (хеш 2,7 ГБ) — секунды–десятки секунд, НЕ измерено.

### 5.3 Чтение модели прямо из APK
- `AssetManager.openFd()` работает только для НЕсжатых ассетов (`noCompress`) и отдаёт (fd APK, offset, length) — mmap с этого смещения технически возможен. НО LiteRT-LM принимает только путь (`EngineConfig.modelPath: String`, исходник `Config.kt`), llama.cpp — тоже путь к файлу. Путь `/proc/self/fd/N` укажет на начало APK, а не на смещение ассета → не подходит. Значит для LiteRT-LM и llama.cpp ассет придётся КОПИРОВАТЬ в files (так и делает `@capgo/capacitor-llm`, `LLM.java:420–442`) → место удваивается.
- Идея-обход (НЕ проверено): положить модель как `jniLibs/arm64-v8a/libmodel.so` с `useLegacyPackaging=true` — установщик сам распакует её в `nativeLibraryDir` (реальный путь к файлу). Но это та же двойная копия (в APK + распакованная) и те же ограничения APK > 2 ГиБ.

### 5.4 Альтернативы
- Play Asset Delivery — только через Google Play (нам не подходит).
- Скачивание при первом запуске (HF или свой хостинг) — `downloadModel` у capgo делает так; нужна сеть один раз; 2,6 ГБ.
- «Отдельный файл рядом»: APK без модели (~30–50 МБ) + файл модели, который владелец кладёт на телефон (USB/adb push/скачивание в Download); приложение при первом запуске просит выбрать файл через системный выбор файла (SAF, `ACTION_OPEN_DOCUMENT`) и копирует в `filesDir` (или сразу читает из `getExternalFilesDir()` — туда можно положить `adb push` без копирования; через файловые менеджеры на Android 11+ доступ к Android/data ограничен).
- Вывод/рекомендация: модель в APK НЕ класть — APK > 2 ГиБ упирается и в сборку (AGP, int-массивы), и в установку (int в VerityBuilder), а выигрыша по месту нет (рантайму всё равно нужна копия). Для экспериментов: модель — отдельным файлом (`adb push` в `getExternalFilesDir()`; приложение берёт путь оттуда; смена модели = замена файла без пересборки APK). Для владельца-пользователя: первый запуск → выбор файла модели (SAF) или скачивание по ссылке, с проверкой размера/хеша. Требование Р-34 «встроена в приложение» трактовать как «работает внутри приложения офлайн», а не «лежит внутри APK» — это вопрос владельцу.

## 4. Скорость и ОЗУ — проверено 2026-11-21
### 4.1 Официальная таблица LiteRT-LM (https://developers.google.com/edge/litert-lm/models/gemma-4 ; условия: prefill 1024, decode 256, контекст 2048; ТОЛЬКО текст)
- Gemma 4 E2B (2,58 ГБ): S26 Ultra CPU 557/47 ток/с, TTFT 1,8 с, пик 1733 МБ; GPU 3808/52, TTFT 0,3 с, 676 МБ CPU-памяти (+ GPU-память, не указана). iPhone 17 Pro CPU 532/25, 607 МБ. Raspberry Pi 5 CPU 133/8, TTFT 7,8 с (ориентир «слабого» ARM).
- Gemma 4 E4B (3,65 ГБ): S26 Ultra CPU 195/18, TTFT 5,3 с, 3283 МБ; GPU 1293/22, TTFT 0,8 с.
- Аудио-замеров (время аудиоэнкодера) Google НЕ публикует ни в карточке, ни в доке.
### 4.2 Не флагман (сторонний блог, 06.06.2026, https://pt13762104.github.io/2026/06/06/taking-a-look-at-gemma-4-e2b-qat/ — единичная точка, не проверено)
- MediaTek Dimensity 9000+ (2022, бывший флагман ≈ нынешний средний+): LiteRT-LM Gemma 4 E2B CPU prefill 152–185 ток/с, decode 15–16 ток/с; GPU Mali-G710 prefill 875, decode 19 ток/с. llama.cpp Q4_0 на том же CPU: prefill 81–104, decode 15–18 ток/с. Автор: «LiteRT-LM is the first viable option for phone inference».
- Gemma 3n E2B (карточка): S24 Ultra CPU 110/16, GPU 816/16.
- LFM3-Omni-2B LiteRT (карточка): Galaxy S26 GPU 1139/27, TTFT 0,93 с; CPU 557/26, пик 3,42 ГБ.
### 4.3 Оценка для нашей задачи (расчёт, НЕ замер)
- Вход: системный промпт с датой и таблицей 14 дней ≈ 400–600 токенов + описание инструмента ≈ 150 + звук 3–5 с × 25 ток/с (Gemma 4) = 75–125 → ≈ 650–900 токенов. Выход: вызов `add_task` ≈ 40–70 токенов.
- Флагман GPU (S26 Ultra): prefill ~0,2–0,3 с + decode ~1–1,5 с + аудиоэнкодер (?) → ~1,5–2 с.
- Средний (D9000+ уровень) GPU: ~1 с + ~3 с → ~4 с; CPU: ~5 с + ~4 с → ~9 с + энкодер.
- Ускорение: в LiteRT-LM `ConversationConfig.prefillPrefaceOnInit = true` — системный промпт и инструменты прогреваются заранее при создании разговора (исходник `Config.kt`), тогда на нажатие остаётся prefill только звука (~125 ток.) → экономия 70–85 % prefill. Также есть speculative decoding (MTP-драфтер в файле E2B — секция `tf_lite_mtp_drafter`) — ускоряет decode (насколько — не измерено). `heard` (пересказ фразы) удлиняет выход на ~10–20 токенов — цена ~1 с на среднем CPU.
- ОЗУ: E2B CPU пик ~1,7 ГБ (+ аудиоэнкодер грузится по требованию); практически нужен телефон с 6+ ГБ ОЗУ (оценка). E4B на CPU — 3,3 ГБ, только 8–12 ГБ телефоны.
- Время загрузки модели (холодный старт Engine) — в доке не указано; `cacheDir` ускоряет второй старт. НЕ измерено — критично для UX «удержал кнопку» (Engine надо держать загруженным или грузить заранее).

## 6. Запасной путь в два шага (офлайн): STT → текстовая модель с инструментом — 2026-11-21
- Ступень 1, варианты STT:
  - GigaAM v3 CTC с пунктуацией через sherpa-onnx — 163 МБ (из findings_voice_stt.md), лучший известный русский (ср. WER 9,1 по данным авторов); Android arm64/arm32/x86/x64; свой JNI/Kotlin-плагин (у sherpa-onnx есть готовый Kotlin API в репозитории). Скорость на телефоне — не измерена (CTC 220M, 3–5 с звука — ожидаемо доли секунды–1 с на CPU, НЕ проверено).
  - Qwen3-ASR-0.6B (Apache 2.0, 30 языков, русский ЕСТЬ): `litert-community/Qwen3-ASR-0.6B` — `qwen3_asr_0.6b_5s_i8.litertlm` 959 627 232 байт (окно 5 с), только через LiteRT Omni (C++ API, Kotlin нет); GGUF `ggml-org/Qwen3-ASR-0.6B-GGUF` Q8_0 804 749 248 + mmproj 214 392 480 ≈ 1,02 ГБ (llama.cpp mtmd). Тяжелее GigaAM в 6 раз, WER на русском не сверял.
- Ступень 2, текст → `add_task`:
  - Gemma 4 E2B `.litertlm` 2,59 ГБ (LiteRT-LM, ToolSet + ToolChoice) — та же модель, что в однокнопочном варианте; текстовый промпт ~600–800 токенов.
  - FunctionGemma 270M 289 МБ (LiteRT-LM) — быстро (S25 Ultra CPU 2238/154), но без дообучения 58 % на Mobile Actions, русский не проверен.
  - Qwen3-1.7B GGUF Q4_K_M 1,1 ГБ (llama.cpp, tools через chat template/GBNF) — средне.
- Суммарно: GigaAM 0,16 ГБ + Gemma 4 E2B 2,59 ГБ ≈ 2,75 ГБ (на 0,16 ГБ больше однокнопочного варианта, но русская речь распознаётся заведомо лучшей открытой моделью); GigaAM + Qwen3-1.7B ≈ 1,27 ГБ; GigaAM + FunctionGemma ≈ 0,45 ГБ.
- Время (оценка, не замер): STT ~0,5–1 с + текстовая модель (как в 4.3, но без аудиотокенов и без аудиоэнкодера) → на среднем телефоне GPU ~3–4 с, CPU ~6–9 с. Плюс двухшагового пути: распознанный текст = готовое поле `heard` (модели не нужно его генерировать — экономия 10–20 токенов вывода) и показывается пользователю для проверки; ошибку распознавания видно отдельно от ошибки разбора.
- Р-34 требует «без отдельного шага распознавания» — этот путь только для сравнения/как запасной, если русская речь у Gemma 4 окажется слабой.

## 7. Проверка на эмуляторе x86_64 — проверено 2026-11-21
- LiteRT-LM AAR 0.19.1 содержит `jni/x86_64/liblitertlm_jni.so` (26,9 МБ) → запуск на x86_64-эмуляторе возможен, бэкенд только CPU (XNNPACK). GPU-бэкенд в нашем эмуляторе (swiftshader, без GPU, OpenCL нет) не заработает — проверять только CPU; скорости эмулятора на хосте (16 ядер, KVM) с телефоном несравнимы.
- `llama-cpp-capacitor` заявляет x86_64; sherpa-onnx — x64 есть; MNN x86_64 — не проверено.
- ОЗУ эмулятора: для E2B на CPU нужен пик ~1,7 ГБ модели + система → AVD запускать с `-memory 6144`…`8192` (на хосте 62 ГБ — позволяет); хранилище: `-partition-size` / размер userdata ≥ 8 ГБ под файл модели 2,6 ГБ (по умолчанию у AVD может не хватить — не проверено для нашего образа).
- Микрофон: в нашем эмуляторе (docker-образ `secretar-emu-check`, emulator Pkg.Revision 37.3.10 — проверено `emulator -help`) есть флаги `-allow-host-audio` («Allows sending of audio from audio input devices. Otherwise, zeroes out audio») и `-audio <backend>`. Без флага микрофон отдаёт нули. В docker нет звуковой карты — для подачи звука в «микрофон» нужен PulseAudio внутри контейнера с виртуальным источником (module-pipe-source / null-sink.monitor, проигрывать туда WAV) — НЕ проверено, трудоёмко.
- Рекомендация для эмулятора: тестировать модель подачей WAV напрямую — `adb push phrase.wav /sdcard/Android/data/<pkg>/files/` и отладочный вызов плагина с `Content.AudioFile(path)` (или чтение файла → `AudioBytes`). Так проверяется вся цепочка «звук → модель → add_task → задача», кроме самого `AudioRecord`. Запись с микрофона проверять только на телефоне.
- Набор тестовых фраз: озвучить 20–30 русских команд (свой голос, разные дикторы, шум) в WAV 16 кГц моно PCM16; гонять и на эмуляторе (корректность), и на телефоне (скорость).

### 3.8 Инструменты для быстрых опытов без своего кода — проверено 2026-11-21
- LiteRT-LM: история версий (GitHub releases API): v0.8.0 (25.11.2025) — аудио/зрение во входе и Kotlin API; v0.10.1 (03.04.2026) — Gemma 4; v0.11.0 (07.05.2026) — MTP для Gemma 4 («>2x faster decode on mobile GPUs»); v0.12.0 — cache_dir для аудио-бэкенда; v0.13.0 (02.06.2026) — демо-приложение Android с мультимодальностью; v0.14.0 (08.07.2026) — CLI и Python запускаются прямо на Android (aarch64 и x86_64, напр. в Termux), автоматический выбор бэкенда для аудио, GPU/NPU-ускорение аудио; v0.19.1 (05.11.2026) — аудио Gemma 4 на GPU (Artisan). В репозитории есть prebuilt `android_arm64`/`android_x86_64` (`libGemmaModelConstraintProvider.so` — constrained decoding для Gemma).
- Google AI Edge Gallery (https://github.com/google-ai-edge/gallery , Apache 2.0, Android 12+): APK в GitHub Releases, последний 1.0.23 от 04.11.2026 (`ai_edge_gallery_app.apk` 87,7 МБ), режим «Audio Scribe» (транскрипция/перевод речи на устройстве), Mobile Actions на FunctionGemma, «load your own custom models». Позволяет владельцу БЕЗ нашего кода поставить APK на свой телефон и проверить, как Gemma 4 E2B/E4B понимает русскую речь и с какой скоростью (какие модели доступны для Audio Scribe — в README не указано, проверить в приложении).

## 8. Сводка (2026-11-21)

### 8.1 Таблица кандидатов «модель + рантайм»
| # | Модель + рантайм | Звук на вход | Вызов функций | Русская речь | Размер на устройстве | Скорость (замеры, текст) | ОЗУ | Лицензия | Интеграция в Capacitor |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Gemma 4 E2B + LiteRT-LM 0.19.1 (Kotlin) | да, подтверждено (секции audio_encoder в `.litertlm`, `Content.AudioBytes/AudioFile`) | нативно: ToolSet + `ToolChoice.Required` (constrained decoding) | заявлен многоязычный ASR, цифр по ru нет — не проверено | 2,59 ГБ (CPU-файл) / 2,34 ГБ (GPU-файл) | S26U GPU TTFT 0,3 с, 52 ток/с; CPU 47 ток/с; D9000+ CPU 15 ток/с, GPU 19 ток/с | CPU пик ~1,7 ГБ; GPU ~0,7 ГБ CPU-памяти | Apache 2.0 | свой Kotlin-плагин (готового с аудио нет); AAR arm64 + x86_64, minSdk 24 |
| 2 | Gemma 4 E4B + LiteRT-LM | да, подтверждено (секции в файле) | нативно | как у E2B, чуть лучше по FLEURS-агрегату | 3,66 ГБ / 3,31 ГБ (GPU) | S26U CPU 18 ток/с, TTFT 5,3 с; GPU 22 ток/с, 0,8 с | CPU пик ~3,3 ГБ | Apache 2.0 | как #1 (смена файла) |
| 3 | Gemma 4 E2B + llama.cpp mtmd (GGUF) | да (в офиц. списке mtmd) | Jinja-шаблон + tools, GBNF/json_schema | не проверено | 3,40 ГБ (Q4_0 2,84 + mmproj 0,56) | D9000+ CPU Q4_0: 15–18 ток/с, prefill 81–104 | ~3+ ГБ (оценка) | Apache 2.0 | `llama-cpp-capacitor` 0.1.5 (аудио заявлено, llama.cpp старее Gemma 4 — пересборка) или свой JNI |
| 4 | Gemma 4 E2B + MNN | да (audio.mnn в taobao-mnn) | только промптом+разбор (не заявлено) | не проверено | 3,51 ГБ без зрения | заявлено быстрее llama.cpp (данные авторов) | не изм. | Apache 2.0 (модель), MNN Apache | свой JNI, сложно |
| 5 | Gemma 3n E2B + LiteRT-LM/MediaPipe | да (Audio Scribe; в файле не проверено — gated) | не нативно | не заявлен | 3,66 ГБ | S24U CPU 16 ток/с | не изм. | Gemma ToU | `capacitor-gemma-3n` 1.0.0 (Cap 7, MediaPipe) |
| 6 | LFM3-Omni-2B + llama.cpp / LiteRT-LM | да | да: `<tool_call>` в тексте (разбор приложением; в LiteRT не нативно) | НЕТ в списке 19 языков речи | 1,32 ГБ (GGUF Q4_0+mmproj) / 3,23 ГБ (litertlm int8) | S26 GPU 27 ток/с, TTFT 0,93 с | пик 1,05+3,08 ГБ GPU / 3,4 ГБ CPU | LFM Open v1.0 (огранич. ≥10 млн $) | свой плагин |
| 7 | Ultravox 0.5 (Llama 3.2 1B) + llama.cpp | да | только промптом/грамматикой (1B) | косвенно да (CoVoST ru→en 24,1) | 2,18 ГБ (Q4_K_M 0,81 + mmproj f16 1,37) | не изм. | не изм. | MIT (+Llama 3.2 license) | `llama-cpp-capacitor`/свой JNI |
| 8 | Qwen2.5-Omni-3B + llama.cpp / MNN | да | не заявлен | не заявлен (en/zh/fr…) | 3,64 ГБ GGUF / ~2,73 ГБ MNN | не изм. | не изм. | qwen-research (некоммерч.) | MNN-приложение как образец; свой JNI |
| 9 | Voxtral Mini 3B + llama.cpp | да | да («из голоса») | НЕТ (8 языков без ru) | 3,19 ГБ | не изм. | не изм. | Apache 2.0 | свой JNI |
| 10 | Voxtral Mini 4B Realtime | да | НЕТ (чистый ASR) | да, FLEURS ru 6,0 % | 3,6 ГБ GGUF | — | — | Apache 2.0 | только как STT |
| 11 | Phi-4-multimodal + ORT GenAI | да | да | НЕТ | ~4,5–5,1 ГБ, мобильной сборки нет | — | — | MIT | нет пути |
| 12 | MiniCPM-o 4.5 | да | ? | ? | 4,8+ ГБ | — | — | Apache 2.0 | нет (слишком велика) |
| З | Запасной: GigaAM v3 (sherpa-onnx) → Gemma 4 E2B текстом (LiteRT-LM) | два шага | нативно | лучший открытый ru ASR (WER 9,1 по авторам) | 0,16 + 2,59 = 2,75 ГБ | +0,5–1 с на STT (оценка) | +~0,3 ГБ (оценка) | MIT + Apache | два своих плагина (sherpa-onnx Kotlin API + LiteRT-LM) |

### 8.2 Рекомендованные связки для первого эксперимента
1. **Gemma 4 E2B + LiteRT-LM 0.19.1 (Kotlin), основной кандидат.** Единственная найденная связка, где одновременно подтверждены: звук прямо в модель (аудиоэнкодер внутри обычного `.litertlm`, проверено по файлу), нативный вызов функций с принудительным `ToolChoice` (модель обязана вызвать `add_task`), Apache 2.0, AAR с minSdk 24 и x86_64 для нашего эмулятора, самый маленький файл среди аудиокандидатов с нативными tools (2,34–2,59 ГБ), лучшие опубликованные скорости, в т.ч. на не-флагмане (D9000+). Плагин — один Kotlin-класс рядом с `TaskNotifier`: `AudioRecord` 16 кГц моно → WAV → `Content.AudioBytes` + `ToolSet{add_task}` + `prefillPrefaceOnInit` для системного промпта.
2. **Gemma 4 E4B + тот же плагин** — для сравнения качества русской речи и дат (смена одного файла, без кода); цена — 3,3–3,7 ГБ и в 2–3 раза медленнее; реалистично только на 8–12 ГБ телефонах.
3. **Запасной двухшаговый: GigaAM v3 (sherpa-onnx) → Gemma 4 E2B текстом (тот же LiteRT-LM-плагин)** — включать, если на наборе русских фраз Gemma 4 «слышит» хуже, чем нужно. Почти тот же размер (+0,16 ГБ), распознанный текст сразу даёт поле `heard` и виден пользователю. (Нарушает букву Р-34 «без отдельного шага распознавания» — только с согласия владельца.)
- Экспериментальные «а вдруг»: LFM3-Omni-2B (1,3 ГБ GGUF, tool_call есть, русская речь не заявлена) и Ultravox 1B — через llama.cpp; ставить только после 1–2, т.к. требуют второго рантайма.
- Нулевой шаг (до кода, 10 минут владельца): поставить на свой телефон Google AI Edge Gallery 1.0.23 (APK с GitHub), скачать Gemma 4 E2B, проверить в Audio Scribe русскую речь и скорость.

### 8.3 Доставка модели — вывод
- Модель в APK НЕ класть: все аудиокандидаты > 2 ГиБ; сборка AGP падает на ассетах > 2 ГБ («Required array size too large», compressReleaseAssets), установка APK > 2 ГиБ упирается в `Math.toIntExact(apkSigningBlockOffset)` в `VerityBuilder` (int overflow, подтверждено по исходникам AOSP и отчётам «INSTALL_PARSE_FAILED_NO_CERTIFICATES … integer overflow»), а LiteRT-LM/llama.cpp принимают только путь к файлу → ассет всё равно копируется (×2 места).
- Делать: APK без модели + файл модели отдельно (для опытов — `adb push` в `getExternalFilesDir()`; для владельца — выбор файла через SAF при первом запуске с копированием в `filesDir`, либо скачивание по ссылке). Смена модели = замена файла, без пересборки. Формулировку Р-34 «встроена в приложение» стоит уточнить у владельца (работает внутри приложения офлайн vs физически внутри APK).

### 8.4 Что можно узнать только опытом на устройстве
- Качество распознавания РУССКОЙ речи у Gemma 4 E2B/E4B (цифр нет нигде): процент правильно понятых команд на наборе 20–30 своих фраз (разные голоса, шум, быстрая речь, числа «в 12», «в полпервого»).
- Точность дат: «в понедельник», «послезавтра», «через неделю», «каждый вторник» с таблицей 14 дней в промпте; доля верных `date`/`recurrence`/`priority`.
- Время аудиоэнкодера Gemma 4 на CPU и GPU (Google не публикует) и полное время «отпустил кнопку → задача создана» на флагмане и на среднем телефоне (Snapdragon 7-й серии / Dimensity 7xxx / Tensor G3).
- Холодная загрузка Engine (секунды?) и влияние `cacheDir`; держать ли Engine в памяти постоянно (ОЗУ, фоновые убийства процесса).
- Пиковое ОЗУ с включённым аудиоэнкодером («loaded on demand»), устойчивость на телефонах с 4–6 ГБ ОЗУ.
- Работает ли GPU-бэкенд (OpenCL) на конкретном телефоне владельца; разница CPU/GPU; нагрев и расход батареи.
- Устойчивость `ToolChoice.Required` + `ExperimentalFlags.enableConversationConstrainedDecoding` (экспериментальный флаг) — не ломает ли вывод.
- Проходит ли сборка/установка APK > 2 ГиБ с нашим AGP (если владелец всё же захочет модель внутри APK) — дешёвый опыт на эмуляторе с файлом-заглушкой.
- На эмуляторе (x86_64, CPU, без GPU) — только корректность цепочки подачей WAV-файла (`Content.AudioFile`); скорость и микрофон — только на телефоне.

ИССЛЕДОВАНИЕ ЗАВЕРШЕНО
