package io.github.greatermagistr007.secretar;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;

import org.junit.Test;

/** Тесты заголовка WAV и пикового уровня записи для модели голоса. */
public class WavFileTest {

    /** Заголовок для 32 000 байт (1 с звука) — байты, как их записывает любой WAV-редактор. */
    private static final byte[] ONE_SECOND_HEADER = {
        'R', 'I', 'F', 'F', 0x24, 0x7d, 0x00, 0x00, 'W', 'A', 'V', 'E',
        'f', 'm', 't', ' ', 0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
        (byte) 0x80, 0x3e, 0x00, 0x00, 0x00, 0x7d, 0x00, 0x00, 0x02, 0x00, 0x10, 0x00,
        'd', 'a', 't', 'a', 0x00, 0x7d, 0x00, 0x00,
    };

    @Test
    public void headerForOneSecondMatchesReferenceBytes() {
        assertArrayEquals(ONE_SECOND_HEADER, WavFile.header(32000));
    }

    @Test
    public void headerForEmptyRecordingHasZeroDataAndRiffSize36() {
        byte[] header = WavFile.header(0);

        assertEquals(44, header.length);
        assertEquals(36, header[4]);
        assertEquals(0, header[40]);
        assertEquals(0, header[43]);
    }

    @Test
    public void headerForThirtySecondsLimit() {
        byte[] header = WavFile.header(960000);

        // 960 000 = 0x000EA600; RIFF-размер на 36 больше: 0x000EA624.
        assertArrayEquals(new byte[] { 0x24, (byte) 0xa6, 0x0e, 0x00 }, slice(header, 4));
        assertArrayEquals(new byte[] { 0x00, (byte) 0xa6, 0x0e, 0x00 }, slice(header, 40));
    }

    @Test(expected = IllegalArgumentException.class)
    public void negativeLengthIsRejected() {
        WavFile.header(-1);
    }

    @Test
    public void peakOfSilenceIsZero() {
        assertEquals(0, WavFile.peak(new byte[] { 0, 0, 0, 0 }, 4));
        assertEquals(0, WavFile.peak(new byte[0], 0));
    }

    @Test
    public void peakTakesAbsoluteValueOfLittleEndianSamples() {
        // 1000 = 0x03E8, −2000 = 0xF830.
        byte[] pcm = { (byte) 0xe8, 0x03, 0x30, (byte) 0xf8 };

        assertEquals(2000, WavFile.peak(pcm, 4));
    }

    @Test
    public void peakReachesBothLimits() {
        assertEquals(32767, WavFile.peak(new byte[] { (byte) 0xff, 0x7f }, 2));
        assertEquals(32768, WavFile.peak(new byte[] { 0x00, (byte) 0x80 }, 2));
    }

    @Test
    public void peakIgnoresBytesBeyondLengthAndOddTail() {
        byte[] pcm = { 0x10, 0x00, (byte) 0xff, 0x7f, 0x55 };

        assertEquals(16, WavFile.peak(pcm, 2));
        assertEquals(32767, WavFile.peak(pcm, 5));
    }

    @Test
    public void durationFromBytes() {
        assertEquals(0, WavFile.durationMs(0));
        assertEquals(0, WavFile.durationMs(31));
        assertEquals(1, WavFile.durationMs(32));
        assertEquals(500, WavFile.durationMs(16000));
        assertEquals(30000, WavFile.durationMs(960000));
    }

    private static byte[] slice(byte[] source, int offset) {
        return new byte[] { source[offset], source[offset + 1], source[offset + 2], source[offset + 3] };
    }
}
