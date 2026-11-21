package io.github.greatermagistr007.secretar;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import java.util.TimeZone;

/**
 * Постоянное уведомление о незавершённых задачах дня (требование Т-31, решения Р-30 и Р-31).
 *
 * Один приёмник на все поводы пересчёта — повторный показ смахнутого уведомления, будильник
 * полуночи, загрузка телефона, смена времени и часового пояса, обновление приложения: на каждый
 * из них ответ один и тот же — {@link #refresh(Context)}.
 *
 * Задачи нативная часть не видит (они в IndexedDB внутри WebView): веб-часть заранее передаёт
 * через {@link TaskNotifierPlugin} числа по дням, здесь из них выбирается число на сегодня.
 */
public class TaskNotifierReceiver extends BroadcastReceiver {

    /** Хранилище настройки и списка чисел. */
    static final String PREFS = "task_notifier";

    static final String KEY_ENABLED = "enabled";

    static final String KEY_COUNTS = "counts";

    private static final String CHANNEL_ID = "pending_tasks";

    private static final int NOTIFICATION_ID = 1;

    private static final String ACTION_RESHOW = "io.github.greatermagistr007.secretar.RESHOW";

    private static final String ACTION_MIDNIGHT = "io.github.greatermagistr007.secretar.MIDNIGHT";

    @Override
    public void onReceive(Context context, Intent intent) {
        refresh(context);
    }

    /**
     * Приводит уведомление и будильник в соответствие с сохранённым состоянием: показывает
     * уведомление, если пункт включён и на сегодня есть незавершённые задачи, иначе снимает;
     * будильник на ближайшую полночь ставится, пока пункт включён.
     *
     * {@code synchronized}: вызывается и из потока плагинов Capacitor ({@link TaskNotifierPlugin}),
     * и из главного потока (этот приёмник). Без блокировки вызов, прочитавший старые числа, мог бы
     * выполнить {@code notify} последним и оставить в шторке устаревшее число.
     */
    static synchronized void refresh(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        boolean enabled = prefs.getBoolean(KEY_ENABLED, false);
        long now = System.currentTimeMillis();
        TimeZone zone = TimeZone.getDefault();
        int count = TaskCounts.countToShow(enabled, prefs.getString(KEY_COUNTS, ""), now, zone);

        if (count > 0) {
            show(context, count);
        } else {
            NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID);
        }

        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        PendingIntent midnight = broadcast(context, ACTION_MIDNIGHT);

        if (enabled) {
            // Неточный будильник: точные требуют отдельного разрешения. Система даёт ему окно
            // до часа после полуночи (dumpsys alarm на Android 15: window=+1h0m0s), в корзинах
            // App Standby rare/restricted — дольше; смена числа в шторке это допускает.
            // allowWhileIdle — срабатывает и в Doze.
            alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, TaskCounts.nextMidnight(now, zone), midnight);
        } else {
            alarms.cancel(midnight);
        }
    }

    /** Показывает или обновляет уведомление; без разрешения на уведомления ничего не делает. */
    private static void show(Context context, int count) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                        != PackageManager.PERMISSION_GRANTED) {
            return;
        }

        NotificationManagerCompat manager = NotificationManagerCompat.from(context);

        if (!manager.areNotificationsEnabled()) {
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Низкая важность — без звука и всплывающего баннера; повторный показ после
            // смахивания не должен звенеть и вибрировать каждый раз.
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "Задачи на сегодня", NotificationManager.IMPORTANCE_LOW);

            channel.setShowBadge(false);
            context.getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }

        Intent open = new Intent(context, MainActivity.class)
                .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent content = PendingIntent.getActivity(
                context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification notification = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_tasks)
                .setContentTitle(TaskCounts.title(count))
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setSilent(true)
                .setShowWhen(false)
                .setContentIntent(content)
                // С Android 14 флаг ongoing не защищает от смахивания: смахнутое уведомление
                // возвращается через этот же приёмник (решение Р-30).
                .setDeleteIntent(broadcast(context, ACTION_RESHOW))
                .build();

        manager.notify(NOTIFICATION_ID, notification);
    }

    /** Явный broadcast в этот приёмник. Приёмник не экспортируется — чужие приложения его не вызовут. */
    private static PendingIntent broadcast(Context context, String action) {
        Intent intent = new Intent(context, TaskNotifierReceiver.class).setAction(action);

        return PendingIntent.getBroadcast(
                context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
