package io.github.greatermagistr007.secretar;

import android.Manifest;
import android.content.Context;
import android.os.Build;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import java.util.LinkedHashMap;
import java.util.Map;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Мост веб-части к уведомлению о задачах дня (решение Р-31). Веб-часть вызывает
 * {@code update({ enabled, counts })}, где counts — список {@code { date, count }} на 60 дней вперёд.
 *
 * Разрешение на уведомления (Android 13+) объявлено под псевдонимом {@code notifications};
 * на Android 12 и ниже разрешения нет, состояние берётся из системного запрета уведомлений.
 */
@CapacitorPlugin(
        name = "TaskNotifier",
        permissions = @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications"))
public class TaskNotifierPlugin extends Plugin {

    /** Сохраняет настройку и числа по дням и сразу пересчитывает уведомление и будильник. */
    @PluginMethod
    public void update(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        JSArray counts = call.getArray("counts", new JSArray());
        Map<String, Integer> parsed = new LinkedHashMap<>();

        try {
            for (int index = 0; index < counts.length(); index++) {
                JSONObject entry = counts.getJSONObject(index);
                String date = entry.getString("date");
                int count = entry.getInt("count");

                if (TaskCounts.isValid(date, count)) {
                    parsed.put(date, count);
                }
            }
        } catch (JSONException error) {
            call.reject("Неверный список чисел задач: " + error.getMessage());

            return;
        }

        Context context = getContext();

        context.getSharedPreferences(TaskNotifierReceiver.PREFS, Context.MODE_PRIVATE)
                .edit()
                .putBoolean(TaskNotifierReceiver.KEY_ENABLED, enabled)
                .putString(TaskNotifierReceiver.KEY_COUNTS, TaskCounts.serialize(parsed))
                .apply();
        TaskNotifierReceiver.refresh(context);
        call.resolve();
    }

    @Override
    @PluginMethod
    public void checkPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            call.resolve(legacyPermissionState());

            return;
        }

        super.checkPermissions(call);
    }

    @Override
    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            // Запрашивать нечего: до Android 13 уведомления разрешены, пока их не запретили в настройках.
            call.resolve(legacyPermissionState());

            return;
        }

        super.requestPermissions(call);
    }

    /** Состояние в формате Capacitor для Android 12 и ниже: только «разрешено» или «запрещено в настройках». */
    private JSObject legacyPermissionState() {
        JSObject result = new JSObject();

        result.put("notifications", NotificationManagerCompat.from(getContext()).areNotificationsEnabled() ? "granted" : "denied");

        return result;
    }
}
