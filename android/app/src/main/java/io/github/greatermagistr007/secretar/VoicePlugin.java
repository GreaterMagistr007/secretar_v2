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

    /** Окно контекста: 30 с звука — 750 токенов, промпт с описанием инструмента — около тысячи. */
    private static final int MAX_NUM_TOKENS = 4096;

    /** Ответ — один вызов инструмента: несколько десятков токенов. */
    private static final int MAX_OUTPUT_TOKENS = 128;

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

    private static long engineLoadMs;

    private static String engineError;

    private AudioRecord recorder;

    private Thread reader;

    private volatile boolean recording;

    private ByteArrayOutputStream pcm;

    private volatile boolean truncated;

    private volatile int readError;

    private long recordStartedAt;

    /**
     * Загружает модель {@code { fileName, size }} в фоне, если файл скачан и проверен загрузчиком
     * (ModelDownloaderPlugin), и отдаёт состояние движка. Повторный вызов во время загрузки или
     * при загруженной модели ничего не запускает; после ошибки загрузка повторяется.
     */
    @PluginMethod
    public void load(PluginCall call) {
        String fileName = call.getString("fileName");
        // optLong, а не getLong: getLong Capacitor отдаёт null для числа, уместившегося в int.
        long size = call.getData().optLong("size", 0);

        if (!ModelDownloadState.isSafeFileName(fileName) || size <= 0) {
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
            if (!verified) {
                if (engine != null || LOADING.equals(engineState)) {
                    // Модель удалили или заменили: движок держит отображение удалённого файла.
                    ENGINE_THREAD.execute(VoicePlugin::closeEngine);
                }

                engineState = ABSENT;
                engineFile = null;
            } else if (!fileName.equals(engineFile) || ABSENT.equals(engineState) || ERROR.equals(engineState)) {
                engineState = LOADING;
                engineFile = fileName;
                engineError = null;

                String path = model.getAbsolutePath();
                Context context = getContext().getApplicationContext();

                ENGINE_THREAD.execute(() -> loadEngine(context, path));
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
     * Отдаёт запись модели: {@code { audioPath, systemPrompt, userText, tool }}, tool — описание
     * инструмента JSON-строкой. Разговор создаётся на каждое нажатие: в системном промпте текущее
     * время, переиспользовать префикс с ним нельзя. Инструмент — в ручном режиме
     * (automaticToolCalling = false): вызов возвращается как есть, модель после него не догенерирует.
     */
    @PluginMethod
    public void process(PluginCall call) {
        String audioPath = call.getString("audioPath");
        String systemPrompt = call.getString("systemPrompt");
        String userText = call.getString("userText", "");
        String tool = call.getString("tool");

        if (audioPath == null || systemPrompt == null || tool == null) {
            call.reject("Неверные параметры обработки");

            return;
        }

        long queuedAt = SystemClock.elapsedRealtime();

        ENGINE_THREAD.execute(() -> runModel(call, queuedAt, audioPath, systemPrompt, userText, tool));
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
            String userText, String toolJson) {
        long startedAt = SystemClock.elapsedRealtime();
        Engine current;
        String backend;

        synchronized (ENGINE_LOCK) {
            current = READY.equals(engineState) ? engine : null;
            backend = engineBackend;

            if (current == null) {
                String reason = engineError != null ? engineError : "состояние " + engineState;

                call.reject("Модель не загружена: " + reason, "engine");

                return;
            }
        }

        // Замеры — вне try: при ошибке модели уже собранное (чтение промпта) уходит в журнал.
        JSObject timing = new JSObject();

        try {
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
            ConversationConfig config = new ConversationConfig(
                    Contents.Companion.of(systemPrompt),
                    Collections.emptyList(),
                    Collections.singletonList(ToolKt.tool(tool)),
                    new SamplerConfig(TOP_K, TOP_P, TEMPERATURE, SEED),
                    false,
                    null,
                    Collections.emptyMap(),
                    null,
                    // Промпт и инструмент читаются при создании разговора отдельным ходом prefill:
                    // так в журнале видно отдельно время промпта и время хода со звуком.
                    true,
                    MAX_OUTPUT_TOKENS,
                    new ThinkingConfig(false, -1));
            List<Content> contents = new ArrayList<>();

            contents.add(new Content.AudioFile(audioPath));

            if (!userText.isEmpty()) {
                contents.add(new Content.Text(userText));
            }

            Message reply;
            long createdAt;
            long doneAt;

            try (Conversation conversation = current.createConversation(config)) {
                createdAt = SystemClock.elapsedRealtime();
                timing.put("conversationMs", createdAt - startedAt);
                timing.put("preface", benchmarkJson(conversation));
                reply = conversation.sendMessage(Contents.Companion.of(contents));
                doneAt = SystemClock.elapsedRealtime();
                timing.put("turn", benchmarkJson(conversation));
            }

            summarizeTiming(timing, createdAt - startedAt, doneAt - createdAt);

            JSObject result = new JSObject();
            JSArray messages = new JSArray();

            messages.put(messageJson(reply));
            result.put("messages", messages);
            result.put("backend", backend);
            result.put("waitMs", startedAt - queuedAt);
            result.put("conversationMs", createdAt - startedAt);
            result.put("inferenceMs", doneAt - createdAt);
            result.put("config", modelConfigJson(backend));
            result.put("timing", timing);
            Log.i(TAG, "ответ модели за " + (doneAt - createdAt) + " мс (" + backend + "), вызовов: "
                    + reply.getToolCalls().size() + ", текст: " + textOf(reply) + ", замеры: " + timing);
            call.resolve(result);
        } catch (Throwable error) {
            Log.e(TAG, "ошибка модели", error);

            // Параметры, с которыми вызывалась модель, — в журнал и при отказе, а не только при успехе.
            JSObject data = stackData(error);

            data.put("config", modelConfigJson(backend));
            data.put("timing", timing);
            call.reject("Ошибка модели: " + error, null, error instanceof Exception ? (Exception) error : null, data);
        }
    }

    /** Параметры движка и разговора — в журнал каждого нажатия. */
    private static JSObject modelConfigJson(String backend) {
        JSObject sampler = new JSObject();

        sampler.put("topK", TOP_K);
        sampler.put("topP", TOP_P);
        sampler.put("temperature", TEMPERATURE);
        sampler.put("seed", SEED);

        JSObject config = new JSObject();

        config.put("backend", backend);
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
     * Загрузка в фоновом потоке: сначала GPU для текстовой части, при отказе — CPU. Звук — всегда CPU.
     * После загрузки — прогрев одним коротким текстовым запросом: GPU может загрузиться и отказать
     * только на первом запросе (на эмуляторе без OpenCL: initialize прошёл через WebGPU, а запрос
     * упал с «Can not find OpenCL library on this device»). Отказ прогрева на GPU — откат на CPU,
     * а первое нажатие не тратит время на компиляцию ядер.
     */
    private static void loadEngine(Context context, String path) {
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
        String gpuError = null;
        String cpuError = null;
        Engine loaded = null;
        String backend = null;
        JSONObject stages = new JSONObject();

        long warmUpMs = 0;

        long gpuStart = SystemClock.elapsedRealtime();

        try {
            loaded = initialize(new EngineConfig(path, new Backend.GPU(), null, new Backend.CPU(), MAX_NUM_TOKENS, null, cacheDir));
            stages.put("gpuInitializeMs", SystemClock.elapsedRealtime() - gpuStart);
            warmUpMs = warmUp(loaded, stages, "gpu");
            backend = "GPU";
        } catch (Throwable error) {
            gpuError = Log.getStackTraceString(error);
            putQuietly(stages, "gpuFailedAfterMs", SystemClock.elapsedRealtime() - gpuStart);
            Log.w(TAG, "GPU не подошёл, пробую CPU", error);
            closeQuietly(loaded);
            loaded = null;
        }

        if (loaded == null) {
            try {
                long cpuStart = SystemClock.elapsedRealtime();

                loaded = initialize(new EngineConfig(path, new Backend.CPU(), null, new Backend.CPU(), MAX_NUM_TOKENS, null, cacheDir));
                stages.put("cpuInitializeMs", SystemClock.elapsedRealtime() - cpuStart);
                warmUpMs = warmUp(loaded, stages, "cpu");
                backend = "CPU";
            } catch (Throwable error) {
                cpuError = Log.getStackTraceString(error);
                Log.e(TAG, "модель не загрузилась", error);
                closeQuietly(loaded);
                loaded = null;
            }
        }

        long loadMs = SystemClock.elapsedRealtime() - startedAt;

        synchronized (ENGINE_LOCK) {
            boolean wanted = LOADING.equals(engineState) && path.endsWith("/" + engineFile);

            if (loaded != null && wanted) {
                engine = loaded;
                engineState = READY;
                engineBackend = backend;
                engineLoadMs = loadMs;
            } else if (loaded != null) {
                // Пока грузилось, модель удалили: держать её незачем.
                loaded.close();
            } else if (wanted) {
                engineState = ERROR;
                // Для сообщения — первая строка (класс и текст), стек целиком — в записи журнала.
                engineError = cpuError.split("\n", 2)[0];
            }
        }

        Log.i(TAG, "загрузка модели: " + (backend == null ? "ошибка" : backend) + " за " + loadMs + " мс, прогрев "
                + warmUpMs + " мс");

        try {
            JSONObject entry = new JSONObject();

            entry.put("kind", "engine");
            entry.put("at", timestamp());
            entry.put("model", modelName);
            entry.put("cacheFilesBefore", cached == null ? 0 : cached.length);
            entry.put("cacheBytesBefore", cachedBytes);
            entry.put("backend", backend == null ? JSONObject.NULL : backend);
            entry.put("audioBackend", "CPU");
            entry.put("maxNumTokens", MAX_NUM_TOKENS);
            entry.put("loadMs", loadMs);
            entry.put("warmUpMs", warmUpMs);
            entry.put("stages", stages);
            entry.put("gpuError", gpuError == null ? JSONObject.NULL : gpuError);
            entry.put("cpuError", cpuError == null ? JSONObject.NULL : cpuError);
            appendLog(context, entry.toString(), false);
        } catch (Exception error) {
            Log.e(TAG, "не удалось записать загрузку модели в журнал", error);
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
                1,
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

    /** Число в сведения о загрузке; ключ строковый и непустой — JSONException тут невозможен. */
    private static void putQuietly(JSONObject target, String key, long value) {
        try {
            target.put(key, value);
        } catch (org.json.JSONException error) {
            Log.w(TAG, "не удалось записать " + key, error);
        }
    }

    /** Сводка по замерам хода (арифметика — {@link ModelTiming}); нет замера хода — сводки нет. */
    private static void summarizeTiming(JSObject timing, long conversationMs, long inferenceMs) {
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
                turn.optInt("decodeTokens", 0));

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
        Engine previous;

        synchronized (ENGINE_LOCK) {
            previous = engine;
            engine = null;
            engineBackend = null;
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
