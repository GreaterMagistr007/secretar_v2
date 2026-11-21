package io.github.greatermagistr007.secretar;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.TimeZone;
import org.junit.Test;

/** Тесты чистой логики уведомления. Данные захардкожены, Android и хранилище не участвуют. */
public class TaskCountsTest {

    private static final TimeZone NEW_YORK = TimeZone.getTimeZone("America/New_York");

    private static final TimeZone MOSCOW = TimeZone.getTimeZone("Europe/Moscow");

    private static final TimeZone UTC = TimeZone.getTimeZone("UTC");

    @Test
    public void isValidAcceptsDateAndZeroOrPositiveCount() {
        assertTrue(TaskCounts.isValid("2026-11-21", 0));
        assertTrue(TaskCounts.isValid("2026-11-21", 1));
        assertTrue(TaskCounts.isValid("2026-11-21", Integer.MAX_VALUE));
    }

    @Test
    public void isValidRejectsNegativeCountAndBadDate() {
        assertFalse(TaskCounts.isValid("2026-11-21", -1));
        assertFalse(TaskCounts.isValid(null, 1));
        assertFalse(TaskCounts.isValid("", 1));
        assertFalse(TaskCounts.isValid("21-11-2026", 1));
        assertFalse(TaskCounts.isValid("2026-11-2", 1));
        assertFalse(TaskCounts.isValid("2026-11-21 ", 1));
        assertFalse(TaskCounts.isValid("2026/11/21", 1));
    }

    @Test
    public void serializeEmptyMapGivesEmptyString() {
        assertEquals("", TaskCounts.serialize(new LinkedHashMap<>()));
    }

    @Test
    public void serializeKeepsOrderOneLinePerDay() {
        Map<String, Integer> counts = new LinkedHashMap<>();

        counts.put("2026-11-21", 3);
        counts.put("2026-11-22", 0);
        counts.put("2026-11-23", 12);

        assertEquals("2026-11-21=3\n2026-11-22=0\n2026-11-23=12", TaskCounts.serialize(counts));
    }

    @Test
    public void parseNullAndEmptyGiveEmptyMap() {
        assertTrue(TaskCounts.parse(null).isEmpty());
        assertTrue(TaskCounts.parse("").isEmpty());
    }

    @Test
    public void parseRoundTripsSerialize() {
        Map<String, Integer> counts = new LinkedHashMap<>();

        counts.put("2026-12-31", 2);
        counts.put("2027-01-01", 0);

        assertEquals(counts, TaskCounts.parse(TaskCounts.serialize(counts)));
    }

    @Test
    public void parseSkipsBrokenLinesAndKeepsGoodOnes() {
        String stored = String.join(
                "\n",
                "2026-11-21=3",
                "без разделителя",
                "2026-11-22=много",
                "2026-11-23=-1",
                "23-11-2026=4",
                "2026-11-24=",
                "=5",
                "2026-11-25=99999999999",
                "",
                "2026-11-26=1");

        Map<String, Integer> expected = new LinkedHashMap<>();

        expected.put("2026-11-21", 3);
        expected.put("2026-11-26", 1);

        assertEquals(expected, TaskCounts.parse(stored));
    }

    @Test
    public void parseLastDuplicateWins() {
        assertEquals(Integer.valueOf(5), TaskCounts.parse("2026-11-21=1\n2026-11-21=5").get("2026-11-21"));
    }

    @Test
    public void countForReturnsStoredCountOrZero() {
        Map<String, Integer> counts = new LinkedHashMap<>();

        counts.put("2026-11-21", 4);
        counts.put("2026-11-22", 0);

        assertEquals(4, TaskCounts.countFor(counts, "2026-11-21"));
        assertEquals(0, TaskCounts.countFor(counts, "2026-11-22"));
        assertEquals(0, TaskCounts.countFor(counts, "2026-11-23"));
        assertEquals(0, TaskCounts.countFor(new LinkedHashMap<>(), "2026-11-21"));
    }

    @Test
    public void countToShowDisabledIsZeroEvenWithCountForToday() {
        // 2026-11-21T03:30:00Z — 21 ноября по Москве.
        assertEquals(0, TaskCounts.countToShow(false, "2026-11-21=3", 1_795_231_800_000L, MOSCOW));
    }

    @Test
    public void countToShowEnabledWithoutRecordIsZero() {
        assertEquals(0, TaskCounts.countToShow(true, "", 1_795_231_800_000L, MOSCOW));
        assertEquals(0, TaskCounts.countToShow(true, null, 1_795_231_800_000L, MOSCOW));
    }

    @Test
    public void countToShowEnabledTakesCountForTodayInGivenZone() {
        // Тот же момент: в Москве уже 21 ноября, в Нью-Йорке ещё 20-е.
        String stored = "2026-11-20=2\n2026-11-21=3\n2026-11-22=7";

        assertEquals(3, TaskCounts.countToShow(true, stored, 1_795_231_800_000L, MOSCOW));
        assertEquals(2, TaskCounts.countToShow(true, stored, 1_795_231_800_000L, NEW_YORK));
    }

    @Test
    public void countToShowTodayZeroIsZero() {
        assertEquals(0, TaskCounts.countToShow(true, "2026-11-21=0\n2026-11-22=4", 1_795_231_800_000L, MOSCOW));
    }

    @Test
    public void countToShowBrokenStringIsZero() {
        assertEquals(0, TaskCounts.countToShow(true, "мусор\n2026-11-21=много\n=5", 1_795_231_800_000L, MOSCOW));
    }

    @Test
    public void dateKeyUsesGivenZone() {
        // 2026-11-21T03:30:00Z: в Нью-Йорке ещё 20 ноября, в Москве уже 21-е.
        long millis = 1_795_231_800_000L;

        assertEquals("2026-11-20", TaskCounts.dateKey(millis, NEW_YORK));
        assertEquals("2026-11-21", TaskCounts.dateKey(millis, MOSCOW));
        assertEquals("2026-11-21", TaskCounts.dateKey(millis, UTC));
    }

    @Test
    public void dateKeyPadsMonthAndDay() {
        // 2026-01-05T12:00:00Z.
        assertEquals("2026-01-05", TaskCounts.dateKey(1_767_614_400_000L, UTC));
    }

    @Test
    public void nextMidnightOrdinaryDay() {
        // 2026-11-21T15:00:00 по Москве (UTC+3) → 2026-11-22T00:00:00 по Москве = 2026-11-21T21:00:00Z.
        assertEquals(1_795_294_800_000L, TaskCounts.nextMidnight(1_795_262_400_000L, MOSCOW));
    }

    @Test
    public void nextMidnightAtExactMidnightIsNextDay() {
        // Ровно полночь 2026-11-22 по Москве → полночь 2026-11-23: будильник не срабатывает дважды подряд.
        assertEquals(1_795_381_200_000L, TaskCounts.nextMidnight(1_795_294_800_000L, MOSCOW));
    }

    @Test
    public void nextMidnightOneMillisecondBeforeMidnight() {
        assertEquals(1_795_294_800_000L, TaskCounts.nextMidnight(1_795_294_799_999L, MOSCOW));
    }

    @Test
    public void nextMidnightCrossesMonthAndYear() {
        // 2026-12-31T23:00:00Z → 2027-01-01T00:00:00Z.
        assertEquals(1_798_761_600_000L, TaskCounts.nextMidnight(1_798_758_000_000L, UTC));
    }

    @Test
    public void nextMidnightOnSpringForwardDayIs23HoursAway() {
        // 2026-03-08 в Нью-Йорке длится 23 часа: полночь 8-го — 05:00Z, полночь 9-го — 04:00Z.
        long dayStart = 1_772_946_000_000L;

        assertEquals(dayStart + 23 * 3_600_000L, TaskCounts.nextMidnight(dayStart, NEW_YORK));
    }

    @Test
    public void nextMidnightOnFallBackDayIs25HoursAway() {
        // 2026-11-01 в Нью-Йорке длится 25 часов: полночь 1-го — 04:00Z, полночь 2-го — 05:00Z.
        long dayStart = 1_793_505_600_000L;

        assertEquals(dayStart + 25 * 3_600_000L, TaskCounts.nextMidnight(dayStart, NEW_YORK));
    }

    @Test
    public void titleShowsCount() {
        assertEquals("Незавершённых задач на сегодня: 1", TaskCounts.title(1));
        assertEquals("Незавершённых задач на сегодня: 25", TaskCounts.title(25));
    }
}
