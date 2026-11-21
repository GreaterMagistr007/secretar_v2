/**
 * Мост к уведомлению о незавершённых задачах дня в Android-приложении (требования Т-30, Т-31;
 * решения Р-31, Р-32). Уведомление показывает нативная часть — локальный плагин TaskNotifier,
 * docs/mechanic_notifications.md. Сервер и push-сервис не участвуют.
 *
 * В браузере плагина нет: все функции, обращающиеся к нему, там ничего не делают.
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import type { PermissionState } from '@capacitor/core';
import { todayIso } from './date';
import { countPendingByDay, horizonDates } from './notification-counts';
import type { DayCount } from './notification-counts';
import { taskRepository } from './task-repository';

/** Методы нативного плагина; check/requestPermissions — стандартные методы Capacitor. */
interface TaskNotifierPlugin {
  /** Сохраняет настройку и числа по дням, сразу показывает или снимает уведомление. */
  update(options: { enabled: boolean; counts: DayCount[] }): Promise<void>;
  checkPermissions(): Promise<{ notifications: PermissionState }>;
  requestPermissions(): Promise<{ notifications: PermissionState }>;
}

const TaskNotifier = registerPlugin<TaskNotifierPlugin>('TaskNotifier');

/** Ключ хранения переключателя (требование Т-30: выбор запоминается между запусками). */
const STORAGE_KEY = 'secretar.notifications';

/** Значение выключенного пункта. Любое другое, включая отсутствие записи, — включён. */
const DISABLED = 'off';

/** Есть ли уведомление вообще: только в Android-приложении. */
export function isNotifierAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Включён ли пункт «Показывать push уведомление с задачами». По умолчанию включён
 * (решение Р-32), поэтому и недоступное хранилище даёт «включён».
 */
export function loadNotificationsEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== DISABLED;
  } catch {
    return true;
  }
}

/**
 * Запоминает состояние пункта. Недоступное хранилище — как у выбора темы: настройка
 * действует в текущем сеансе, но не запоминается.
 */
export function saveNotificationsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : DISABLED);
  } catch {
    // Хранилище недоступно: пункт переключён в текущем сеансе, но не запомнен.
  }
}

/** Цепочка передач в нативную часть: каждая следующая ждёт предыдущую. */
let queue: Promise<void> = Promise.resolve();

/** Считает числа по дням горизонта и передаёт их нативной части вместе с настройкой. */
async function pushCounts(): Promise<void> {
  const enabled = loadNotificationsEnabled();
  let counts: DayCount[] = [];

  // Выключенному пункту числа не нужны: нативная часть снимет уведомление и будильник.
  if (enabled) {
    const dates = horizonDates(todayIso());
    const occurrences = await taskRepository.listOccurrencesByRange(
      dates[0],
      dates[dates.length - 1],
    );

    counts = countPendingByDay(occurrences, dates);
  }

  await TaskNotifier.update({ enabled, counts });
}

/**
 * Пересчитывает уведомление по текущим задачам, отметкам и настройке.
 *
 * Вызовы выстраиваются в очередь, а не идут параллельно: две передачи подряд (создание задачи
 * сразу после отметки) иначе могли бы завершиться в обратном порядке, и нативная часть осталась
 * бы с устаревшими числами. Каждая передача читает данные в момент своего запуска, поэтому
 * последняя в очереди всегда несёт свежее состояние. Ошибка не прерывает очередь и не всплывает
 * к вызывающему: уведомление — побочный результат, сохранение задачи от него не зависит.
 */
export function refreshTaskNotification(): Promise<void> {
  if (!isNotifierAvailable()) {
    return Promise.resolve();
  }

  queue = queue.then(pushCounts).catch((error: unknown) => {
    console.error('Не удалось обновить уведомление о задачах', error);
  });

  return queue;
}

/** Состояние разрешения на уведомления; null в браузере, где уведомления нет. */
export async function checkNotificationPermission(): Promise<PermissionState | null> {
  if (!isNotifierAvailable()) {
    return null;
  }

  return (await TaskNotifier.checkPermissions()).notifications;
}

/** Запрашивает разрешение (системный диалог Android 13+); null в браузере. */
export async function requestNotificationPermission(): Promise<PermissionState | null> {
  if (!isNotifierAvailable()) {
    return null;
  }

  return (await TaskNotifier.requestPermissions()).notifications;
}

/**
 * Первая передача при старте. Разрешение спрашивается только у включённого пункта и только
 * если его ещё ни разу не спрашивали: после отказа повторять системный диалог на каждом
 * запуске навязчиво, включить уведомления можно на экране «Уведомления».
 */
async function startUp(): Promise<void> {
  try {
    if (loadNotificationsEnabled() && (await checkNotificationPermission()) === 'prompt') {
      await requestNotificationPermission();
    }
  } catch (error: unknown) {
    console.error('Не удалось запросить разрешение на уведомления', error);
  }

  await refreshTaskNotification();
}

/**
 * Запускает синхронизацию уведомления на время жизни приложения: передача при старте и при
 * каждом возвращении в приложение. Возвращение покрывает смену суток: за ночь горизонт сдвинулся,
 * а число на новый день нативная часть уже выбрала сама по будильнику полуночи. Возвращает
 * функцию отключения — её отдаёт $effect в App.
 */
export function startTaskNotifier(): () => void {
  if (!isNotifierAvailable()) {
    return () => undefined;
  }

  const onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      void refreshTaskNotification();
    }
  };

  void startUp();
  document.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
