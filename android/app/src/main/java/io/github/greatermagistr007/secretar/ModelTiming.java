package io.github.greatermagistr007.secretar;

/**
 * Сводка времени ответа модели на нажатие по замерам LiteRT-LM (решение Р-38). Чистая логика
 * без Android и JSON, покрыта JUnit-тестами; JSON для журнала собирает VoicePlugin.
 *
 * {@code conversationMs} — подготовка разговора нажатия: копия базового разговора с уже
 * прочитанным промптом ({@code clone()}), а если базу пришлось перечитать или копия не удалась —
 * вместе с чтением промпта; {@code inferenceMs} — {@code sendMessage}: аудиоэнкодер, prefill хода
 * (звук, текст, шаблон), декод и прочее.
 */
final class ModelTiming {

    /** Аудиоэнкодер, мс; 0 — метки {@code audio_executor} нет. */
    final long audioEncodeMs;

    /** Prefill хода пользователя, мс. */
    final long turnPrefillMs;

    /** Декод ответа, мс. */
    final long decodeMs;

    /**
     * До первого токена ответа от начала работы модели над нажатием: подготовка разговора + звук +
     * prefill хода + один токен декода. Без ожидания очереди и без записи WAV.
     */
    final long firstTokenMs;

    /** Остаток {@code sendMessage}: чтение WAV и спектрограмма, шаблон и токенизация хода, разбор ответа, JNI. */
    final long otherMs;

    /**
     * Ответ модели целиком: подготовка разговора + первый {@code sendMessage} + дополнительные ходы
     * с ответом инструмента (следующие задачи фразы и итоговое «Готово»).
     */
    final long modelTotalMs;

    private ModelTiming(long audioEncodeMs, long turnPrefillMs, long decodeMs, long firstTokenMs, long otherMs,
            long modelTotalMs) {
        this.audioEncodeMs = audioEncodeMs;
        this.turnPrefillMs = turnPrefillMs;
        this.decodeMs = decodeMs;
        this.firstTokenMs = firstTokenMs;
        this.otherMs = otherMs;
        this.modelTotalMs = modelTotalMs;
    }

    /**
     * Сводка по замерам первого хода ({@code inferenceMs} — первый {@code sendMessage}) и времени
     * дополнительных ходов {@code roundsMs}. Отрицательные значения (замер не пришёл) считаются
     * нулём; без токенов декода в первый токен декод не входит.
     */
    static ModelTiming of(long conversationMs, long inferenceMs, long audioMs, long prefillMs, long decodeMs,
            int decodeTokens, long roundsMs) {
        long audio = Math.max(0, audioMs);
        long prefill = Math.max(0, prefillMs);
        long decode = Math.max(0, decodeMs);
        long firstDecodeToken = decodeTokens > 0 ? decode / decodeTokens : 0;

        return new ModelTiming(
                audio,
                prefill,
                decode,
                conversationMs + audio + prefill + firstDecodeToken,
                inferenceMs - audio - prefill - decode,
                conversationMs + inferenceMs + Math.max(0, roundsMs));
    }

    /** Время хода по числу токенов и скорости, мс; 0 — ход не записан. */
    static long tokensMs(int tokens, double tokensPerSecond) {
        return tokens > 0 && tokensPerSecond > 0 ? Math.round(tokens * 1000 / tokensPerSecond) : 0;
    }

    /** Скорость с одним знаком после запятой. */
    static double round1(double value) {
        return Math.round(value * 10) / 10.0;
    }
}
