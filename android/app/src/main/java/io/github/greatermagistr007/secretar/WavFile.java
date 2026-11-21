package io.github.greatermagistr007.secretar;

/**
 * Запись с микрофона для модели голоса: заголовок WAV и пиковый уровень. Чистая логика без
 * Android, покрыта JUnit-тестами.
 *
 * Формат записи — то, что принимает модель: 16 кГц, моно, PCM 16 бит со знаком, little-endian
 * (docs/mechanic_voice.md, раздел «Голосовая кнопка»).
 */
final class WavFile {

    static final int SAMPLE_RATE = 16000;

    static final int CHANNELS = 1;

    static final int BITS_PER_SAMPLE = 16;

    static final int BYTES_PER_SAMPLE = BITS_PER_SAMPLE / 8 * CHANNELS;

    /** Длина заголовка RIFF/WAVE с одним блоком fmt (PCM) и блоком data. */
    static final int HEADER_SIZE = 44;

    private WavFile() {
    }

    /** Заголовок WAV для {@code dataBytes} байт звука в формате записи. */
    static byte[] header(int dataBytes) {
        if (dataBytes < 0) {
            throw new IllegalArgumentException("Отрицательная длина звука: " + dataBytes);
        }

        byte[] header = new byte[HEADER_SIZE];
        int byteRate = SAMPLE_RATE * BYTES_PER_SAMPLE;

        ascii(header, 0, "RIFF");
        int32(header, 4, HEADER_SIZE - 8 + dataBytes);
        ascii(header, 8, "WAVE");
        ascii(header, 12, "fmt ");
        int32(header, 16, 16);
        int16(header, 20, 1);
        int16(header, 22, CHANNELS);
        int32(header, 24, SAMPLE_RATE);
        int32(header, 28, byteRate);
        int16(header, 32, BYTES_PER_SAMPLE);
        int16(header, 34, BITS_PER_SAMPLE);
        ascii(header, 36, "data");
        int32(header, 40, dataBytes);

        return header;
    }

    /**
     * Наибольший модуль отсчёта среди первых {@code length} байт PCM 16 бит little-endian, 0…32768.
     * Нужен журналу: по нему видно, что микрофон отдал тишину. Нечётный последний байт не считается.
     */
    static int peak(byte[] pcm, int length) {
        int peak = 0;

        for (int index = 0; index + 1 < length; index += 2) {
            int sample = (short) ((pcm[index] & 0xff) | (pcm[index + 1] << 8));

            peak = Math.max(peak, Math.abs(sample));
        }

        return peak;
    }

    /** Длительность звука в миллисекундах по числу байт. */
    static long durationMs(int dataBytes) {
        return dataBytes / BYTES_PER_SAMPLE * 1000L / SAMPLE_RATE;
    }

    private static void ascii(byte[] target, int offset, String text) {
        for (int index = 0; index < text.length(); index++) {
            target[offset + index] = (byte) text.charAt(index);
        }
    }

    private static void int16(byte[] target, int offset, int value) {
        target[offset] = (byte) value;
        target[offset + 1] = (byte) (value >> 8);
    }

    private static void int32(byte[] target, int offset, int value) {
        target[offset] = (byte) value;
        target[offset + 1] = (byte) (value >> 8);
        target[offset + 2] = (byte) (value >> 16);
        target[offset + 3] = (byte) (value >> 24);
    }
}
