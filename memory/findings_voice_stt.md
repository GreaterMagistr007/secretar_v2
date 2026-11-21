# Голосовой ввод: распознавание речи (STT) русского — проверенные факты
Дата исследования: 2026-11-21. Исполнитель: агент-исследователь. Область: только speech-to-text (ИИ-разбор фразы — другой агент).
Контекст: Svelte 5 + TS, PWA (GitHub Pages) + Android APK (Capacitor 8.6.2, minSdk 24, targetSdk 36), свой Java-плагин TaskNotifier уже есть, сервера нет.
## План
1. Android SpeechRecognizer (русский, офлайн, без GMS, UI, RECORD_AUDIO, паузы)
2. Плагины Capacitor для распознавания vs свой Java-плагин
3. Web Speech API (Chrome Android/desktop, WebView — ключевой вопрос, Firefox/Safari)
4. getUserMedia/MediaRecorder в WebView Capacitor
5. Облачные STT (OpenAI, Groq, Deepgram, Yandex, Google, ElevenLabs)
6. Локальные модели (Vosk, whisper.cpp, sherpa-onnx+GigaAM, transformers.js)
7. Мультимодальные модели с аудио на вход (Gemini, OpenAI, Claude)
8. Сводная таблица
Пометка «не проверено» = не удалось подтвердить источником.

## 1. Системный распознаватель Android (android.speech.SpeechRecognizer)
Источник: https://developer.android.com/reference/android/speech/SpeechRecognizer и https://developer.android.com/reference/android/speech/RecognizerIntent (прочитано 2026-11-21).
- Есть с API 8. Это лишь клиент к системному сервису `RecognitionService`; движок даёт сторонний пакет (обычно Google: «Speech Services by Google»/приложение Google). Нет сервиса — `isRecognitionAvailable()` = false, `createSpeechRecognizer()` не работает.
- Док: «The implementation of this API is likely to stream audio to remote servers… not intended to be used for continuous recognition». То есть по умолчанию — облако Google, нужен интернет.
- Требуется разрешение `RECORD_AUDIO` (runtime). При targetSdk ≥ 30 обязателен `<queries><intent><action android:name="android.speech.RecognitionService"/></intent></queries>` в манифесте, иначе `isRecognitionAvailable()` возвращает false (там же в доке + подтверждения на SO/B4X: https://b4x.com/android/forum/threads/xspeechrecognizer-android-11-fix-isrecognitionavailable-always-false.138561).
- Методы — только с главного потока; `destroy()` обязателен.
- UI: `SpeechRecognizer.startListening()` работает БЕЗ системного окна (события через `RecognitionListener`: onReadyForSpeech, onRmsChanged, onPartialResults, onResults, onError). Системное окно («говорите…») показывает только `RecognizerIntent.ACTION_RECOGNIZE_SPEECH` через startActivityForResult. Выбор — за нами.
- Офлайн: `EXTRA_PREFER_OFFLINE` (API 23) — «Depending on the recognizer implementation, these values may have no effect» (подсказка, не гарантия).
- `createOnDeviceSpeechRecognizer()` (API 31) + `isOnDeviceRecognitionAvailable()` (API 31); бросает UnsupportedOperationException, если on-device недоступен. Ошибки API 31: `ERROR_LANGUAGE_NOT_SUPPORTED`(12), `ERROR_LANGUAGE_UNAVAILABLE`(13, «not downloaded yet»).
- `checkRecognitionSupport()` (API 33) — узнать установленные/доступные к скачиванию языки; `triggerModelDownload()` (API 33/34) — запросить скачивание модели языка («might trigger user interaction»).
- Наш minSdk 24 → для API 24–30 только обычный (облачный/как решит движок) распознаватель + PREFER_OFFLINE; on-device API — с проверкой версии.
- Паузы/длительность: `EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS`, `..._MINIMUM_LENGTH_MILLIS` — док: «extremely rare you'd want to specify… Depending on the recognizer implementation, these values may have no effect». На практике Google-движок сам завершает сессию после паузы ~1–2 с (не проверено официальным источником). Для короткой фразы «в понедельник маникюр в 12» это не проблема; `stopListening()` можно звать по кнопке.
- Русский: Google-распознаватель поддерживает ru-RU онлайн (общеизвестно; официальный перечень языков SpeechRecognizer не нашёл — НЕ проверено документом). Офлайн-пакет русского в «Офлайн-распознавании речи» приложения Google — по практике есть, официального перечня не нашёл — НЕ проверено.
- Альтернатива от Google: ML Kit GenAI Speech Recognition (`com.google.mlkit:genai-speech-recognition:1.0.0-alpha2`, alpha), https://developers.google.com/ml-kit/genai/speech-recognition/android: on-device, ru-RU в Basic (beta, API 31+) и Advanced (Pixel 10/11 и флагманские чипы с Gemini Nano). minSdk SDK 26 — выше нашего 24. Alpha, без SLA.
- Телефоны без GMS: HarmonyOS NEXT вообще не запускает APK; Huawei на EMUI/HarmonyOS 4.x без Google — системного RecognitionService Google нет; у китайских прошивок «каждый вендор свой сервис, нужно адаптироваться» (https://blog.csdn.net/jgw2008/article/details/109087204). Есть ли рабочий сервис на конкретном Xiaomi CN — зависит от прошивки; надёжных данных нет — НЕ проверено. Вывод: на устройствах без Google-сервисов системному распознаванию доверять нельзя, нужен фолбэк (облако или локальная модель).

## 2. Готовые плагины Capacitor для распознавания (данные npm registry и GitHub API на 2026-11-21)
### @capacitor-community/speech-recognition
- latest 7.0.1, релиз 2025-06-09 (до этого 7.0.0 — 2025-03-25). Версии под Capacitor 8 нет; peer `@capacitor/core >=7.0.0` (npm поставит и с 8, но официально не проверено).
- Открытые issue/PR (GitHub, 28 открытых): #126 «feat: support capacitor 8» (открыт с 2026-01-08), #129 «getDefaultProguardFile('proguard-android.txt') breaks builds with AGP 9.x» (2026-09-21), #127 «fix(android): stop() never resolves; stale recognizer after partialResults breaks restart» (2026-05-23). Последний push в репо 2026-05-29. 129 звёзд.
- Android: `SpeechRecognizer.createSpeechRecognizer` (облачный по умолчанию движок), опция `popup` → `ACTION_RECOGNIZE_SPEECH` (системное окно). On-device/PREFER_OFFLINE не используется. Java ~367 строк.
- Источник: https://github.com/capacitor-community/speech-recognition, https://registry.npmjs.org/@capacitor-community/speech-recognition
### @capgo/capacitor-speech-recognition (форк Capgo)
- latest 8.6.0, релиз 2026-11-17; peer `@capacitor/core >=8.0.0`; таблица совместимости: v8.x ↔ Capacitor 8 «Maintained». Лицензия MPL-2.0. 1 открытый issue, 19 звёзд, push 2026-11-18.
- Android: SpeechRecognizer; `useOnDeviceRecognition` (on-device распознаватель, только inline), `popup` (системное окно, несовместимо с on-device), partialResults, `allowForSilence`, `keepListeningMs` (Android 13+, сегментированная сессия; на Android ≤12 сессия кончается на первой паузе), `isOnDeviceRecognitionAvailable(locale)`, `getSupportedLanguages()` (на Android 13+ возвращает пустой список). Web: «Not available on web». Java ~56 КБ основного файла (крупный, много режимов).
- Источник: https://github.com/Cap-go/capacitor-speech-recognition (README), https://registry.npmjs.org/@capgo/capacitor-speech-recognition
### Свой Java-плагин (по аналогии с TaskNotifier)
- Минимум под нашу задачу (одна фраза, без окна): разрешение RECORD_AUDIO через `@Permission`, `<queries>` RecognitionService в манифесте, SpeechRecognizer на главном потоке, Intent с `EXTRA_LANGUAGE="ru-RU"`, `EXTRA_PARTIAL_RESULTS`, опционально `EXTRA_PREFER_OFFLINE`/`createOnDeviceSpeechRecognizer` (API 31+), RecognitionListener → resolve с текстом/reject с кодом ошибки, `notifyListeners` для частичных результатов и уровня звука, `destroy()`. Оценка (моя, по объёму community-плагина 367 строк с лишними режимами): ~150–220 строк Java + ~40 строк TS-обёртки. Плюс: нет внешней зависимости и проблем с AGP/Capacitor-апгрейдами, контроль над on-device. Минус: свои ошибки/краевые случаи (ERROR_RECOGNIZER_BUSY, повторный старт, stop без resolve — ровно баг #127 у community).

## 3. Web Speech API (SpeechRecognition / webkitSpeechRecognition)
### Поддержка по MDN browser-compat-data (main на 2026-11-21, https://github.com/mdn/browser-compat-data/blob/main/api/SpeechRecognition.json)
- Chrome desktop: `webkitSpeechRecognition` с 33, без префикса с 139. `processLocally` / `available()` / `install()` (on-device, движок SODA) — с 139.
- Chrome Android: SpeechRecognition — mirror (есть); `processLocally` и `available()` — `version_added: false` (on-device в Chrome Android нет).
- WebView Android: `webkitSpeechRecognition` с 37 (префиксный).
- Firefox desktop: SpeechRecognition с 160 (на 2026-11 — бета; коммит MDN «Updates for Firefox 160 beta», 2026-11-02); Firefox Android: on-device нет (bugzil.la/1244242).
- Safari / iOS: `webkitSpeechRecognition` с 14.1; `processLocally` нет.
- Chrome Android, практика (блог 2026-05-11, https://bagrounds.org/ai-blog/2026-05-11-1-word-meter-android-rca): `available({processLocally:true})` для en-US → «unavailable»; Samsung Internet — только legacy `webkitSpeechRecognition`, облако.
- Интернет: в Chrome (desktop и Android) по умолчанию — облако Google, без сети не работает. On-device только на desktop Chrome 139+ через `processLocally=true` + `install()`; перечень языков SODA официально не найден, русский в on-device — НЕ проверено.
### КЛЮЧЕВОЕ: работает ли в Android System WebView (внутри Capacitor-APK)
Ответ по исходникам Chromium (main, прочитано 2026-11-21) — ДА, поддерживается, но с условиями:
- `android_webview/lib/aw_main_delegate.cc`: «WebView does not currently support Web Speech Synthesis API, but it does support Web Speech Recognition API (crbug.com/487255).» — синтез выключен флагом, распознавание включено. https://chromium.googlesource.com/chromium/src/+/refs/heads/main/android_webview/lib/aw_main_delegate.cc
- `android_webview/browser/aw_speech_recognition_manager_delegate.cc` (с 2018): делегат WebView, `CheckRecognitionIsAllowed` → `ask_user=true, allowed=true` — разрешение спрашивается через механизм медиа-разрешений WebView (→ `onPermissionRequest` хост-приложения; у Capacitor он есть, см. п.4).
- `content/public/android/java/.../SpeechRecognitionImpl.java`: реализация вызывает `android.speech.SpeechRecognizer` в процессе ХОСТ-приложения (`ContextUtils.getApplicationContext()`), и ТОЛЬКО с провайдером Google: на Android 12+ — пакет `com.google.android.tts` («Speech Services by Google»), на старых — `com.google.android.googlequicksearchbox` (приложение Google, версия ≥ 300207030). `initialize()` возвращает false, если `isRecognitionAvailable()` = false или Google-провайдер не найден через `queryIntentServices`.
- Следствия для нашего APK: (1) нужен `<queries><intent><action android:name="android.speech.RecognitionService"/></intent></queries>` в НАШЕМ AndroidManifest (иначе package visibility скрывает сервис). Практика: WallPanel, Android 12, targetSdk 33, 2026-10-25 — без `<queries>` «E/SpeechRecognizer: Bind to system recognition service failed with error 10», страница «бесконечно слушает» без события ошибки; исправлено добавлением `<queries>` (https://github.com/alx-uta/wallpanel-android/issues/36). (2) нужен RECORD_AUDIO (+ MODIFY_AUDIO_SETTINGS для Capacitor, п.4). (3) на телефонах без Google-сервисов не работает вообще. (4) распознавание облачное (Google), офлайна нет.
- Противоречащий практический отчёт: PR happa #267 (2026-11-01, https://github.com/DDancingDeath/happa/pull/267): «The Android System WebView that Capacitor runs in has no working Web Speech API (webkitSpeechRecognition is missing / does nothing; Chromium issue 41172064)» — автор сам не уверен («missing / does nothing»), про `<queries>` в контексте WebView не упоминает, перешёл на нативный плагин. Вероятная причина «does nothing» — отсутствие `<queries>` (как у WallPanel). Вывод: по коду — работает при `<queries>` + разрешениях; на реальном устройстве НЕ проверено, нужен тест на нашем APK (5 минут: `'webkitSpeechRecognition' in window` + `lang='ru-RU'`).
- В PWA в Chrome Android работает (облако Google), в Firefox Android — нет, в Safari iOS — да (webkit-префикс).

## 4. Запись звука в WebView Capacitor (getUserMedia / MediaRecorder)
- Capacitor `BridgeWebChromeClient.onPermissionRequest` (исходник ionic-team/capacitor main, прочитан 2026-11-21; актуальная версия @capacitor/android 8.6.2 от 2026-11-12): при `android.webkit.resource.AUDIO_CAPTURE` запрашивает у Android ОБА разрешения `MODIFY_AUDIO_SETTINGS` и `RECORD_AUDIO`; если хоть одно не выдано → `request.deny()`. То есть Capacitor обрабатывает onPermissionRequest сам, нам код не нужен. https://github.com/ionic-team/capacitor/blob/main/android/capacitor/src/main/java/com/getcapacitor/BridgeWebChromeClient.java
- Ловушка: Android молча отказывает в разрешении, не объявленном в манифесте. Если в манифесте только RECORD_AUDIO — `getUserMedia` падает с `NotAllowedError`, хотя системное разрешение на микрофон выдано. Нужно объявить ОБА: `<uses-permission android:name="android.permission.RECORD_AUDIO"/>` и `<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS"/>` (последнее — normal, без диалога). Подтверждено кодом выше и практикой: https://github.com/unfoldingWord/tc-mobile/pull/334 (Capacitor 8.5.1, 2026-09-14).
- `getUserMedia` требует secure context; Capacitor отдаёт приложение с `https://localhost` — условие выполнено (по умолчанию androidScheme https с Capacitor 6; не перепроверял в доке — НЕ проверено для 8).
- Формат MediaRecorder в Chromium/WebView: гарантированно `audio/webm;codecs=opus`; `audio/mp4` (AAC) — в новых Chrome при наличии платформенного энкодера (intent to ship: https://groups.google.com/a/chromium.org/g/blink-dev/c/p1OMVj1FrMI); точная версия для Android не установлена. Правильно — выбирать через `MediaRecorder.isTypeSupported()`. webm/opus принимают OpenAI, Groq, Deepgram, ElevenLabs, Gemini (см. п.5,7); Yandex SpeechKit принимает OggOpus/LPCM, не webm — НЕ проверено, см. п.5.
- Это путь для облачного STT и для локальной модели в WebView: и в APK, и в PWA (Chrome/Firefox/Safari) один код.

## 5. Облачное распознавание русского
Фраза-задача ~3–5 с аудио. Цены — с официальных страниц на 2026-11-21. CORS проверен мной: preflight `OPTIONS` с `Origin: https://example.github.io`, `Access-Control-Request-Headers: authorization,content-type` (2026-11-21).
| Сервис | Цена | Русский | CORS (вызов из браузера) | Доступность из РФ |
|---|---|---|---|---|
| OpenAI gpt-4o-mini-transcribe | $0.003/мин | да (в т.ч. FLEURS), отдельной цифры WER для ru не нашёл | да (allow-origin эхо, authorization разрешён) | API официально НЕ поддерживает Россию и Беларусь (Казахстан — да): https://help.openai.com/en/articles/5347006 |
| OpenAI gpt-4o-transcribe | $0.006/мин | да | да | то же |
| OpenAI gpt-transcribe (новая) | $0.0045/мин | не проверено | да (тот же эндпоинт) | то же |
| OpenAI whisper-1 | $0.006/мин | да | да | то же |
| Groq whisper-large-v3-turbo | $0.04/час (≈$0.00067/мин), минимум 10 с на запрос | да (Whisper) | не проверено: с моей машины любой запрос (даже /models без ключа) → 403 Forbidden — похоже на гео/Cloudflare-блок | Россия в списке ограниченных регионов (сотрудники Groq: https://community.groq.com/t/what-geographic-regions-does-groqcloud-serve/833) |
| Deepgram Nova-3 (pre-recorded) | $0.0043/мин monolingual, $0.0052 multilingual; streaming $0.0048/$0.0058; $200 бесплатного кредита без карты | да: ru в Nova-3 mono/multi, Nova-2, Flux Multilingual (https://developers.deepgram.com/docs/models-languages-overview) | да (allow-origin эхо) | не проверено |
| ElevenLabs Scribe v2/v3 | $0.20/час по странице https://elevenlabs.io/pricing/api (цифра подозрительно низкая, перепроверить при выборе); realtime $0.22/час | да (заявлено) | да (`*`) | не проверено |
| Yandex SpeechKit | синхронное/потоковое 0,1626 ₽ за 15 с с НДС (минимум 15 с, т.е. фраза 4 с = 0,16 ₽); асинхронное 0,1515 ₽ | родной язык, сильная сторона | НЕТ признаков: preflight → 401 без CORS-заголовков; на практике нужен прокси | да, оплата в рублях |
| Google Cloud STT | $0.016/мин (v1 / standard, первые 500k мин), dynamic batch $0.003/мин — по кэшам страницы, живую не загрузил: НЕ проверено | да | не проверено (preflight → 403 «Sorry…» антибот Google); ключ API в браузере — плохая практика | не проверено |
Источники цен: https://developers.openai.com/api/docs/pricing, https://console.groq.com/docs/model/whisper-large-v3-turbo, https://deepgram.com/pricing, https://elevenlabs.io/pricing/api, https://aistudio.yandex.ru/docs/ru/speechkit/pricing, https://cloud.google.com/speech-to-text/pricing.
- Yandex синхронное API v1: до 30 с, до 1 МБ, 1 канал, форматы LPCM и OggOpus (https://aistudio.yandex.ru/docs/ru/speechkit/stt/request) — webm из Chrome MediaRecorder напрямую не подходит (нужен перепак в ogg или PCM через WebAudio).
- Качество русского: Whisper large-v3 — 5,7% WER на FLEURS ru (по данным конкурента ElevenLabs, https://elevenlabs.io/speech-to-text/russian — источник заинтересованный). gpt-4o-transcribe по заявлению OpenAI лучше Whisper на FLEURS в целом (https://openai.com/ru-RU/index/introducing-our-next-generation-audio-models/), русской цифры не нашёл.
- Задержка: для 3–5 с аудио у всех batch-API порядка сотен мс – 1–2 с; конкретных измерений по ru не нашёл — НЕ проверено.
- Ключ API: сервера у нас нет. Вызов из браузера с ключом в коде = ключ утечёт (PWA публичная на GitHub Pages). Варианты: пользователь вводит свой ключ в настройках (хранить локально) или прокси/временные токены (Deepgram и OpenAI Realtime умеют эфемерные токены, но их выпуск требует сервера). Это архитектурное ограничение, а не техническое.

## 6. Локальные модели на телефоне (офлайн, без облака)
### Vosk (Kaldi), https://alphacephei.com/vosk/models (прочитано 2026-11-21)
- `vosk-model-small-ru-0.22` — 45 МБ, «Lightweight wideband model for Android/iOS and RPi», Apache 2.0. WER: 22.71 (openstt audiobooks), 31.97 (openstt youtube), 29.89 (sova devices), 11.79 (golos crowd). Т.е. каждое 4–5-е слово с ошибкой на «живой» речи — слабо.
- Большая `vosk-model-ru-0.42` — 1.8 ГБ, «for servers» (WER 4.4 golos crowd, 17.9 sova devices) — для телефона не годится.
- Есть Capacitor-плагин `capacitor-offline-speech-recognition` 3.0.0 (2025-11-17, MIT, peer `@capacitor/core >=7.0.0`, Vosk Android SDK 0.3.70, minSdk 24, модели ~50 МБ скачиваются по требованию; README: «Dependencies: Capacitor: ^5.0.0» — противоречие с peer, совместимость с Capacitor 8 НЕ проверена). https://github.com/GaudRavi09/capacitor-offline-speech-recognition
- В браузере: `vosk-browser` 0.0.8 (WASM, последний релиз 2022-12-25, заброшен), форк `@lichess-org/vosk-browser` 0.0.3 (2025-06-17).
### whisper.cpp, https://github.com/ggml-org/whisper.cpp (последний релиз v1.9.5, 2026-10-06)
- Размеры моделей (README): tiny 75 MiB (~273 МБ RAM), base 142 MiB (~388 МБ), small 466 MiB (~852 МБ), medium 1.5 GiB.
- Android: есть пример `examples/whisper.android` (JNI); для React Native — whisper.rn. Capacitor-плагин `capacitor-whisper` 0.2.1 (2026-08-15, MIT, peer `@capacitor/core >=8.0.0`, репозиторий в npm не указан, 2 версии — незрелый, НЕ проверял).
- Качество русского: у Whisper качество сильно зависит от размера; tiny/base по-русски заметно хуже large (точных цифр WER ru для tiny/base из официального источника не нашёл — НЕ проверено). Скорость на среднем Android: надёжных измерений не нашёл — НЕ проверено (ориентир по опыту сообщества: tiny/base — секунды на короткую фразу на ARM64, small — заметно дольше; цифрой не подтверждено).
### sherpa-onnx + GigaAM (Сбер)
- sherpa-onnx: Apache-2.0, v2.0.2 от 2026-11-19, 16k звёзд; Android (arm64/arm32/x86/x64), WebAssembly, Flutter, community-обёртка React Native; Capacitor — нет готового плагина (npm-поиск 2026-11-21 ничего не нашёл). https://github.com/k2-fsa/sherpa-onnx
- GigaAM: MIT, https://github.com/salute-developers/GigaAM; v3 (HuBERT-CTC, 700k ч предобучения, 4000 ч ASR), e2e-варианты с пунктуацией и нормализацией (2025-11), Multilingual (2026-06). 220M–600M параметров.
- Готовые модели sherpa-onnx (релиз `asr-models`, размеры архивов): `sherpa-onnx-nemo-ctc-giga-am-v3-russian-2025-12-16` 163 МБ; `...-ctc-punct-giga-am-v3-russian...` 163 МБ (с пунктуацией); `...transducer-giga-am-v3...` 167 МБ; v2 ctc 167 МБ. Лёгкие альтернативы: `sherpa-onnx-streaming-zipformer-small-ru-vosk-int8-2025-08-16` 24 МБ; `sherpa-onnx-zipformer-ru-int8-2025-04-20` 60 МБ; `sherpa-onnx-streaming-t-one-russian-2025-09-08` 128 МБ.
- WER GigaAM (evaluation.md, https://github.com/salute-developers/GigaAM/blob/main/evaluation.md), среднее по 10 русским наборам: V3 CTC 9.1, V3 RNNT 8.3, V2 CTC 11.1, T-One+LM 16.3, Whisper (large-v3) 21.0. Golos Crowd: V3 CTC 2.8 vs Whisper 19.0; Common Voice 19: 1.3 vs 5.5. Источник — сами авторы GigaAM (заинтересованы), но таблица подробная.
- Скорость GigaAM на телефоне — НЕ проверено (CTC 220M на CPU ARM для фразы 3–5 с — предположительно ~1 с, цифрой не подтверждено).
### Whisper через transformers.js прямо в WebView/браузере
- Работает (официальный гайд: whisper с `device:'webgpu'`, https://huggingface.co/docs/transformers.js/en/guides/webgpu), но мобильных замеров скорости не нашёл — НЕ проверено.
- WebGPU в Android WebView: «WebGPU Compatibility mode» — Shipping on Android/WebView 146 (intent to ship, январь 2026, https://groups.google.com/a/chromium.org/g/blink-dev/c/N3RlLGCOTJ4), «where hardware support is available» (OpenGL ES 3.1). Поддержка на конкретном среднем телефоне не гарантирована.
- WASM-многопоточность требует SharedArrayBuffer → заголовки COOP/COEP; GitHub Pages собственные заголовки не задаёт (обход — service worker типа coi-serviceworker) — НЕ проверено в нашем контексте. Плюс скачивание модели 40–150 МБ в кэш браузера при первом использовании.
- Оценка: для одной короткой фразы теоретически реально (whisper-tiny/base), но качество русского у tiny/base низкое, а скорость на среднем телефоне без WebGPU — под вопросом. Самый рискованный вариант.

## 7. Мультимодальные модели: аудио на вход (распознавание + разбор одним вызовом)
### Gemini (https://aistudio.google.com/docs/audio, https://aistudio.google.com/docs/pricing — прочитано 2026-11-21)
- Аудио = 32 токена/с (1 мин = 1920 токенов). Форматы: WAV, MP3, AIFF, AAC, OGG, FLAC, M4A, Opus, WebM и др. — webm/opus из MediaRecorder подходит напрямую. Inline-запрос до 20 МБ.
- Цены аудио-входа (paid, за 1M токенов): gemini-3.5-flash-lite $0.30 (вывод $2.50); gemini-3.1-flash-lite $0.50 (вывод $1.50); gemini-3-flash-preview $1.00 (вывод $3.00); gemini-2.5-flash-lite $0.30 (вывод $0.40); gemini-3.6-flash / 3.8-flash — единая цена входа $0.75 до 2026-12-31 (вывод $3.75), с 2027-01-01 дорожают. У всех есть free tier. gemini-2.5-flash устарел, с 2026-12-01 перенаправляется на gemini-3.5-flash-lite.
- Расчёт (мой): фраза 5 с = 160 аудио-токенов → на 3.5-flash-lite ≈ $0.00005 за вход + текст промпта/инструментов и ответ. Дешевле любого STT.
- Function calling + аудио в одном запросе — штатно (generateContent с inline_data audio + tools); отдельной проверки на русском не делал. Список языков транскрипции на странице не указан — русский НЕ подтверждён документом (на практике работает — не проверено мной).
- CORS: preflight на generativelanguage.googleapis.com → разрешён (эхо origin, authorization/content-type) — из браузера вызвать можно; ключ при этом виден клиенту.
- Доступность: Россия и Беларусь НЕ в списке доступных регионов Gemini API (Казахстан — да): https://aistudio.google.com/docs/available-regions
### OpenAI audio-модели (https://developers.openai.com/api/docs/pricing)
- Аудио-вход за 1M токенов: gpt-audio / gpt-audio-1.5 / gpt-realtime / gpt-realtime-2.x — $32; gpt-audio-mini / gpt-realtime-mini / gpt-realtime-2.1-mini — $10. Сколько аудио-токенов в минуте у OpenAI — в прочитанном не указано, НЕ проверено. Принимают аудио + tools в одном запросе (Chat Completions `input_audio` / Realtime). Россия не поддерживается (п.5).
- Дешёвая альтернатива «двумя вызовами»: gpt-4o-mini-transcribe ($0.003/мин) → текстовая модель с tools.
### Claude API — принимает ли аудио: НЕТ
- Справочник Messages API (https://platform.claude.com/docs/en/api/messages): типы блоков пользовательского сообщения — text, image (jpeg/png/gif/webp), document, search_result, tool_result и служебные; аудио-блока нет (прочитана первая часть страницы, слово «audio» не встречается).
- Явно: страница OpenAI SDK compatibility (https://platform.claude.com/docs/en/cli-sdks-libraries/libraries/openai-sdk): «Audio and file inputs are not supported. A request that includes an `input_audio` or `file` content part returns a 400 error.»
- Обзор возможностей (https://platform.claude.com/docs/en/build-with-claude/overview): модальности — Vision (images), PDF support; аудио нет. Официальный cookbook голосового ассистента (https://platform.claude.com/cookbook/third-party-elevenlabs-low-latency-stt-claude-tts) делает STT внешним сервисом (ElevenLabs), Claude получает текст.
- Вывод: если ИИ-разбор на Claude — STT обязательно отдельным шагом.

## 8. Сводная таблица
| Способ | В APK (Capacitor) | В браузере (PWA) | Офлайн | Цена | Качество русского | Размер | Сложность внедрения |
|---|---|---|---|---|---|---|---|
| Нативный SpeechRecognizer (свой Java-плагин или @capgo 8.6.0) | да, если есть Google-сервисы | нет | частично: on-device API 31+, PREFER_OFFLINE — подсказка | бесплатно | хорошее (Google), цифр нет | 0 | низкая: ~150–220 строк Java своим плагином или готовый @capgo |
| Web Speech API (`webkitSpeechRecognition`) | по исходникам Chromium — да (нужны `<queries>`, RECORD_AUDIO+MODIFY_AUDIO_SETTINGS, Google-сервисы); на устройстве НЕ проверено, есть противоречащий отчёт | Chrome Android/desktop, Safari — да; Firefox desktop с 160; Firefox Android — нет | нет (облако Google); on-device только desktop Chrome 139+ | бесплатно | хорошее (Google) | 0 | минимальная: ~30 строк TS, без натива |
| Облако STT: OpenAI gpt-4o-mini-transcribe | да (MediaRecorder webm) | да, CORS есть | нет | $0.003/мин | хорошее | 0 | низкая, но ключ API на клиенте; РФ не поддерживается |
| Облако: Groq whisper-large-v3-turbo | да | CORS не проверен | нет | $0.04/час, мин. 10 с | хорошее (Whisper large-v3) | 0 | низкая; РФ заблокирована |
| Облако: Deepgram Nova-3 | да | да, CORS есть | нет | $0.0043/мин, $200 кредита | ru поддержан, цифр нет | 0 | низкая; ключ на клиенте |
| Облако: Yandex SpeechKit | да | нет CORS → нужен прокси | нет | 0,16 ₽ за фразу (мин. 15 с) | сильное (родной язык) | 0 | средняя: прокси + перепак в OggOpus/LPCM |
| Облако: ElevenLabs Scribe | да | да, CORS `*` | нет | $0.20/час по странице (перепроверить) | заявлено хорошее | 0 | низкая; ключ на клиенте |
| Gemini Flash-Lite (аудио → сразу tool call) | да | да, CORS есть | нет | ~$0.00005 за 5-с фразу (3.5-flash-lite) | не подтверждено докой | 0 | низкая, заодно заменяет разбор; РФ не поддерживается |
| Vosk small-ru (плагин capacitor-offline-speech-recognition) | да (совместимость с Cap 8 не проверена) | WASM-порт заброшен | да | бесплатно | слабое (WER 12–32%) | 45 МБ | средняя |
| sherpa-onnx + GigaAM v3 | да, но свой JNI-плагин (готового Capacitor нет) | WASM есть у sherpa-onnx (скорость не проверена) | да | бесплатно | лучшее среди открытых (ср. WER 9.1 vs Whisper 21.0 по данным авторов) | ~163 МБ | высокая |
| whisper.cpp (capacitor-whisper 0.2.1, незрелый) | да | нет | да | бесплатно | tiny/base — слабое, small — лучше (цифр нет) | 75–466 МБ | средняя–высокая |
| transformers.js Whisper в WebView | теоретически | да | да (после загрузки модели) | бесплатно | tiny/base — слабое | 40–150 МБ загрузки | средняя; скорость на среднем телефоне не проверена — высокий риск |

## 9. Главное для решения
- Claude API аудио не принимает (официальная дока) → при разборе на Claude STT — отдельный шаг.
- Самый дешёвый по внедрению путь, общий для APK и PWA: Web Speech API (`webkitSpeechRecognition`, lang ru-RU). Для APK по коду Chromium нужно только добавить `<queries>` RecognitionService и `MODIFY_AUDIO_SETTINGS`+`RECORD_AUDIO` в манифест. Обязателен проверочный прогон на реальном телефоне — это главный открытый вопрос.
- Если в WebView не заработает — нативный SpeechRecognizer: готовый @capgo/capacitor-speech-recognition 8.6.0 (Capacitor 8, поддерживается) или свой плагин ~200 строк рядом с TaskNotifier. @capacitor-community/speech-recognition для Capacitor 8 официально не выпущен (последний 7.0.1 от 2025-06-09).
- Оба системных варианта не работают без Google-сервисов и (почти) без интернета. Фолбэк для таких телефонов — облако (MediaRecorder → API; проблема ключа на клиенте и недоступности OpenAI/Groq/Gemini из РФ) или локальная GigaAM через sherpa-onnx (лучшее качество русского, но ~163 МБ модели и свой JNI-плагин — дорого).
- Открытые проверки на устройстве: (1) `webkitSpeechRecognition` в нашем APK; (2) русский офлайн-пакет Google (`isOnDeviceRecognitionAvailable`, `checkRecognitionSupport`) на телефоне владельца; (3) страна/способ оплаты владельца для облака.
