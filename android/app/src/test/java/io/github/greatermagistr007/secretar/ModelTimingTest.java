package io.github.greatermagistr007.secretar;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

/** Тесты сводки времени ответа модели. Числа — замер эмулятора 2026-11-22 (CPU, 4 с звука). */
public class ModelTimingTest {

    @Test
    public void emulatorMeasurement() {
        ModelTiming timing = ModelTiming.of(8746, 8033, 596, 943, 6480, 57, 0);

        assertEquals(596, timing.audioEncodeMs);
        assertEquals(943, timing.turnPrefillMs);
        assertEquals(6480, timing.decodeMs);
        // 8746 + 596 + 943 + 6480 / 57 (113).
        assertEquals(10398, timing.firstTokenMs);
        assertEquals(14, timing.otherMs);
        assertEquals(16779, timing.modelTotalMs);
    }

    @Test
    public void noAudioMarkCountsAsZero() {
        ModelTiming timing = ModelTiming.of(1000, 5000, 0, 900, 3000, 30, 0);

        assertEquals(0, timing.audioEncodeMs);
        assertEquals(1000 + 900 + 100, timing.firstTokenMs);
        assertEquals(1100, timing.otherMs);
    }

    @Test
    public void noDecodeTokensNoDivision() {
        ModelTiming timing = ModelTiming.of(1000, 2000, 300, 700, 0, 0, 0);

        assertEquals(1000 + 300 + 700, timing.firstTokenMs);
        assertEquals(1000, timing.otherMs);
    }

    @Test
    public void noStatisticsAllZeros() {
        ModelTiming timing = ModelTiming.of(0, 0, 0, 0, 0, 0, 0);

        assertEquals(0, timing.firstTokenMs);
        assertEquals(0, timing.otherMs);
        assertEquals(0, timing.modelTotalMs);
    }

    @Test
    public void negativeMeasurementsCountAsZero() {
        ModelTiming timing = ModelTiming.of(500, 4000, -1, -1, -1, 10, 0);

        assertEquals(0, timing.audioEncodeMs);
        assertEquals(0, timing.turnPrefillMs);
        assertEquals(0, timing.decodeMs);
        assertEquals(500, timing.firstTokenMs);
        assertEquals(4000, timing.otherMs);
    }

    @Test
    public void oneDecodeTokenIsWholeDecode() {
        assertEquals(100 + 50 + 20 + 80, ModelTiming.of(100, 200, 50, 20, 80, 1, 0).firstTokenMs);
    }

    @Test
    public void toolRoundsAddToTotalOnly() {
        ModelTiming timing = ModelTiming.of(30, 3000, 300, 400, 2000, 50, 1500);

        assertEquals(30 + 300 + 400 + 40, timing.firstTokenMs);
        assertEquals(300, timing.otherMs);
        assertEquals(30 + 3000 + 1500, timing.modelTotalMs);
    }

    @Test
    public void negativeRoundsCountAsZero() {
        assertEquals(1000 + 2000, ModelTiming.of(1000, 2000, 0, 0, 0, 0, -1).modelTotalMs);
    }

    @Test
    public void tokensMsBoundaries() {
        assertEquals(0, ModelTiming.tokensMs(0, 100));
        assertEquals(0, ModelTiming.tokensMs(10, 0));
        assertEquals(0, ModelTiming.tokensMs(-1, 100));
        assertEquals(8719, ModelTiming.tokensMs(998, 114.46));
        assertEquals(1000, ModelTiming.tokensMs(1, 1));
    }

    @Test
    public void round1() {
        assertEquals(114.5, ModelTiming.round1(114.46), 0);
        assertEquals(0.0, ModelTiming.round1(0.04), 0);
        assertEquals(8.8, ModelTiming.round1(8.75), 0);
    }
}
