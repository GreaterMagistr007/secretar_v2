package io.github.greatermagistr007.secretar;

import android.app.DownloadManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

/**
 * Докачка модели для голоса из локальной сети (решение Р-36). Качает системный DownloadManager:
 * он сам продолжает загрузку после обрыва, работает при свёрнутом приложении и показывает
 * прогресс в шторке. Файл ложится в каталог приложения {@code getExternalFilesDir("models")}:
 * DownloadManager пишет только во внешнее хранилище, во внутренний {@code filesDir} у него
 * доступа нет; этот каталог приватен для приложения, не требует разрешений и удаляется
 * вместе с приложением.
 *
 * Номер загрузки хранится в SharedPreferences, поэтому после перезапуска приложения
 * состояние восстанавливается. Одновременно идёт не больше одной загрузки.
 */
@CapacitorPlugin(name = "ModelDownloader")
public class ModelDownloaderPlugin extends Plugin {

    /** Подкаталог моделей в {@code getExternalFilesDir}. */
    static final String MODELS_DIR = "models";

    private static final String PREFS = "model_downloader";

    private static final String KEY_ID = "download_id";

    private static final String KEY_FILE = "file_name";

    private static final long NO_DOWNLOAD = -1;

    /** Ставит файл на скачивание: {@code { url, fileName, size, title }}. Прежняя загрузка и файл отбрасываются. */
    @PluginMethod
    public void start(PluginCall call) {
        String url = call.getString("url");
        String fileName = call.getString("fileName");
        String title = call.getString("title", fileName);
        // optLong, а не getLong: getLong Capacitor отдаёт null для числа, уместившегося в int.
        long size = call.getData().optLong("size", 0);

        if (url == null || !ModelDownloadState.isSafeFileName(fileName) || size <= 0) {
            call.reject("Неверные параметры загрузки модели");

            return;
        }

        File target = modelFile(fileName);

        if (target == null) {
            call.reject("Хранилище приложения недоступно");

            return;
        }

        DownloadManager.Request request;

        try {
            request = new DownloadManager.Request(Uri.parse(url));
        } catch (IllegalArgumentException error) {
            // DownloadManager принимает только http и https.
            call.reject("Неверный адрес файла модели: " + url);

            return;
        }

        cancelActive();

        // DownloadManager не перезаписывает существующий файл, а качает рядом под другим именем.
        if (target.exists() && !target.delete()) {
            call.reject("Не удалось удалить прежний файл модели");

            return;
        }

        request.setTitle(title)
                .setDescription("Модель для голосового управления")
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE)
                .setDestinationInExternalFilesDir(getContext(), MODELS_DIR, fileName);

        long id = downloadManager().enqueue(request);

        prefs().edit().putLong(KEY_ID, id).putString(KEY_FILE, fileName).apply();
        call.resolve(toJson(readState(fileName, size)));
    }

    /**
     * Состояние файла {@code { fileName, size }}. Завершившаяся загрузка забывается: успешная —
     * дальше состояние берётся по файлу, ошибочная — отдаётся один раз и убирается вместе с
     * недокачанным файлом.
     */
    @PluginMethod
    public void status(PluginCall call) {
        String fileName = call.getString("fileName");
        // optLong, а не getLong: getLong Capacitor отдаёт null для числа, уместившегося в int.
        long size = call.getData().optLong("size", 0);

        if (!ModelDownloadState.isSafeFileName(fileName) || size <= 0) {
            call.reject("Неверные параметры модели");

            return;
        }

        if (modelFile(fileName) == null) {
            call.reject("Хранилище приложения недоступно");

            return;
        }

        call.resolve(toJson(readState(fileName, size)));
    }

    /** Отменяет идущую загрузку; DownloadManager удаляет и недокачанный файл. */
    @PluginMethod
    public void cancel(PluginCall call) {
        cancelActive();
        call.resolve();
    }

    /** Удаляет файл модели {@code { fileName }}, отменив его загрузку, если она идёт. */
    @PluginMethod
    public void remove(PluginCall call) {
        String fileName = call.getString("fileName");

        if (!ModelDownloadState.isSafeFileName(fileName)) {
            call.reject("Неверное имя файла модели");

            return;
        }

        File target = modelFile(fileName);

        if (target == null) {
            call.reject("Хранилище приложения недоступно");

            return;
        }

        if (fileName.equals(prefs().getString(KEY_FILE, null))) {
            cancelActive();
        }

        if (target.exists() && !target.delete()) {
            call.reject("Не удалось удалить файл модели");

            return;
        }

        call.resolve();
    }

    /** Состояние по запомненной загрузке, а без неё — по файлу в каталоге моделей. */
    private ModelDownloadState readState(String fileName, long expectedSize) {
        SharedPreferences prefs = prefs();
        long id = prefs.getLong(KEY_ID, NO_DOWNLOAD);
        File target = modelFile(fileName);

        if (id != NO_DOWNLOAD && fileName.equals(prefs.getString(KEY_FILE, null))) {
            DownloadManager manager = downloadManager();

            try (Cursor cursor = manager.query(new DownloadManager.Query().setFilterById(id))) {
                if (cursor != null && cursor.moveToFirst()) {
                    int status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
                    ModelDownloadState state = ModelDownloadState.fromDownload(
                            status,
                            cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON)),
                            cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR)),
                            cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES)),
                            target == null ? -1 : target.length(),
                            expectedSize);

                    if (status == DownloadManager.STATUS_SUCCESSFUL || status == DownloadManager.STATUS_FAILED) {
                        // Успешную загрузку с верным размером только забываем: remove удалил бы и готовый файл.
                        // Ошибку и файл не того размера убирает remove вместе с файлом.
                        if (ModelDownloadState.ERROR.equals(state.kind)) {
                            manager.remove(id);
                        }

                        forget();
                    }

                    return state;
                }
            }

            // Записи нет: загрузку отменили в системном приложении «Загрузки» или система её удалила.
            forget();
        }

        if (target == null || !target.exists()) {
            return ModelDownloadState.absent();
        }

        if (target.length() == expectedSize) {
            return ModelDownloadState.downloaded(target.length());
        }

        // Остаток не той длины без загрузки — мусор, место освобождается.
        if (!target.delete()) {
            return ModelDownloadState.error("Не удалось удалить неполный файл модели");
        }

        return ModelDownloadState.absent();
    }

    private void cancelActive() {
        long id = prefs().getLong(KEY_ID, NO_DOWNLOAD);

        if (id != NO_DOWNLOAD) {
            downloadManager().remove(id);
        }

        forget();
    }

    private void forget() {
        prefs().edit().remove(KEY_ID).remove(KEY_FILE).apply();
    }

    /** Файл модели в каталоге приложения; null — внешнее хранилище недоступно. */
    private File modelFile(String fileName) {
        File dir = getContext().getExternalFilesDir(MODELS_DIR);

        return dir == null ? null : new File(dir, fileName);
    }

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private DownloadManager downloadManager() {
        return (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
    }

    /** Ответ веб-части; неизвестные поля не передаются — веб-часть читает их как null. */
    private static JSObject toJson(ModelDownloadState state) {
        JSObject result = new JSObject();

        result.put("state", state.kind);

        switch (state.kind) {
            case ModelDownloadState.DOWNLOADING:
                result.put("downloaded", state.downloaded);

                if (state.total > 0) {
                    result.put("total", state.total);
                }

                if (state.paused != null) {
                    result.put("paused", state.paused);
                }

                break;
            case ModelDownloadState.DOWNLOADED:
                result.put("size", state.total);
                break;
            case ModelDownloadState.ERROR:
                result.put("reason", state.reason);
                break;
            default:
                break;
        }

        return result;
    }
}
