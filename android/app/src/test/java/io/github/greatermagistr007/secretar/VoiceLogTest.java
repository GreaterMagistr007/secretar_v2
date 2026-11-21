package io.github.greatermagistr007.secretar;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.junit.Test;

/** Тесты ротации журнала голосовых нажатий. */
public class VoiceLogTest {

    private static String press(int number) {
        return "{\"kind\":\"press\",\"n\":" + number + ",\"recording\":{\"file\":\"voice-" + number + ".wav\"}}";
    }

    private static final String ENGINE = "{\"kind\":\"engine\",\"backend\":\"GPU\"}";

    @Test
    public void pressIsRecognizedOnlyByLeadingKind() {
        assertTrue(VoiceLog.isPress(press(1)));
        assertFalse(VoiceLog.isPress(ENGINE));
        assertFalse(VoiceLog.isPress("{\"at\":1,\"kind\":\"press\"}"));
        assertFalse(VoiceLog.isPress(""));
    }

    @Test
    public void countsOnlyPresses() {
        assertEquals(0, VoiceLog.countPresses(Collections.emptyList()));
        assertEquals(2, VoiceLog.countPresses(Arrays.asList(ENGINE, press(1), ENGINE, press(2))));
    }

    @Test
    public void fewerPressesThanLimitKeepsEverything() {
        List<String> lines = Arrays.asList(ENGINE, press(1), press(2));

        assertEquals(lines, VoiceLog.trim(lines, 3));
        assertEquals(lines, VoiceLog.trim(lines, 30));
        assertEquals(Collections.emptyList(), VoiceLog.trim(Collections.emptyList(), 30));
    }

    @Test
    public void exactlyLimitKeepsLinesFromFirstPress() {
        List<String> lines = Arrays.asList(ENGINE, press(1), ENGINE, press(2));

        // Ровно два нажатия при пределе 2: запись движка до первого нажатия уходит.
        assertEquals(Arrays.asList(press(1), ENGINE, press(2)), VoiceLog.trim(lines, 2));
    }

    @Test
    public void overLimitDropsOldestPressAndEverythingBeforeIt() {
        List<String> lines = new ArrayList<>();

        for (int number = 1; number <= 31; number++) {
            lines.add(press(number));
        }

        lines.add(ENGINE);

        List<String> kept = VoiceLog.trim(lines, VoiceLog.MAX_PRESSES);

        assertEquals(31, kept.size());
        assertEquals(press(2), kept.get(0));
        assertEquals(ENGINE, kept.get(30));
        assertEquals(30, VoiceLog.countPresses(kept));
    }

    @Test
    public void engineLinesAfterNewestPressAreKept() {
        List<String> lines = Arrays.asList(press(1), press(2), ENGINE);

        assertEquals(Arrays.asList(press(2), ENGINE), VoiceLog.trim(lines, 1));
    }

    @Test
    public void orphansAreFilesNotMentionedInKeptLines() {
        List<String> kept = Arrays.asList(press(2), ENGINE, press(3));
        List<String> files = Arrays.asList("voice-1.wav", "voice-2.wav", "voice-3.wav");

        assertEquals(Collections.singletonList("voice-1.wav"), VoiceLog.orphans(kept, files));
    }

    @Test
    public void nameMustBeQuotedWholeNotSuffix() {
        // «e-11.wav» — хвост упомянутого «voice-11.wav»: без кавычек поиск счёл бы его упомянутым.
        List<String> kept = Collections.singletonList(press(11));

        assertEquals(Collections.singletonList("e-11.wav"),
                VoiceLog.orphans(kept, Arrays.asList("e-11.wav", "voice-11.wav")));
    }

    @Test
    public void emptyLogMakesEveryFileOrphanAndNoFilesNoOrphans() {
        assertEquals(Arrays.asList("a.wav", "b.wav"),
                VoiceLog.orphans(Collections.emptyList(), Arrays.asList("a.wav", "b.wav")));
        assertEquals(Collections.emptyList(), VoiceLog.orphans(Arrays.asList(press(1)), Collections.emptyList()));
    }
}
