import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as notifier from './task-notifier';
import type { Occurrence } from './tasks/types';

/**
 * Плагин Capacitor и хранилище задач подменены: тест не открывает базу и не обращается
 * к нативной части. Данные — захардкоженные вхождения.
 */
const mocks = vi.hoisted(() => ({
  isNative: vi.fn<() => boolean>(),
  update: vi.fn<(options: unknown) => Promise<void>>(),
  checkPermissions: vi.fn<() => Promise<{ notifications: string }>>(),
  requestPermissions: vi.fn<() => Promise<{ notifications: string }>>(),
  listOccurrencesByRange: vi.fn<(from: string, to: string) => Promise<Occurrence[]>>(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: mocks.isNative },
  registerPlugin: () => ({
    update: mocks.update,
    checkPermissions: mocks.checkPermissions,
    requestPermissions: mocks.requestPermissions,
  }),
}));

vi.mock('./task-repository', () => ({
  taskRepository: { listOccurrencesByRange: mocks.listOccurrencesByRange },
}));

/** Хранилище настройки в памяти вместо localStorage, которого в окружении node нет. */
function stubStorage(initial: Record<string, string> = {}): Map<string, string> {
  const data = new Map(Object.entries(initial));

  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  });

  return data;
}

/** localStorage, бросающий исключение на каждом обращении, — как в приватном режиме. */
function stubBrokenStorage(): void {
  const fail = (): never => {
    throw new Error('хранилище недоступно');
  };

  vi.stubGlobal('localStorage', { getItem: fail, setItem: fail });
}

/** Подмена document: только то, что нужно слежению за возвращением в приложение. */
function stubDocument(): { listeners: Map<string, () => void>; setVisibility: (state: string) => void } {
  const listeners = new Map<string, () => void>();
  let visibility = 'visible';

  vi.stubGlobal('document', {
    get visibilityState() {
      return visibility;
    },
    addEventListener: (type: string, listener: () => void) => {
      listeners.set(type, listener);
    },
    removeEventListener: (type: string) => {
      listeners.delete(type);
    },
  });

  return {
    listeners,
    setVisibility: (state: string) => {
      visibility = state;
    },
  };
}

function occurrence(date: string, done: boolean): Occurrence {
  return {
    task: {
      id: `id-${date}-${String(done)}`,
      text: 'Задача',
      date: '2026-11-01',
      priority: 'medium',
      recurrence: 'daily',
      searchTokens: ['задача'],
      createdAt: 1000,
      updatedAt: 1000,
    },
    date,
    done,
  };
}

/** Дожидается завершения всех уже запущенных обещаний. */
async function flush(): Promise<void> {
  for (let index = 0; index < 10; index += 1) {
    await Promise.resolve();
  }
}

beforeEach(() => {
  // 21 ноября 2026, полдень по Нью-Йорку (зона стенда тестов).
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 21, 12, 0, 0));
  mocks.isNative.mockReturnValue(true);
  mocks.update.mockResolvedValue(undefined);
  mocks.checkPermissions.mockResolvedValue({ notifications: 'granted' });
  mocks.requestPermissions.mockResolvedValue({ notifications: 'granted' });
  mocks.listOccurrencesByRange.mockResolvedValue([]);
  stubStorage();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('isNotifierAvailable', () => {
  it('в Android-приложении уведомление есть', () => {
    expect(notifier.isNotifierAvailable()).toBe(true);
  });

  it('в браузере уведомления нет', () => {
    mocks.isNative.mockReturnValue(false);

    expect(notifier.isNotifierAvailable()).toBe(false);
  });
});

describe('loadNotificationsEnabled / saveNotificationsEnabled', () => {
  it('без записи пункт включён — значение по умолчанию', () => {
    expect(notifier.loadNotificationsEnabled()).toBe(true);
  });

  it('выключение запоминается', () => {
    const data = stubStorage();

    notifier.saveNotificationsEnabled(false);

    expect(data.get('secretar.notifications')).toBe('off');
    expect(notifier.loadNotificationsEnabled()).toBe(false);
  });

  it('повторное включение запоминается', () => {
    const data = stubStorage({ 'secretar.notifications': 'off' });

    notifier.saveNotificationsEnabled(true);

    expect(data.get('secretar.notifications')).toBe('on');
    expect(notifier.loadNotificationsEnabled()).toBe(true);
  });

  it('непонятное значение в хранилище считается включённым', () => {
    stubStorage({ 'secretar.notifications': 'что-то' });

    expect(notifier.loadNotificationsEnabled()).toBe(true);
  });

  it('недоступное хранилище: чтение даёт «включён», запись не бросает', () => {
    stubBrokenStorage();

    expect(notifier.loadNotificationsEnabled()).toBe(true);
    expect(() => notifier.saveNotificationsEnabled(false)).not.toThrow();
  });
});

describe('refreshTaskNotification', () => {
  it('в браузере не читает задачи и не зовёт плагин', async () => {
    mocks.isNative.mockReturnValue(false);

    await notifier.refreshTaskNotification();

    expect(mocks.listOccurrencesByRange).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('передаёт 60 дней с сегодня с числом незавершённых задач', async () => {
    mocks.listOccurrencesByRange.mockResolvedValue([
      occurrence('2026-11-21', false),
      occurrence('2026-11-21', false),
      occurrence('2026-11-21', true),
      occurrence('2026-11-22', true),
      occurrence('2027-01-19', false),
    ]);

    await notifier.refreshTaskNotification();

    expect(mocks.listOccurrencesByRange).toHaveBeenCalledWith('2026-11-21', '2027-01-19');
    expect(mocks.update).toHaveBeenCalledTimes(1);

    const { enabled, counts } = mocks.update.mock.calls[0][0] as {
      enabled: boolean;
      counts: { date: string; count: number }[];
    };

    expect(enabled).toBe(true);
    expect(counts).toHaveLength(60);
    expect(counts[0]).toEqual({ date: '2026-11-21', count: 2 });
    expect(counts[1]).toEqual({ date: '2026-11-22', count: 0 });
    expect(counts[59]).toEqual({ date: '2027-01-19', count: 1 });
  });

  it('выключенный пункт передаётся без чисел и без чтения задач', async () => {
    stubStorage({ 'secretar.notifications': 'off' });

    await notifier.refreshTaskNotification();

    expect(mocks.listOccurrencesByRange).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledWith({ enabled: false, counts: [] });
  });

  it('вызовы идут по очереди: следующий начинается после завершения предыдущего', async () => {
    const order: string[] = [];
    let releaseFirst: () => void = () => undefined;

    mocks.update
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            order.push('первый начат');
            releaseFirst = () => {
              order.push('первый завершён');
              resolve();
            };
          }),
      )
      .mockImplementationOnce(async () => {
        order.push('второй начат');
      });

    const first = notifier.refreshTaskNotification();
    const second = notifier.refreshTaskNotification();

    await flush();
    expect(order).toEqual(['первый начат']);

    releaseFirst();
    await Promise.all([first, second]);

    expect(order).toEqual(['первый начат', 'первый завершён', 'второй начат']);
  });

  it('ошибка передачи не всплывает и не останавливает очередь', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    mocks.update.mockRejectedValueOnce(new Error('сбой моста'));

    await expect(notifier.refreshTaskNotification()).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledTimes(1);

    await notifier.refreshTaskNotification();

    expect(mocks.update).toHaveBeenCalledTimes(2);
  });

  it('ошибка чтения задач тоже не всплывает и плагин не вызывается', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.listOccurrencesByRange.mockRejectedValueOnce(new Error('база недоступна'));

    await expect(notifier.refreshTaskNotification()).resolves.toBeUndefined();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});

describe('checkNotificationPermission / requestNotificationPermission', () => {
  it('в браузере дают null и плагин не зовут', async () => {
    mocks.isNative.mockReturnValue(false);

    expect(await notifier.checkNotificationPermission()).toBeNull();
    expect(await notifier.requestNotificationPermission()).toBeNull();
    expect(mocks.checkPermissions).not.toHaveBeenCalled();
    expect(mocks.requestPermissions).not.toHaveBeenCalled();
  });

  it('в приложении возвращают состояние от плагина', async () => {
    mocks.checkPermissions.mockResolvedValue({ notifications: 'denied' });
    mocks.requestPermissions.mockResolvedValue({ notifications: 'granted' });

    expect(await notifier.checkNotificationPermission()).toBe('denied');
    expect(await notifier.requestNotificationPermission()).toBe('granted');
  });
});

describe('startTaskNotifier', () => {
  it('в браузере ничего не делает и не подписывается на события', () => {
    mocks.isNative.mockReturnValue(false);
    const { listeners } = stubDocument();

    const stop = notifier.startTaskNotifier();

    expect(listeners.size).toBe(0);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(() => stop()).not.toThrow();
  });

  it('при первом запуске спрашивает разрешение и передаёт числа', async () => {
    stubDocument();
    mocks.checkPermissions.mockResolvedValue({ notifications: 'prompt' });

    notifier.startTaskNotifier();
    await vi.waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));

    expect(mocks.requestPermissions).toHaveBeenCalledTimes(1);
  });

  it('после отказа разрешение на старте повторно не спрашивается', async () => {
    stubDocument();
    mocks.checkPermissions.mockResolvedValue({ notifications: 'denied' });

    notifier.startTaskNotifier();
    await vi.waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));

    expect(mocks.requestPermissions).not.toHaveBeenCalled();
  });

  it('у выключенного пункта разрешение не проверяется и не спрашивается', async () => {
    stubDocument();
    stubStorage({ 'secretar.notifications': 'off' });

    notifier.startTaskNotifier();
    await vi.waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));

    expect(mocks.checkPermissions).not.toHaveBeenCalled();
    expect(mocks.requestPermissions).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledWith({ enabled: false, counts: [] });
  });

  it('сбой проверки разрешения не мешает передать числа', async () => {
    stubDocument();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    mocks.checkPermissions.mockRejectedValue(new Error('сбой'));

    notifier.startTaskNotifier();
    await vi.waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));

    expect(consoleError).toHaveBeenCalledTimes(1);
  });

  it('возвращение в приложение пересчитывает, уход из него — нет', async () => {
    const { listeners, setVisibility } = stubDocument();

    notifier.startTaskNotifier();
    await vi.waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));

    const onVisibilityChange = listeners.get('visibilitychange');

    expect(onVisibilityChange).toBeDefined();

    setVisibility('hidden');
    onVisibilityChange?.();
    await flush();
    expect(mocks.update).toHaveBeenCalledTimes(1);

    setVisibility('visible');
    onVisibilityChange?.();
    await vi.waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(2));
  });

  it('функция отключения снимает подписку', async () => {
    const { listeners } = stubDocument();

    const stop = notifier.startTaskNotifier();

    expect(listeners.has('visibilitychange')).toBe(true);

    stop();

    expect(listeners.has('visibilitychange')).toBe(false);
    await vi.waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
  });
});
