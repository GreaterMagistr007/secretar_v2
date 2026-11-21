import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createToastController, TOAST_TIMING, toastDuration } from './toast';
import type { Schedule, ToastMessage } from './toast';

describe('TOAST_TIMING и toastDuration', () => {
  it('успех: 1 с видно, 2 с затухания, всего 3 с', () => {
    expect(TOAST_TIMING.success).toEqual({ visibleMs: 1000, fadeMs: 2000 });
    expect(toastDuration('success')).toBe(3000);
  });

  it('ошибка: 4 с видно, 2 с затухания, всего 6 с', () => {
    expect(TOAST_TIMING.error).toEqual({ visibleMs: 4000, fadeMs: 2000 });
    expect(toastDuration('error')).toBe(6000);
  });
});

/** Управление показом с журналом всех изменений и текущим сообщением. */
function setup(schedule?: Schedule) {
  const changes: (ToastMessage | null)[] = [];
  const controller = createToastController((message) => changes.push(message), schedule);

  return {
    controller,
    changes,
    current: (): ToastMessage | null => (changes.length === 0 ? null : changes[changes.length - 1]),
  };
}

describe('createToastController на настоящем setTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('показывает сообщение сразу и возвращает его', () => {
    const { controller, changes } = setup();

    const message = controller.show('success', 'Добавлено: Маникюр');

    expect(message).toEqual({ id: 1, type: 'success', text: 'Добавлено: Маникюр' });
    expect(changes).toEqual([message]);
  });

  it('успех виден на 2999 мс и снимается ровно на 3000 мс', () => {
    const { controller, changes, current } = setup();

    controller.show('success', 'Добавлено');
    vi.advanceTimersByTime(2999);
    expect(current()).toEqual({ id: 1, type: 'success', text: 'Добавлено' });

    vi.advanceTimersByTime(1);
    expect(current()).toBeNull();
    expect(changes).toHaveLength(2);
  });

  it('ошибка видна на 5999 мс и снимается ровно на 6000 мс', () => {
    const { controller, current } = setup();

    controller.show('error', 'Не понял: «в понедельник маникюр в 12»');
    vi.advanceTimersByTime(5999);
    expect(current()?.type).toBe('error');

    vi.advanceTimersByTime(1);
    expect(current()).toBeNull();
  });

  it('ошибка не снимается на сроке успеха — 3000 мс', () => {
    const { controller, current } = setup();

    controller.show('error', 'Нет доступа к микрофону');
    vi.advanceTimersByTime(3000);

    expect(current()?.text).toBe('Нет доступа к микрофону');
  });

  it('после снятия больше ничего не происходит', () => {
    const { controller, changes } = setup();

    controller.show('success', 'Добавлено');
    vi.advanceTimersByTime(10_000);

    expect(changes).toHaveLength(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('новое сообщение посреди показа заменяет текущее сразу', () => {
    const { controller, current } = setup();

    controller.show('error', 'Не понял');
    vi.advanceTimersByTime(2000);
    controller.show('success', 'Добавлено');

    expect(current()).toEqual({ id: 2, type: 'success', text: 'Добавлено' });
  });

  it('таймер прежнего сообщения не снимает новое', () => {
    const { controller, current } = setup();

    controller.show('success', 'Первое');
    vi.advanceTimersByTime(2000);
    controller.show('success', 'Второе');

    // 3000 мс от первого показа: прежний таймер сработал бы здесь.
    vi.advanceTimersByTime(1000);
    expect(current()?.text).toBe('Второе');

    // Новое снимается по своему сроку: 3000 мс от второго показа.
    vi.advanceTimersByTime(1999);
    expect(current()?.text).toBe('Второе');
    vi.advanceTimersByTime(1);
    expect(current()).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('замена успеха ошибкой берёт срок ошибки', () => {
    const { controller, current } = setup();

    controller.show('success', 'Добавлено');
    vi.advanceTimersByTime(500);
    controller.show('error', 'Не понял');

    vi.advanceTimersByTime(5999);
    expect(current()?.type).toBe('error');
    vi.advanceTimersByTime(1);
    expect(current()).toBeNull();
  });

  it('замена ошибки успехом берёт срок успеха', () => {
    const { controller, current } = setup();

    controller.show('error', 'Не понял');
    vi.advanceTimersByTime(500);
    controller.show('success', 'Добавлено');

    vi.advanceTimersByTime(2999);
    expect(current()?.type).toBe('success');
    vi.advanceTimersByTime(1);
    expect(current()).toBeNull();
  });

  it('повтор того же текста — новый показ с новым номером и заново отсчитанным сроком', () => {
    const { controller, changes, current } = setup();

    const first = controller.show('success', 'Добавлено');
    vi.advanceTimersByTime(2500);
    const second = controller.show('success', 'Добавлено');

    expect(second.id).toBe(first.id + 1);
    expect(second.text).toBe(first.text);
    expect(changes).toEqual([first, second]);

    vi.advanceTimersByTime(2999);
    expect(current()).toBe(second);
    vi.advanceTimersByTime(1);
    expect(current()).toBeNull();
  });

  it('показ после снятия работает как первый', () => {
    const { controller, current } = setup();

    controller.show('success', 'Первое');
    vi.advanceTimersByTime(3000);
    controller.show('error', 'Второе');

    expect(current()).toEqual({ id: 2, type: 'error', text: 'Второе' });
    vi.advanceTimersByTime(6000);
    expect(current()).toBeNull();
  });

  it('пустой текст показывается как есть: текст собирает вызывающий код', () => {
    const { controller, current } = setup();

    controller.show('error', '');

    expect(current()).toEqual({ id: 1, type: 'error', text: '' });
  });
});

describe('createToastController с внедрённым таймером', () => {
  it('ставит снятие на полный срок типа и отменяет его при замене', () => {
    const calls: { ms: number; callback: () => void; cancelled: boolean }[] = [];
    const schedule: Schedule = (callback, ms) => {
      const call = { ms, callback, cancelled: false };
      calls.push(call);

      return () => {
        call.cancelled = true;
      };
    };
    const { controller, current } = setup(schedule);

    controller.show('success', 'Первое');
    controller.show('error', 'Второе');

    expect(calls.map((call) => [call.ms, call.cancelled])).toEqual([
      [3000, true],
      [6000, false],
    ]);

    calls[1].callback();
    expect(current()).toBeNull();
  });

  it('после снятия по таймеру новый показ ничего не отменяет', () => {
    let cancels = 0;
    const pending: (() => void)[] = [];
    const schedule: Schedule = (callback) => {
      pending.push(callback);

      return () => {
        cancels += 1;
      };
    };
    const { controller } = setup(schedule);

    controller.show('success', 'Первое');
    pending[0]();
    controller.show('success', 'Второе');

    expect(cancels).toBe(0);
  });
});
