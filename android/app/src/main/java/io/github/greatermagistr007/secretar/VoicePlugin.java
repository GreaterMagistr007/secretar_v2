package io.github.greatermagistr007.secretar;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.net.Uri;
import android.os.Build;
import android.os.SystemClock;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.google.ai.edge.litertlm.Backend;
import com.google.ai.edge.litertlm.BenchmarkInfo;
import com.google.ai.edge.litertlm.Content;
import com.google.ai.edge.litertlm.Contents;
import com.google.ai.edge.litertlm.Conversation;
import com.google.ai.edge.litertlm.ConversationConfig;
import com.google.ai.edge.litertlm.Engine;
import com.google.ai.edge.litertlm.EngineConfig;
import com.google.ai.edge.litertlm.ExperimentalFlags;
import com.google.ai.edge.litertlm.Message;
import com.google.ai.edge.litertlm.OpenApiTool;
import com.google.ai.edge.litertlm.SamplerConfig;
import com.google.ai.edge.litertlm.SpeculativeDecodingConfig;
import com.google.ai.edge.litertlm.SpeculativeDecodingMode;
import com.google.ai.edge.litertlm.ThinkingConfig;
import com.google.ai.edge.litertlm.ToolCall;
import com.google.ai.edge.litertlm.ToolKt;
import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.json.JSONObject;

/**
 * Голосовая кнопка (решения Р-34, Р-37): запись с микрофона, модель Gemma 4 E2B на LiteRT-LM,
 * журнал нажатий. Системный промпт и описание инструмента собирает веб-часть
 * (src/lib/voice-command.ts) — плагин только исполняет: так весь текст, который видит модель,
 * лежит в одном месте и покрыт тестами.
 *
 * Движок живёт в статических полях, а не в экземпляре плагина: плагин пересоздаётся вместе
 * с Activity, а загрузка модели занимает секунды. Загрузка и инференс идут в одном фоновом
 * потоке по очереди: нажатие во время загрузки ждёт её конца, а не падает.
 *
 * Базовый разговор: системный промпт дня с описанием инструмента читается моделью один раз
 * (после загрузки и при смене текста), на нажатие — копия готового разговора ({@code clone()})
 * и сообщение нажатия со звуком. Не скопировался — новый разговор, как до этого.
 *
 * Описание — docs/mechanic_voice.md, раздел «Голосовая кнопка».
 */
@CapacitorPlugin(
        name = "Voice",
        permissions = @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "microphone"))
public class VoicePlugin extends Plugin {

    static final String TAG = "SecretarVoice";

    /** Каталог журнала и записей в {@code getExternalFilesDir}; исключён из резервной копии. */
    static final String LOG_DIR = "voice-logs";

    static final String LOG_FILE = "voice-log.jsonl";

    private static final String ZIP_PREFIX = "secretar-voice-log-";

    /** Предел записи: модель принимает до 30 с звука. */
    private static final int MAX_RECORD_BYTES = 30 * WavFile.SAMPLE_RATE * WavFile.BYTES_PER_SAMPLE;

    /**
     * Окно контекста (размер KV-кэша): промпт с описанием инструмента — около 1000 токенов, 30 с
     * звука — 750 (25 ток/с), сообщение нажатия с разметкой — около 30, ответ — до 128: около 1910.
     * Модель компилируется под это число: 2048 вместо 4096 ускоряет и чтение, и генерацию.
     */
    private static final int MAX_NUM_TOKENS = 2048;

    /**
     * Предел ответа на один ход: ход — один вызов инструмента (42–65 токенов на записях владельца)
     * или «Готово»; задачи фразы идут отдельными ходами, поэтому предел на ход не растёт.
     */
    private static final int MAX_OUTPUT_TOKENS = 128;

    /**
     * Сколько раз отдать модели ответ инструмента за нажатие: до 5 задач из одной фразы. Предел —
     * от зацикливания: модель может вызывать инструмент снова и снова.
     */
    private static final int MAX_TOOL_ROUNDS = 4;

    /**
     * Токенов ответа на прогреве: несколько, а не один — чтобы драфтер MTP отработал хотя бы шаг
     * и его отказ случился при загрузке (с откатом), а не на первом нажатии.
     */
    private static final int WARM_UP_OUTPUT_TOKENS = 8;

    private static final String GPU = "GPU";

    private static final String CPU = "CPU";

    /** Жадный выбор: topK 1, topP 1, температура 0 — один и тот же звук даёт один и тот же ответ. */
    private static final int TOP_K = 1;

    private static final double TOP_P = 1.0;

    private static final double TEMPERATURE = 0.0;

    private static final int SEED = 0;

    private static final long FIRST_BUFFER_TIMEOUT_MS = 1000;

    private static final String ABSENT = "absent";

    private static final String LOADING = "loading";

    private static final String READY = "ready";

    private static final String ERROR = "error";

    private static final ExecutorService ENGINE_THREAD = Executors.newSingleThreadExecutor();

    private static final Object ENGINE_LOCK = new Object();

    private static final Object LOG_LOCK = new Object();

    private static Engine engine;

    private static String engineFile;

    private static String engineState = ABSENT;

    private static String engineBackend;

    /** Устройство, выбранное пользователем для текущей загрузки: GPU или CPU. */
    private static String engineDevice;

    /** Режим MTP загруженного движка: ON или OFF (откат); null — не загружен. */
    private static String engineMtp;

    private static long engineLoadMs;

    private static String engineError;

    /** Номер последней запрошенной загрузки: результат прежней (сменили устройство) отбрасывается. */
    private static int loadGeneration;

    /** Базовый промпт и инструмент, которые нужны сейчас (последние от веб-части). */
    private static String wantedBasePrompt;

    private static String wantedBaseTool;

    /** Базовый разговор с прочитанным промптом; создаётся и копируется только в фоновом потоке. */
    private static Conversation base;

    /** Промпт и инструмент, прочитанные в {@code base}. */
    private static String basePrompt;

    private static String baseTool;

    /** Когда и за сколько прочитана база, почему, замеры; ошибка — {@code error}. Не меняется после записи. */
    private static JSObject baseInfo;

    private AudioRecord recorder;

    private Thread reader;

    private volatile boolean recording;

    private ByteArrayOutputStream pcm;

    private volatile boolean truncated;

    private volatile int readError;

    private long recordStartedAt;

    /**
     * Загружает модель {@code { fileName, size, device, systemPrompt?, tool? }} в фоне на устройстве
     * {@code device} (GPU или CPU), если файл скачан и проверен загрузчиком (ModelDownloaderPlugin),
     * и отдаёт состояние движка. Повторный вызов во время загрузки или при загруженной модели
     * ничего не запускает; после ошибки и при смене устройства загрузка повторяется.
     * {@code systemPrompt} и {@code tool} — базовый промпт дня: читается после загрузки, а если
     * модель готова и текст изменился (сменился день) — сразу в фоне.
     */
    @PluginMethod
    public void load(PluginCall call) {
        String fileName = call.getString("fileName");
        // optLong, а не getLong: getLong Capacitor отдаёт null для числа, уместившегося в int.
        long size = call.getData().optLong("size", 0);
        String device = call.getString("device", GPU);
        String prompt = call.getString("systemPrompt");
        String tool = call.getString("tool");

        if (!ModelDownloadState.isSafeFileName(fileName) || size <= 0 || !(GPU.equals(device) || CPU.equals(device))) {
            call.reject("Неверные параметры модели");

            return;
        }

        File model = modelFile(fileName);
        boolean verified = model != null
                && model.length() == size
                && fileName.equals(getContext()
                        .getSharedPreferences(ModelDownloaderPlugin.PREFS, Context.MODE_PRIVATE)
                        .getString(ModelDownloaderPlugin.KEY_VERIFIED, null));

        synchronized (ENGINE_LOCK) {
            if (prompt != null && tool != null) {
                wantedBasePrompt = prompt;
                wantedBaseTool = tool;
            }

            if (!verified) {
                if (engine != null || LOADING.equals(engineState)) {
                    // Модель удалили или заменили: движок держит отображение удалённого файла.
                    ENGINE_THREAD.execute(VoicePlugin::closeEngine);
                }

                engineState = ABSENT;
                engineFile = null;
            } else if (!fileName.equals(engineFile) || ABSENT.equals(engineState) || ERROR.equals(engineState)
                    || !device.equals(engineDevice)) {
                engineState = LOADING;
                engineFile = fileName;
                engineDevice = device;
                engineError = null;

                String path = model.getAbsolutePath();
                Context context = getContext().getApplicationContext();
                int generation = ++loadGeneration;

                ENGINE_THREAD.execute(() -> loadEngine(context, path, device, generation));
            } else if (READY.equals(engineState) && !baseIsWanted()) {
                ENGINE_THREAD.execute(() -> ensureBase("сменился текст (проверка модели)"));
            }

            call.resolve(engineStatus());
        }
    }

    /**
     * Начинает запись с микрофона. Отвечает, когда AudioRecord отдал первый буфер — это и есть
     * фактический старт: с этого момента сказанное попадает в запись. Тогда же короткая вибрация.
     */
    @SuppressLint("MissingPermission")
    @PluginMethod
    public void startRecording(PluginCall call) {
        long calledAt = SystemClock.elapsedRealtime();

        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            call.reject("Нет разрешения на микрофон", "permission");

            return;
        }

        if (recorder != null) {
            call.reject("Запись уже идёт");

            return;
        }

        int minBuffer = AudioRecord.getMinBufferSize(
                WavFile.SAMPLE_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT);

        if (minBuffer <= 0) {
            call.reject("Микрофон не поддерживает запись 16 кГц моно (код " + minBuffer + ")");

            return;
        }

        // Не меньше 0,1 с звука на буфер чтения: короче — чаще просыпается поток, длиннее — позже старт.
        int bufferBytes = Math.max(minBuffer, WavFile.SAMPLE_RATE * WavFile.BYTES_PER_SAMPLE / 10);
        AudioRecord created = new AudioRecord(
                MediaRecorder.AudioSource.MIC,
                WavFile.SAMPLE_RATE,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
                bufferBytes * 2);

        if (created.getState() != AudioRecord.STATE_INITIALIZED) {
            created.release();
            call.reject("Микрофон недоступен");

            return;
        }

        created.startRecording();

        if (created.getRecordingState() != AudioRecord.RECORDSTATE_RECORDING) {
            created.release();
            call.reject("Микрофон занят другим приложением");

            return;
        }

        CountDownLatch firstBuffer = new CountDownLatch(1);

        recorder = created;
        pcm = new ByteArrayOutputStream();
        truncated = false;
        readError = 0;
        recording = true;
        recordStartedAt = SystemClock.elapsedRealtime();
        reader = new Thread(() -> readLoop(created, bufferBytes, firstBuffer), "SecretarVoiceRecord");
        reader.start();

        boolean started;

        try {
            started = firstBuffer.await(FIRST_BUFFER_TIMEOUT_MS, TimeUnit.MILLISECONDS);
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            started = false;
        }

        if (readError != 0) {
            int code = readError;

            releaseRecorder();
            call.reject("Ошибка чтения микрофона (код " + code + ")");

            return;
        }

        vibrate();

        JSObject result = new JSObject();

        result.put("startMs", SystemClock.elapsedRealtime() - calledAt);
        result.put("firstBuffer", started);
        result.put("bufferBytes", bufferBytes);
        result.put("source", "MIC");
        Log.i(TAG, "запись начата за " + result.optLong("startMs") + " мс, первый буфер: " + started);
        call.resolve(result);
    }

    /** Останавливает запись и сохраняет её WAV-файлом в каталоге журнала. */
    @PluginMethod
    public void stopRecording(PluginCall call) {
        if (recorder == null) {
            call.reject("Запись не идёт");

            return;
        }

        long recordedMs = SystemClock.elapsedRealtime() - recordStartedAt;

        releaseRecorder();

        byte[] data = pcm.toByteArray();
        File dir = logDir();

        if (dir == null) {
            call.reject("Хранилище приложения недоступно");

            return;
        }

        String name = "voice-" + new SimpleDateFormat("yyyyMMdd-HHmmss-SSS", Locale.US).format(new Date()) + ".wav";
        File file = new File(dir, name);

        try (OutputStream out = new FileOutputStream(file)) {
            out.write(WavFile.header(data.length));
            out.write(data);
        } catch (IOException error) {
            call.reject("Не удалось сохранить запись: " + error.getMessage(), null, error, stackData(error));

            return;
        }

        int peak = WavFile.peak(data, data.length);
        JSObject result = new JSObject();

        result.put("file", name);
        result.put("path", file.getAbsolutePath());
        result.put("sampleRate", WavFile.SAMPLE_RATE);
        result.put("channels", WavFile.CHANNELS);
        result.put("bitsPerSample", WavFile.BITS_PER_SAMPLE);
        result.put("bytes", data.length);
        result.put("samples", data.length / WavFile.BYTES_PER_SAMPLE);
        result.put("durationMs", WavFile.durationMs(data.length));
        result.put("recordedMs", recordedMs);
        result.put("peak", peak);
        result.put("truncated", truncated);
        Log.i(TAG, "запись " + name + ": " + WavFile.durationMs(data.length) + " мс, пик " + peak
                + (truncated ? ", обрезана на 30 с" : ""));
        call.resolve(result);
    }

    /**
     * Отдаёт запись модели: {@code { audioPath, systemPrompt, userText, tool, toolResponse }}:
     * systemPrompt — базовый промпт дня, userText — сообщение нажатия (время), tool — описание
     * инструмента JSON-строкой, toolResponse — ответ инструмента на каждый вызов. Разговор — копия
     * базового; база другого дня перечитывается перед нажатием. Инструмент — в ручном режиме
     * (automaticToolCalling = false): вызовы возвращаются как есть, а чтобы модель вызвала его
     * для следующей задачи фразы, ей отдаётся toolResponse — пока она вызывает инструмент, но не
     * больше {@code MAX_TOOL_ROUNDS} ходов.
     */
    @PluginMethod
    public void process(PluginCall call) {
        String audioPath = call.getString("audioPath");
        String systemPrompt = call.getString("systemPrompt");
        String userText = call.getString("userText", "");
        String tool = call.getString("tool");
        String toolResponse = call.getString("toolResponse");

        if (audioPath == null || systemPrompt == null || tool == null || toolResponse == null) {
            call.reject("Неверные параметры обработки");

            return;
        }

        long queuedAt = SystemClock.elapsedRealtime();

        ENGINE_THREAD.execute(() -> runModel(call, queuedAt, audioPath, systemPrompt, userText, tool, toolResponse));
    }

    /** Добавляет строку {@code { line }} в журнал и убирает записи и WAV старше 30 нажатий. */
    @PluginMethod
    public void writeLog(PluginCall call) {
        String line = call.getString("line");

        if (line == null || line.isEmpty() || line.contains("\n")) {
            call.reject("Неверная строка журнала");

            return;
        }

        try {
            appendLog(getContext(), line, true);
        } catch (IOException error) {
            call.reject("Не удалось записать журнал: " + error.getMessage(), null, error, stackData(error));

            return;
        }

        Log.i(TAG, line.length() > 400 ? line.substring(0, 400) + "…" : line);
        call.resolve();
    }

    /** Сколько нажатий в журнале и сколько он занимает. */
    @PluginMethod
    public void logInfo(PluginCall call) {
        File dir = logDir();
        JSObject result = new JSObject();
        long bytes = 0;
        int presses = 0;

        if (dir != null) {
            synchronized (LOG_LOCK) {
                File[] files = dir.listFiles();

                for (File file : files == null ? new File[0] : files) {
                    bytes += file.length();
                }

                try {
                    presses = VoiceLog.countPresses(readLines(new File(dir, LOG_FILE)));
                } catch (IOException error) {
                    call.reject("Не удалось прочитать журнал: " + error.getMessage(), null, error, stackData(error));

                    return;
                }
            }
        }

        result.put("entries", presses);
        result.put("bytes", bytes);
        call.resolve(result);
    }

    /** Удаляет журнал и все записи. */
    @PluginMethod
    public void clearLog(PluginCall call) {
        File dir = logDir();

        if (dir != null) {
            synchronized (LOG_LOCK) {
                File[] files = dir.listFiles();

                for (File file : files == null ? new File[0] : files) {
                    if (!file.delete()) {
                        call.reject("Не удалось удалить " + file.getName());

                        return;
                    }
                }
            }
        }

        Log.i(TAG, "журнал очищен");
        call.resolve();
    }

    /** Собирает журнал и WAV-файлы в zip и открывает меню «Поделиться». */
    @PluginMethod
    public void shareLog(PluginCall call) {
        File dir = logDir();
        File zip;

        try {
            synchronized (LOG_LOCK) {
                File[] files = dir == null ? null : dir.listFiles();

                if (files == null || files.length == 0) {
                    call.reject("Журнал пуст");

                    return;
                }

                zip = writeZip(files);
            }
        } catch (IOException error) {
            call.reject("Не удалось собрать архив журнала: " + error.getMessage(), null, error, stackData(error));

            return;
        }

        Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", zip);
        Intent send = new Intent(Intent.ACTION_SEND)
                .setType("application/zip")
                .putExtra(Intent.EXTRA_STREAM, uri)
                .putExtra(Intent.EXTRA_SUBJECT, zip.getName())
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        Intent chooser = Intent.createChooser(send, "Журнал голоса").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

        getActivity().runOnUiThread(() -> getActivity().startActivity(chooser));
        Log.i(TAG, "архив журнала: " + zip.getName() + ", " + zip.length() + " байт");

        JSObject result = new JSObject();

        result.put("file", zip.getName());
        result.put("bytes", zip.length());
        call.resolve(result);
    }

    @Override
    protected void handleOnDestroy() {
        if (recorder != null) {
            releaseRecorder();
        }
    }

    private void readLoop(AudioRecord source, int bufferBytes, CountDownLatch firstBuffer) {
        byte[] buffer = new byte[bufferBytes];

        while (recording) {
            int read = source.read(buffer, 0, buffer.length);

            if (read < 0) {
                readError = read;
                break;
            }

            if (read == 0) {
                continue;
            }

            firstBuffer.countDown();

            int room = MAX_RECORD_BYTES - pcm.size();

            if (read > room) {
                truncated = true;
            }

            if (room > 0) {
                pcm.write(buffer, 0, Math.min(read, room));
            }
        }

        firstBuffer.countDown();
    }

    private void releaseRecorder() {
        recording = false;

        try {
            reader.join(FIRST_BUFFER_TIMEOUT_MS);
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
        }

        try {
            recorder.stop();
        } catch (IllegalStateException error) {
            Log.w(TAG, "AudioRecord.stop: " + error.getMessage());
        }

        recorder.release();
        recorder = null;
        reader = null;
    }

    private void vibrate() {
        Vibrator vibrator = (Vibrator) getContext().getSystemService(Context.VIBRATOR_SERVICE);

        if (vibrator == null || !vibrator.hasVibrator()) {
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createOneShot(40, VibrationEffect.DEFAULT_AMPLITUDE));
        } else {
            vibrator.vibrate(40);
        }
    }

    private static void runModel(PluginCall call, long queuedAt, String audioPath, String systemPrompt,
            String userText, String toolJson, String toolResponse) {
        long startedAt = SystemClock.elapsedRealtime();
        Engine current;
        String backend;
        String device;
        String mtp;

        synchronized (ENGINE_LOCK) {
            current = READY.equals(engineState) ? engine : null;
            backend = engineBackend;
            device = engineDevice;
            mtp = engineMtp;

            if (current == null) {
                String reason = engineError != null ? engineError : "состояние " + engineState;

                call.reject("Модель не загружена: " + reason, "engine");

                return;
            }

            // Нажатие решает, какая база нужна: его текст — последний.
            wantedBasePrompt = systemPrompt;
            wantedBaseTool = toolJson;
        }

        // Замеры и сведения о разговоре — вне try: при ошибке модели собранное уходит в журнал.
        JSObject timing = new JSObject();
        JSObject prepared = new JSObject();

        try {
            List<Content> contents = new ArrayList<>();

            contents.add(new Content.AudioFile(audioPath));

            if (!userText.isEmpty()) {
                contents.add(new Content.Text(userText));
            }

            // База другого дня (таймер в фоне не успел) — перечитать сейчас; время входит в conversationMs.
            prepared.put("baseRebuilt", ensureBase("перед нажатием"));

            Conversation ready;
            JSObject info;

            synchronized (ENGINE_LOCK) {
                ready = base;
                info = baseInfo;
            }

            prepared.put("base", info);

            Conversation conversation = null;

            if (ready != null) {
                long cloneStart = SystemClock.elapsedRealtime();

                try {
                    conversation = ready.clone();
                    prepared.put("mode", "clone");
                    prepared.put("cloneMs", SystemClock.elapsedRealtime() - cloneStart);
                } catch (Throwable error) {
                    // Копия не удалась — новый разговор, как до базы; причина — в журнал.
                    Log.w(TAG, "clone() не удался, создаю разговор заново", error);
                    prepared.put("cloneError", Log.getStackTraceString(error));
                }
            }

            if (conversation == null) {
                conversation = current.createConversation(conversationConfig(systemPrompt, toolJson));
                prepared.put("mode", "fresh");
            }

            Message reply;
            long createdAt;
            long doneAt;
            long roundsMs = 0;
            int calls;
            JSArray messages = new JSArray();
            JSArray rounds = new JSArray();

            try (Conversation turn = conversation) {
                createdAt = SystemClock.elapsedRealtime();
                timing.put("conversationMs", createdAt - startedAt);

                if ("fresh".equals(prepared.optString("mode"))) {
                    timing.put("preface", benchmarkJson(turn));
                }

                reply = turn.sendMessage(Contents.Companion.of(contents));
                doneAt = SystemClock.elapsedRealtime();
                timing.put("turn", benchmarkJson(turn));
                messages.put(messageJson(reply));
                calls = reply.getToolCalls().size();

                // Gemma 4 после вызова ждёт ответа инструмента: на ответ она вызывает инструмент для
                // следующей задачи фразы или отвечает текстом. Отказ хода (например, переполнение
                // окна на длинной записи) не теряет уже полученные вызовы.
                Message last = reply;

                while (!last.getToolCalls().isEmpty() && rounds.length() < MAX_TOOL_ROUNDS) {
                    List<Content> responses = new ArrayList<>();

                    for (ToolCall toolCall : last.getToolCalls()) {
                        responses.add(new Content.ToolResponse(toolCall.getName(), toolResponse));
                    }

                    long roundStart = SystemClock.elapsedRealtime();
                    JSObject round = new JSObject();

                    rounds.put(round);

                    try {
                        last = turn.sendMessage(Message.Companion.tool(Contents.Companion.of(responses)));
                    } catch (Throwable error) {
                        Log.w(TAG, "ход с ответом инструмента не удался", error);
                        round.put("ms", SystemClock.elapsedRealtime() - roundStart);
                        round.put("error", Log.getStackTraceString(error));
                        roundsMs += SystemClock.elapsedRealtime() - roundStart;

                        break;
                    }

                    round.put("ms", SystemClock.elapsedRealtime() - roundStart);
                    round.put("bench", benchmarkJson(turn));
                    roundsMs += SystemClock.elapsedRealtime() - roundStart;
                    messages.put(messageJson(last));
                    calls += last.getToolCalls().size();
                }
            }

            timing.put("rounds", rounds);
            timing.put("toolRoundsMs", roundsMs);
            summarizeTiming(timing, createdAt - startedAt, doneAt - createdAt, roundsMs);

            JSObject result = new JSObject();

            result.put("messages", messages);
            result.put("backend", backend);
            result.put("waitMs", startedAt - queuedAt);
            result.put("conversationMs", createdAt - startedAt);
            result.put("inferenceMs", doneAt - createdAt);
            result.put("toolRoundsMs", roundsMs);
            result.put("conversation", prepared);
            result.put("config", modelConfigJson(backend, device, mtp));
            result.put("timing", timing);
            Log.i(TAG, "ответ модели за " + (doneAt - createdAt) + " + " + roundsMs + " мс (" + backend + ", MTP "
                    + mtp + ", " + prepared.optString("mode") + "), ходов: " + (1 + rounds.length()) + ", вызовов: "
                    + calls + ", замеры: " + timing);
            call.resolve(result);
        } catch (Throwable error) {
            Log.e(TAG, "ошибка модели", error);

            // Параметры, с которыми вызывалась модель, — в журнал и при отказе, а не только при успехе.
            JSObject data = stackData(error);

            data.put("config", modelConfigJson(backend, device, mtp));
            data.put("conversation", prepared);
            data.put("timing", timing);
            call.reject("Ошибка модели: " + error, null, error instanceof Exception ? (Exception) error : null, data);
        }
    }

    /**
     * Настройки разговора нажатия и базового: промпт и инструмент (ручной режим), жадный сэмплер,
     * без размышления. Промпт с инструментом читаются при создании разговора отдельным ходом
     * prefill ({@code prefillPrefaceOnInit}): так база готова к копированию, а в журнале видно
     * отдельно время промпта и время хода со звуком.
     */
    private static ConversationConfig conversationConfig(String systemPrompt, String toolJson) {
        OpenApiTool tool = new OpenApiTool() {
            @Override
            public String getToolDescriptionJsonString() {
                return toolJson;
            }

            @Override
            public String execute(String paramsJsonString) {
                // В ручном режиме не вызывается: аргументы забирает веб-часть из ответа.
                return "ok";
            }
        };

        return new ConversationConfig(
                Contents.Companion.of(systemPrompt),
                Collections.emptyList(),
                Collections.singletonList(ToolKt.tool(tool)),
                new SamplerConfig(TOP_K, TOP_P, TEMPERATURE, SEED),
                false,
                null,
                Collections.emptyMap(),
                null,
                true,
                MAX_OUTPUT_TOKENS,
                new ThinkingConfig(false, -1));
    }

    /** Совпадает ли прочитанная база с нужной. Под ENGINE_LOCK. */
    private static boolean baseIsWanted() {
        return wantedBasePrompt == null
                || (wantedBasePrompt.equals(basePrompt) && wantedBaseTool.equals(baseTool));
    }

    /**
     * Читает нужный базовый промпт в новый базовый разговор, если прочитан другой или никакой
     * (только в фоновом потоке). Возвращает, была ли попытка чтения. Ошибка не бросается:
     * базы нет, причина — в {@code baseInfo.error}, нажатие создаст разговор само.
     */
    private static boolean ensureBase(String reason) {
        Engine current;
        String prompt;
        String tool;

        synchronized (ENGINE_LOCK) {
            current = READY.equals(engineState) ? engine : null;
            prompt = wantedBasePrompt;
            tool = wantedBaseTool;

            if (current == null || baseIsWanted()) {
                return false;
            }
        }

        closeBase();

        long startedAt = SystemClock.elapsedRealtime();
        JSObject info = new JSObject();

        info.put("reason", reason);
        info.put("at", timestamp());

        try {
            Conversation created = current.createConversation(conversationConfig(prompt, tool));

            info.put("prefillMs", SystemClock.elapsedRealtime() - startedAt);
            info.put("preface", benchmarkJson(created));

            synchronized (ENGINE_LOCK) {
                base = created;
                basePrompt = prompt;
                baseTool = tool;
                baseInfo = info;
            }

            Log.i(TAG, "базовый промпт прочитан за " + info.optLong("prefillMs") + " мс (" + reason + "): "
                    + info.optJSONObject("preface"));
        } catch (Throwable error) {
            Log.e(TAG, "базовый промпт не прочитан (" + reason + ")", error);
            info.put("failedAfterMs", SystemClock.elapsedRealtime() - startedAt);
            info.put("error", Log.getStackTraceString(error));

            synchronized (ENGINE_LOCK) {
                baseInfo = info;
            }
        }

        return true;
    }

    /** Закрывает базовый разговор (в фоновом потоке, до закрытия движка). */
    private static void closeBase() {
        Conversation previous;

        synchronized (ENGINE_LOCK) {
            previous = base;
            base = null;
            basePrompt = null;
            baseTool = null;
            baseInfo = null;
        }

        if (previous != null) {
            try {
                previous.close();
            } catch (Throwable error) {
                Log.w(TAG, "не удалось закрыть базовый разговор", error);
            }
        }
    }

    /** Параметры движка и разговора — в журнал каждого нажатия. */
    private static JSObject modelConfigJson(String backend, String device, String mtp) {
        JSObject sampler = new JSObject();

        sampler.put("topK", TOP_K);
        sampler.put("topP", TOP_P);
        sampler.put("temperature", TEMPERATURE);
        sampler.put("seed", SEED);

        JSObject config = new JSObject();

        config.put("backend", backend);
        config.put("device", device);
        config.put("mtp", mtp);
        config.put("audioBackend", "CPU");
        config.put("maxNumTokens", MAX_NUM_TOKENS);
        config.put("maxOutputTokens", MAX_OUTPUT_TOKENS);
        config.put("thinking", false);
        config.put("automaticToolCalling", false);
        config.put("constrainedDecoding", false);
        config.put("sampler", sampler);

        return config;
    }

    private static JSObject messageJson(Message message) {
        JSObject json = new JSObject();
        JSArray toolCalls = new JSArray();

        for (ToolCall call : message.getToolCalls()) {
            JSObject item = new JSObject();

            item.put("name", call.getName());
            item.put("arguments", new JSONObject(call.getArguments()));
            toolCalls.put(item);
        }

        json.put("role", message.getRole().getValue());
        json.put("text", textOf(message));
        json.put("toolCalls", toolCalls);
        json.put("channels", new JSONObject(message.getChannels()));

        return json;
    }

    private static String textOf(Message message) {
        StringBuilder text = new StringBuilder();

        for (Content content : message.getContents().getContents()) {
            if (content instanceof Content.Text) {
                text.append(((Content.Text) content).getText());
            }
        }

        return text.toString();
    }

    /**
     * Загрузка в фоновом потоке на выбранном устройстве {@code device}: сначала с MTP-драфтером
     * (speculative decoding, режим ON), при отказе — без него; если и так не вышло на GPU — то же
     * на CPU. Звук — всегда CPU. После загрузки — прогрев коротким текстовым запросом: GPU может
     * загрузиться и отказать только на первом запросе (на эмуляторе без OpenCL: initialize прошёл
     * через WebGPU, а запрос упал с «Can not find OpenCL library on this device»), драфтер — на
     * первом шаге декода. Отказ прогрева — следующая попытка, а первое нажатие не тратит время на
     * компиляцию ядер. Затем — чтение базового промпта, если он уже известен.
     */
    private static void loadEngine(Context context, String path, String device, int generation) {
        closeEngine();

        // Замеры движка (BenchmarkInfo): флаг читается при создании Engine. Вход и остановка
        // декода с ним не меняются (параметры бенчмарка нулевые), см. docs/mechanic_voice.md.
        ExperimentalFlags.INSTANCE.setEnableBenchmark(true);

        File cache = context.getCacheDir();
        String cacheDir = cache.getAbsolutePath();
        String modelName = path.substring(path.lastIndexOf('/') + 1);
        // Кэш LiteRT-LM (веса и ядра GPU, XNNPACK) лежит файлами с именем модели в начале:
        // есть он — загрузка повторная, нет — первая, с компиляцией.
        File[] cached = cache.listFiles((parent, name) -> name.startsWith(modelName));
        long cachedBytes = 0;

        for (File file : cached == null ? new File[0] : cached) {
            cachedBytes += file.length();
        }

        long startedAt = SystemClock.elapsedRealtime();
        Engine loaded = null;
        String backend = null;
        boolean mtp = false;
        String lastError = null;
        JSONObject stages = new JSONObject();
        // Ошибки попыток: gpuMtpError, gpuError, cpuMtpError, cpuError; не было попытки или отказа — null.
        JSONObject errors = new JSONObject();
        long warmUpMs = 0;
        String[] backends = CPU.equals(device) ? new String[] { CPU } : new String[] { GPU, CPU };

        attempts:
        for (String candidate : backends) {
            for (boolean withMtp : new boolean[] { true, false }) {
                // Префикс этапов и ошибки попытки: gpuMtp, gpu, cpuMtp, cpu.
                String prefix = candidate.toLowerCase(Locale.ROOT) + (withMtp ? "Mtp" : "");
                long attemptStart = SystemClock.elapsedRealtime();

                try {
                    loaded = initialize(new EngineConfig(path, GPU.equals(candidate) ? new Backend.GPU() : new Backend.CPU(),
                            null, new Backend.CPU(), MAX_NUM_TOKENS, null, cacheDir, null,
                            new SpeculativeDecodingConfig(withMtp ? SpeculativeDecodingMode.ON : SpeculativeDecodingMode.OFF)));
                    stages.put(prefix + "InitializeMs", SystemClock.elapsedRealtime() - attemptStart);
                    warmUpMs = warmUp(loaded, stages, prefix);
                    backend = candidate;
                    mtp = withMtp;

                    break attempts;
                } catch (Throwable error) {
                    lastError = Log.getStackTraceString(error);
                    putQuietly(errors, prefix + "Error", lastError);
                    putQuietly(stages, prefix + "FailedAfterMs", SystemClock.elapsedRealtime() - attemptStart);
                    Log.w(TAG, "не загрузилось: " + candidate + (withMtp ? " с MTP" : " без MTP"), error);
                    closeQuietly(loaded);
                    loaded = null;
                }
            }
        }

        long loadMs = SystemClock.elapsedRealtime() - startedAt;
        boolean accepted;

        synchronized (ENGINE_LOCK) {
            // Пока грузилось, могли удалить модель или выбрать другое устройство.
            boolean wanted = generation == loadGeneration && LOADING.equals(engineState);

            accepted = loaded != null && wanted;

            if (accepted) {
                engine = loaded;
                engineState = READY;
                engineBackend = backend;
                engineMtp = mtp ? "ON" : "OFF";
                engineLoadMs = loadMs;
            } else if (loaded != null) {
                loaded.close();
            } else if (wanted) {
                engineState = ERROR;
                // Для сообщения — первая строка (класс и текст), стек целиком — в записи журнала.
                engineError = lastError == null ? "неизвестная ошибка" : lastError.split("\n", 2)[0];
            }
        }

        Log.i(TAG, "загрузка модели: " + (backend == null ? "ошибка" : backend + (mtp ? " с MTP" : " без MTP"))
                + " за " + loadMs + " мс, прогрев " + warmUpMs + " мс" + (accepted ? "" : ", не нужна"));

        try {
            JSONObject entry = new JSONObject();

            entry.put("kind", "engine");
            entry.put("at", timestamp());
            entry.put("model", modelName);
            entry.put("device", device);
            entry.put("cacheFilesBefore", cached == null ? 0 : cached.length);
            entry.put("cacheBytesBefore", cachedBytes);
            entry.put("backend", backend == null ? JSONObject.NULL : backend);
            entry.put("mtp", backend == null ? JSONObject.NULL : (mtp ? "ON" : "OFF"));
            entry.put("audioBackend", "CPU");
            entry.put("maxNumTokens", MAX_NUM_TOKENS);
            entry.put("loadMs", loadMs);
            entry.put("warmUpMs", warmUpMs);
            entry.put("stages", stages);

            for (String key : new String[] { "gpuMtpError", "gpuError", "cpuMtpError", "cpuError" }) {
                entry.put(key, errors.has(key) ? errors.get(key) : JSONObject.NULL);
            }

            appendLog(context, entry.toString(), false);
        } catch (Exception error) {
            Log.e(TAG, "не удалось записать загрузку модели в журнал", error);
        }

        if (accepted) {
            ensureBase("после загрузки модели");
        }
    }

    /**
     * Короткий текстовый запрос без инструментов; возвращает его время, мс, и пишет в {@code stages}
     * его время и замеры разговора прогрева. Ошибка — исключением.
     */
    private static long warmUp(Engine loaded, JSONObject stages, String prefix) throws Exception {
        long startedAt = SystemClock.elapsedRealtime();
        ConversationConfig config = new ConversationConfig(
                null,
                Collections.emptyList(),
                Collections.emptyList(),
                new SamplerConfig(TOP_K, TOP_P, TEMPERATURE, SEED),
                false,
                null,
                Collections.emptyMap(),
                null,
                false,
                WARM_UP_OUTPUT_TOKENS,
                new ThinkingConfig(false, -1));

        try (Conversation conversation = loaded.createConversation(config)) {
            conversation.sendMessage("Привет");
            stages.put(prefix + "WarmUp", benchmarkJson(conversation));
        }

        long warmUpMs = SystemClock.elapsedRealtime() - startedAt;

        stages.put(prefix + "WarmUpMs", warmUpMs);

        return warmUpMs;
    }

    /**
     * Замеры разговора из BenchmarkInfo, в мс и токенах: последний ход prefill (токены, ток/с, время),
     * последний ход декода (то же), метки (среди них {@code audio_executor} — аудиоэнкодер) и время
     * до первого токена по определению библиотеки (первый ход prefill плюс средний токен декода).
     * Время инициализации ({@code initTimeInSecond}) не берётся: JNI суммирует все фазы, и
     * «Init Total» входит вместе со своими частями, плюс сессия и разговор — число завышено.
     * Отказ замера не роняет нажатие: вместо чисел — текст ошибки.
     */
    private static JSObject benchmarkJson(Conversation conversation) {
        JSObject json = new JSObject();

        try {
            BenchmarkInfo info = conversation.getBenchmarkInfo();
            JSObject marks = new JSObject();

            for (Map.Entry<String, Double> mark : info.getMarkDurationsInSecond().entrySet()) {
                marks.put(mark.getKey(), Math.round(mark.getValue() * 1000));
            }

            json.put("timeToFirstTokenMs", Math.round(info.getTimeToFirstTokenInSecond() * 1000));
            json.put("prefillTokens", info.getLastPrefillTokenCount());
            json.put("prefillTokensPerSecond", ModelTiming.round1(info.getLastPrefillTokensPerSecond()));
            json.put("prefillMs", ModelTiming.tokensMs(info.getLastPrefillTokenCount(), info.getLastPrefillTokensPerSecond()));
            json.put("decodeTokens", info.getLastDecodeTokenCount());
            json.put("decodeTokensPerSecond", ModelTiming.round1(info.getLastDecodeTokensPerSecond()));
            json.put("decodeMs", ModelTiming.tokensMs(info.getLastDecodeTokenCount(), info.getLastDecodeTokensPerSecond()));
            json.put("marksMs", marks);
        } catch (Throwable error) {
            json.put("error", String.valueOf(error));
        }

        return json;
    }

    /** Значение в сведения о загрузке; ключ строковый и непустой — JSONException тут невозможен. */
    private static void putQuietly(JSONObject target, String key, Object value) {
        try {
            target.put(key, value);
        } catch (org.json.JSONException error) {
            Log.w(TAG, "не удалось записать " + key, error);
        }
    }

    /** Сводка по замерам хода (арифметика — {@link ModelTiming}); нет замера хода — сводки нет. */
    private static void summarizeTiming(JSObject timing, long conversationMs, long inferenceMs, long roundsMs) {
        JSONObject turn = timing.optJSONObject("turn");

        if (turn == null || turn.has("error")) {
            return;
        }

        JSONObject marks = turn.optJSONObject("marksMs");
        ModelTiming summary = ModelTiming.of(
                conversationMs,
                inferenceMs,
                marks == null ? 0 : marks.optLong("audio_executor", 0),
                turn.optLong("prefillMs", 0),
                turn.optLong("decodeMs", 0),
                turn.optInt("decodeTokens", 0),
                roundsMs);

        timing.put("audioEncodeMs", summary.audioEncodeMs);
        timing.put("turnPrefillMs", summary.turnPrefillMs);
        timing.put("decodeMs", summary.decodeMs);
        timing.put("firstTokenMs", summary.firstTokenMs);
        timing.put("otherMs", summary.otherMs);
        timing.put("modelTotalMs", summary.modelTotalMs);
    }

    /**
     * Закрывает неудавшийся движок в отдельном потоке, не выпуская ошибку закрытия. Отдельный поток —
     * потому что закрытие GPU-движка после отказа может не вернуться: на эмуляторе поток повис
     * в {@code vkQueueWaitIdle} драйвера Vulkan, и загрузка на CPU не начиналась.
     */
    private static void closeQuietly(Engine loaded) {
        if (loaded == null || !loaded.isInitialized()) {
            return;
        }

        new Thread(() -> {
            try {
                loaded.close();
                Log.i(TAG, "неудавшийся движок закрыт");
            } catch (Throwable error) {
                Log.w(TAG, "не удалось закрыть движок после ошибки", error);
            }
        }, "SecretarVoiceClose").start();
    }

    private static Engine initialize(EngineConfig config) {
        Engine created = new Engine(config);

        created.initialize();

        return created;
    }

    private static void closeEngine() {
        // Разговор закрывается раньше движка, которому он принадлежит.
        closeBase();

        Engine previous;

        synchronized (ENGINE_LOCK) {
            previous = engine;
            engine = null;
            engineBackend = null;
            engineMtp = null;
            engineLoadMs = 0;
        }

        if (previous != null) {
            previous.close();
            Log.i(TAG, "модель выгружена");
        }
    }

    private static JSObject engineStatus() {
        JSObject status = new JSObject();

        status.put("state", engineState);
        status.put("backend", engineBackend);
        status.put("mtp", engineMtp);
        status.put("loadMs", engineLoadMs);
        status.put("error", engineError);

        return status;
    }

    /**
     * Дописывает строку в журнал и обрезает его до последних 30 нажатий. WAV без упоминания
     * в журнале удаляются только при записи нажатия ({@code pruneWavs}): нажатия идут по одному —
     * веб-часть держит флаг нажатия на уровне модуля кнопки (VoiceButton.svelte), и новое не
     * начинается, пока прежнее не записано в журнал, даже если кнопку перемонтировали, — поэтому
     * к этому моменту каждая сохранённая запись уже упомянута. Запись загрузки движка может
     * прийти, пока идёт нажатие, — тогда WAV этого нажатия ещё не упомянут и трогать его нельзя.
     */
    private static void appendLog(Context context, String line, boolean pruneWavs) throws IOException {
        File dir = context.getExternalFilesDir(LOG_DIR);

        if (dir == null) {
            throw new IOException("Хранилище приложения недоступно");
        }

        synchronized (LOG_LOCK) {
            File log = new File(dir, LOG_FILE);
            List<String> lines = readLines(log);

            lines.add(line);

            List<String> kept = VoiceLog.trim(lines, VoiceLog.MAX_PRESSES);

            try (Writer out = new OutputStreamWriter(new FileOutputStream(log), StandardCharsets.UTF_8)) {
                for (String keptLine : kept) {
                    out.write(keptLine);
                    out.write('\n');
                }
            }

            if (!pruneWavs) {
                return;
            }

            String[] wavs = dir.list((parent, name) -> name.endsWith(".wav"));

            for (String orphan : VoiceLog.orphans(kept, wavs == null ? Collections.emptyList() : Arrays.asList(wavs))) {
                if (!new File(dir, orphan).delete()) {
                    Log.w(TAG, "не удалось удалить " + orphan);
                }
            }
        }
    }

    private static List<String> readLines(File file) throws IOException {
        List<String> lines = new ArrayList<>();

        if (!file.exists()) {
            return lines;
        }

        try (BufferedReader in = new BufferedReader(new InputStreamReader(new FileInputStream(file), StandardCharsets.UTF_8))) {
            String line;

            while ((line = in.readLine()) != null) {
                if (!line.isEmpty()) {
                    lines.add(line);
                }
            }
        }

        return lines;
    }

    private File writeZip(File[] files) throws IOException {
        File cache = getContext().getCacheDir();
        File[] previous = cache.listFiles((parent, name) -> name.startsWith(ZIP_PREFIX));

        for (File old : previous == null ? new File[0] : previous) {
            if (!old.delete()) {
                Log.w(TAG, "не удалось удалить прежний архив " + old.getName());
            }
        }

        File zip = new File(cache, ZIP_PREFIX + new SimpleDateFormat("yyyyMMdd-HHmm", Locale.US).format(new Date()) + ".zip");
        byte[] buffer = new byte[64 * 1024];

        try (ZipOutputStream out = new ZipOutputStream(new FileOutputStream(zip))) {
            for (File file : files) {
                out.putNextEntry(new ZipEntry(file.getName()));

                try (InputStream in = new FileInputStream(file)) {
                    int read;

                    while ((read = in.read(buffer)) > 0) {
                        out.write(buffer, 0, read);
                    }
                }

                out.closeEntry();
            }
        }

        return zip;
    }

    private File logDir() {
        return getContext().getExternalFilesDir(LOG_DIR);
    }

    private File modelFile(String fileName) {
        File dir = getContext().getExternalFilesDir(ModelDownloaderPlugin.MODELS_DIR);

        return dir == null ? null : new File(dir, fileName);
    }

    private static String timestamp() {
        return new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.US).format(new Date());
    }

    /** Стек ошибки для журнала веб-части: в ответе Capacitor он лежит в поле data. */
    private static JSObject stackData(Throwable error) {
        StringWriter writer = new StringWriter();

        error.printStackTrace(new PrintWriter(writer));

        JSObject data = new JSObject();

        data.put("stack", writer.toString());

        return data;
    }
}
