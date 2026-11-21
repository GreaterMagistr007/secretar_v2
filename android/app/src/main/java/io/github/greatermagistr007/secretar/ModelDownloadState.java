package io.github.greatermagistr007.secretar;

import android.app.DownloadManager;

/**
 * Состояние файла модели для голоса (решение Р-36) и чистая логика его определения по записи
 * DownloadManager: какое состояние показать, текст причины ошибки или паузы, проверка размера.
 *
 * Из Android здесь только константы DownloadManager: они целочисленные константы времени
 * компиляции и подставляются javac в код, поэтому класс проверяется JUnit-тестами без эмулятора.
 */
final class ModelDownloadState {

    static final String ABSENT = "absent";

    static final String DOWNLOADING = "downloading";

    static final String DOWNLOADED = "downloaded";

    static final String ERROR = "error";

    /** Вид состояния — одна из констант выше; веб-часть разбирает его по этому же слову. */
    final String kind;

    /** Скачано байт (качается). */
    final long downloaded;

    /** Размер файла: всего байт (качается, -1 — неизвестен) или размер готового файла (скачана). */
    final long total;

    /** Почему загрузка стоит; null — идёт или не качается. */
    final String paused;

    /** Причина ошибки; null — не ошибка. */
    final String reason;

    private ModelDownloadState(String kind, long downloaded, long total, String paused, String reason) {
        this.kind = kind;
        this.downloaded = downloaded;
        this.total = total;
        this.paused = paused;
        this.reason = reason;
    }

    static ModelDownloadState absent() {
        return new ModelDownloadState(ABSENT, 0, -1, null, null);
    }

    static ModelDownloadState downloading(long downloaded, long total, String paused) {
        return new ModelDownloadState(DOWNLOADING, Math.max(0, downloaded), total > 0 ? total : -1, paused, null);
    }

    static ModelDownloadState downloaded(long size) {
        return new ModelDownloadState(DOWNLOADED, size, size, null, null);
    }

    static ModelDownloadState error(String reason) {
        return new ModelDownloadState(ERROR, 0, -1, null, reason);
    }

    /**
     * Состояние по записи DownloadManager. Успешная загрузка признаётся скачанной только при
     * размере файла, равном ожидаемому: сервер мог отдать другой файл или обрезанный.
     *
     * @param status   COLUMN_STATUS
     * @param reason   COLUMN_REASON: код HTTP или ERROR_* при ошибке, PAUSED_* при паузе
     * @param fileSize размер файла на устройстве (имеет смысл после успешной загрузки)
     */
    static ModelDownloadState fromDownload(int status, int reason, long downloaded, long total, long fileSize, long expectedSize) {
        switch (status) {
            case DownloadManager.STATUS_PENDING:
            case DownloadManager.STATUS_RUNNING:
                return downloading(downloaded, total, null);
            case DownloadManager.STATUS_PAUSED:
                return downloading(downloaded, total, pausedReason(reason));
            case DownloadManager.STATUS_SUCCESSFUL:
                return fileSize == expectedSize ? downloaded(fileSize) : error(sizeMismatch(fileSize, expectedSize));
            case DownloadManager.STATUS_FAILED:
                return error(failureReason(reason));
            default:
                return error("Неизвестное состояние загрузки: " + status);
        }
    }

    /** Текст причины, по которой загрузка стоит. */
    static String pausedReason(int reason) {
        switch (reason) {
            case DownloadManager.PAUSED_WAITING_TO_RETRY:
                return "Нет связи с сервером, повтор через некоторое время";
            case DownloadManager.PAUSED_WAITING_FOR_NETWORK:
                return "Ждёт подключения к сети";
            case DownloadManager.PAUSED_QUEUED_FOR_WIFI:
                return "Ждёт Wi-Fi";
            default:
                return "Загрузка приостановлена";
        }
    }

    /** Текст причины ошибки загрузки: код HTTP или ERROR_* DownloadManager. */
    static String failureReason(int reason) {
        switch (reason) {
            case DownloadManager.ERROR_CANNOT_RESUME:
                return "Загрузку нельзя продолжить после обрыва — скачайте заново";
            case DownloadManager.ERROR_DEVICE_NOT_FOUND:
                return "Хранилище телефона недоступно";
            case DownloadManager.ERROR_FILE_ALREADY_EXISTS:
                return "Файл модели уже есть на телефоне";
            case DownloadManager.ERROR_FILE_ERROR:
                return "Ошибка записи файла на телефоне";
            case DownloadManager.ERROR_HTTP_DATA_ERROR:
                // Так DownloadManager завершает и обрыв посреди передачи, и неудачное подключение
                // после исчерпания повторов (проверено на Android 15: «Failed to connect»).
                return "Нет связи с сервером: проверьте адрес и что раздача запущена";
            case DownloadManager.ERROR_INSUFFICIENT_SPACE:
                return "Недостаточно места на телефоне";
            case DownloadManager.ERROR_TOO_MANY_REDIRECTS:
                return "Сервер слишком много раз перенаправил запрос";
            case DownloadManager.ERROR_UNHANDLED_HTTP_CODE:
                return "Сервер ответил непонятным кодом";
            case 400:
                // 400 ставит и сам DownloadManager, не обращаясь к серверу: так он отказывает
                // в HTTP без шифрования, если приложению он запрещён (проверено на Android 15).
                return "Загрузка отклонена (код 400): сервер не принял запрос или приложению запрещён HTTP без шифрования";
            case 404:
                return "На сервере нет файла модели (HTTP 404)";
            default:
                if (reason >= 400 && reason < 600) {
                    return "Сервер ответил ошибкой HTTP " + reason;
                }

                return "Не удалось скачать модель (код " + reason + "): проверьте адрес сервера и что он запущен";
        }
    }

    static String sizeMismatch(long actual, long expected) {
        return "Размер скачанного файла " + actual + " байт, ожидалось " + expected + " — файл удалён";
    }

    /**
     * Пригодно ли имя файла: только имя, без каталогов. Плагин по нему удаляет файл, и имя вида
     * «../x» вышло бы за пределы каталога моделей.
     */
    static boolean isSafeFileName(String name) {
        return name != null
                && !name.isEmpty()
                && !name.equals(".")
                && !name.equals("..")
                && name.indexOf('/') < 0
                && name.indexOf('\\') < 0
                && name.indexOf('\0') < 0;
    }
}
