package io.github.greatermagistr007.secretar;

import java.util.ArrayList;
import java.util.List;

/**
 * Ротация журнала голосовых нажатий. Чистая логика без Android, покрыта JUnit-тестами.
 *
 * Журнал — файл JSON Lines: запись нажатия начинается с {@code {"kind":"press"}, запись загрузки
 * движка — с {@code {"kind":"engine"}. Хранятся последние {@link #MAX_PRESSES} нажатий; записи
 * загрузки движка старше самого раннего сохранённого нажатия уходят вместе с ним. WAV-файл
 * нажатия хранится, пока его имя упомянуто в журнале.
 */
final class VoiceLog {

    static final int MAX_PRESSES = 30;

    static final String PRESS_PREFIX = "{\"kind\":\"press\"";

    private VoiceLog() {
    }

    static boolean isPress(String line) {
        return line.startsWith(PRESS_PREFIX);
    }

    static int countPresses(List<String> lines) {
        int count = 0;

        for (String line : lines) {
            if (isPress(line)) {
                count++;
            }
        }

        return count;
    }

    /** Строки, которые остаются: последние {@code maxPresses} нажатий и всё, что записано после первого из них. */
    static List<String> trim(List<String> lines, int maxPresses) {
        int presses = 0;

        for (int index = lines.size() - 1; index >= 0; index--) {
            if (isPress(lines.get(index))) {
                presses++;

                if (presses == maxPresses) {
                    return new ArrayList<>(lines.subList(index, lines.size()));
                }
            }
        }

        return new ArrayList<>(lines);
    }

    /** Имена файлов, ни разу не упомянутые в строках журнала (в кавычках, как значение JSON). */
    static List<String> orphans(List<String> lines, List<String> fileNames) {
        List<String> orphans = new ArrayList<>();

        for (String name : fileNames) {
            String quoted = "\"" + name + "\"";
            boolean mentioned = false;

            for (String line : lines) {
                if (line.contains(quoted)) {
                    mentioned = true;
                    break;
                }
            }

            if (!mentioned) {
                orphans.add(name);
            }
        }

        return orphans;
    }
}
