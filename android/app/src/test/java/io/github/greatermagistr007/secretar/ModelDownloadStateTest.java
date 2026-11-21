package io.github.greatermagistr007.secretar;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/**
 * Тесты чистой логики докачки модели. Коды DownloadManager записаны числами из документации
 * Android, а не константами: тест сверяет и сами значения, на которые опирается класс.
 */
public class ModelDownloadStateTest {

    private static final long SIZE = 2588147712L;

    private static final int STATUS_PENDING = 1;

    private static final int STATUS_RUNNING = 2;

    private static final int STATUS_PAUSED = 4;

    private static final int STATUS_SUCCESSFUL = 8;

    private static final int STATUS_FAILED = 16;

    @Test
    public void pendingAndRunningAreDownloadingWithoutPause() {
        ModelDownloadState pending = ModelDownloadState.fromDownload(STATUS_PENDING, 0, 0, -1, -1, SIZE);
        ModelDownloadState running = ModelDownloadState.fromDownload(STATUS_RUNNING, 0, 254111299, SIZE, -1, SIZE);

        assertEquals(ModelDownloadState.DOWNLOADING, pending.kind);
        assertEquals(0, pending.downloaded);
        assertEquals(-1, pending.total);
        assertNull(pending.paused);
        assertEquals(ModelDownloadState.DOWNLOADING, running.kind);
        assertEquals(254111299, running.downloaded);
        assertEquals(SIZE, running.total);
        assertNull(running.paused);
    }

    @Test
    public void unknownOrZeroTotalBecomesMinusOneAndNegativeDownloadedBecomesZero() {
        assertEquals(-1, ModelDownloadState.fromDownload(STATUS_RUNNING, 0, 10, 0, -1, SIZE).total);
        assertEquals(0, ModelDownloadState.fromDownload(STATUS_RUNNING, 0, -5, SIZE, -1, SIZE).downloaded);
    }

    @Test
    public void pausedIsDownloadingWithReason() {
        ModelDownloadState waiting = ModelDownloadState.fromDownload(STATUS_PAUSED, 1, 1000, SIZE, -1, SIZE);

        assertEquals(ModelDownloadState.DOWNLOADING, waiting.kind);
        assertEquals(1000, waiting.downloaded);
        assertEquals("Нет связи с сервером, повтор через некоторое время", waiting.paused);
    }

    @Test
    public void pausedReasonsForEveryCode() {
        assertEquals("Нет связи с сервером, повтор через некоторое время", ModelDownloadState.pausedReason(1));
        assertEquals("Ждёт подключения к сети", ModelDownloadState.pausedReason(2));
        assertEquals("Ждёт Wi-Fi", ModelDownloadState.pausedReason(3));
        assertEquals("Загрузка приостановлена", ModelDownloadState.pausedReason(4));
        assertEquals("Загрузка приостановлена", ModelDownloadState.pausedReason(0));
    }

    @Test
    public void successfulWithExpectedSizeIsDownloaded() {
        ModelDownloadState state = ModelDownloadState.fromDownload(STATUS_SUCCESSFUL, 0, SIZE, SIZE, SIZE, SIZE);

        assertEquals(ModelDownloadState.DOWNLOADED, state.kind);
        assertEquals(SIZE, state.total);
        assertNull(state.reason);
    }

    @Test
    public void successfulWithOtherSizeIsErrorBothShorterAndLonger() {
        ModelDownloadState shorter = ModelDownloadState.fromDownload(STATUS_SUCCESSFUL, 0, 100, 100, SIZE - 1, SIZE);
        ModelDownloadState longer = ModelDownloadState.fromDownload(STATUS_SUCCESSFUL, 0, 100, 100, SIZE + 1, SIZE);
        ModelDownloadState missing = ModelDownloadState.fromDownload(STATUS_SUCCESSFUL, 0, 100, 100, -1, SIZE);

        assertEquals(ModelDownloadState.ERROR, shorter.kind);
        assertEquals("Размер скачанного файла 2588147711 байт, ожидалось 2588147712 — файл удалён", shorter.reason);
        assertEquals(ModelDownloadState.ERROR, longer.kind);
        assertEquals(ModelDownloadState.ERROR, missing.kind);
    }

    @Test
    public void failedIsErrorWithReason() {
        ModelDownloadState state = ModelDownloadState.fromDownload(STATUS_FAILED, 404, 0, -1, -1, SIZE);

        assertEquals(ModelDownloadState.ERROR, state.kind);
        assertEquals("На сервере нет файла модели (HTTP 404)", state.reason);
    }

    @Test
    public void unknownStatusIsError() {
        assertEquals("Неизвестное состояние загрузки: 3", ModelDownloadState.fromDownload(3, 0, 0, -1, -1, SIZE).reason);
    }

    @Test
    public void failureReasonsForDownloadManagerErrors() {
        assertEquals("Не удалось скачать модель (код 1000): проверьте адрес сервера и что он запущен",
                ModelDownloadState.failureReason(1000));
        assertEquals("Ошибка записи файла на телефоне", ModelDownloadState.failureReason(1001));
        assertEquals("Сервер ответил непонятным кодом", ModelDownloadState.failureReason(1002));
        assertEquals("Нет связи с сервером: проверьте адрес и что раздача запущена", ModelDownloadState.failureReason(1004));
        assertEquals("Сервер слишком много раз перенаправил запрос", ModelDownloadState.failureReason(1005));
        assertEquals("Недостаточно места на телефоне", ModelDownloadState.failureReason(1006));
        assertEquals("Хранилище телефона недоступно", ModelDownloadState.failureReason(1007));
        assertEquals("Загрузку нельзя продолжить после обрыва — скачайте заново", ModelDownloadState.failureReason(1008));
        assertEquals("Файл модели уже есть на телефоне", ModelDownloadState.failureReason(1009));
    }

    @Test
    public void failureReasonsForHttpCodesAndBoundaries() {
        assertEquals("Загрузка отклонена (код 400): сервер не принял запрос или приложению запрещён HTTP без шифрования",
                ModelDownloadState.failureReason(400));
        assertEquals("Сервер ответил ошибкой HTTP 401", ModelDownloadState.failureReason(401));
        assertEquals("Сервер ответил ошибкой HTTP 403", ModelDownloadState.failureReason(403));
        assertEquals("Сервер ответил ошибкой HTTP 599", ModelDownloadState.failureReason(599));
        assertEquals("Не удалось скачать модель (код 399): проверьте адрес сервера и что он запущен",
                ModelDownloadState.failureReason(399));
        assertEquals("Не удалось скачать модель (код 600): проверьте адрес сервера и что он запущен",
                ModelDownloadState.failureReason(600));
    }

    @Test
    public void absentAndDownloadedFactories() {
        assertEquals(ModelDownloadState.ABSENT, ModelDownloadState.absent().kind);
        assertEquals(SIZE, ModelDownloadState.downloaded(SIZE).total);
    }

    @Test
    public void safeFileNameAcceptsPlainName() {
        assertTrue(ModelDownloadState.isSafeFileName("gemma-4-E2B-it.litertlm"));
        assertTrue(ModelDownloadState.isSafeFileName("a"));
        assertTrue(ModelDownloadState.isSafeFileName("..model"));
    }

    @Test
    public void safeFileNameRejectsPathsAndEmpty() {
        assertFalse(ModelDownloadState.isSafeFileName(null));
        assertFalse(ModelDownloadState.isSafeFileName(""));
        assertFalse(ModelDownloadState.isSafeFileName("."));
        assertFalse(ModelDownloadState.isSafeFileName(".."));
        assertFalse(ModelDownloadState.isSafeFileName("../x"));
        assertFalse(ModelDownloadState.isSafeFileName("dir/x"));
        assertFalse(ModelDownloadState.isSafeFileName("dir\\x"));
        assertFalse(ModelDownloadState.isSafeFileName("x\0y"));
    }
}
