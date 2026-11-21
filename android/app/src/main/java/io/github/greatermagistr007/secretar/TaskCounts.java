package io.github.greatermagistr007.secretar;

import java.util.Calendar;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.TimeZone;
import java.util.regex.Pattern;

/**
 * Чистая логика уведомления о незавершённых задачах дня: формат хранения списка чисел по дням,
 * выбор числа на дату, расчёт ближайшей полуночи и текст уведомления.
 *
 * Android API здесь не используется намеренно — класс проверяется JUnit-тестами в сборке Gradle
 * без эмулятора. Даты — плавающие строки YYYY-MM-DD, как в веб-части.
 */
final class TaskCounts {

    /** Формат даты, который передаёт веб-часть. Существование дня не проверяется: такой ключ просто не совпадёт ни с одним днём. */
    private static final Pattern DATE = Pattern.compile("\\d{4}-\\d{2}-\\d{2}");

    private TaskCounts() {
    }

    /** Пригодна ли пара «день — число» к хранению: дата в формате YYYY-MM-DD, число не отрицательное. */
    static boolean isValid(String date, int count) {
        return date != null && DATE.matcher(date).matches() && count >= 0;
    }

    /** Список в строку хранения: по строке «YYYY-MM-DD=число» на день. */
    static String serialize(Map<String, Integer> counts) {
        StringBuilder result = new StringBuilder();

        for (Map.Entry<String, Integer> entry : counts.entrySet()) {
            if (result.length() > 0) {
                result.append('\n');
            }

            result.append(entry.getKey()).append('=').append(entry.getValue());
        }

        return result.toString();
    }

    /**
     * Строка хранения обратно в список. Испорченные строки пропускаются, а не роняют разбор:
     * уведомление по остальным дням важнее одной нечитаемой записи.
     */
    static Map<String, Integer> parse(String stored) {
        Map<String, Integer> result = new LinkedHashMap<>();

        if (stored == null || stored.isEmpty()) {
            return result;
        }

        for (String line : stored.split("\n")) {
            int separator = line.indexOf('=');

            if (separator < 0) {
                continue;
            }

            String date = line.substring(0, separator);
            int count;

            try {
                count = Integer.parseInt(line.substring(separator + 1));
            } catch (NumberFormatException error) {
                continue;
            }

            if (isValid(date, count)) {
                result.put(date, count);
            }
        }

        return result;
    }

    /** Число незавершённых задач на день; день вне списка — ноль, уведомления нет. */
    static int countFor(Map<String, Integer> counts, String date) {
        Integer count = counts.get(date);

        return count == null ? 0 : count;
    }

    /**
     * Число для уведомления в момент {@code millis}: число на сегодняшний день из строки хранения,
     * если пункт включён, иначе ноль. Ноль означает «уведомления нет».
     */
    static int countToShow(boolean enabled, String stored, long millis, TimeZone zone) {
        return enabled ? countFor(parse(stored), dateKey(millis, zone)) : 0;
    }

    /** День момента времени в часовом поясе устройства, YYYY-MM-DD. */
    static String dateKey(long millis, TimeZone zone) {
        Calendar calendar = Calendar.getInstance(zone, Locale.ROOT);

        calendar.setTimeInMillis(millis);

        return String.format(
                Locale.ROOT,
                "%04d-%02d-%02d",
                calendar.get(Calendar.YEAR),
                calendar.get(Calendar.MONTH) + 1,
                calendar.get(Calendar.DAY_OF_MONTH));
    }

    /**
     * Начало следующих суток после момента времени. Сутки прибавляются календарём, а не
     * константой 24 часа: в дни перевода часов сутки длятся 23 или 25 часов.
     */
    static long nextMidnight(long millis, TimeZone zone) {
        Calendar calendar = Calendar.getInstance(zone, Locale.ROOT);

        calendar.setTimeInMillis(millis);
        calendar.add(Calendar.DAY_OF_MONTH, 1);
        calendar.set(Calendar.HOUR_OF_DAY, 0);
        calendar.set(Calendar.MINUTE, 0);
        calendar.set(Calendar.SECOND, 0);
        calendar.set(Calendar.MILLISECOND, 0);

        return calendar.getTimeInMillis();
    }

    /** Заголовок уведомления. Число через двоеточие — без склонения «задача/задачи/задач». */
    static String title(int count) {
        return "Незавершённых задач на сегодня: " + count;
    }
}
