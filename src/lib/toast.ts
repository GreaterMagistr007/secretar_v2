/**
 * Логика всплывающего сообщения (решение Р-35, docs/mechanic_toast.md): показ, замена
 * и снятие по таймеру. Чистый TS без рун и DOM — тесты идут в окружении node, а руна
 * $state там не исполняется; состояние для компонента держит обёртка toast.svelte.ts.
 */

/** Тип сообщения: итог действия — удалось или нет. */
export type ToastType = 'success' | 'error';

/** Показываемое сообщение. */
export interface ToastMessage {
  /**
   * Номер показа, растёт с каждым вызовом. По нему компонент пересоздаёт элемент, чтобы
   * анимация началась заново и при повторе того же текста.
   */
  id: number;
  type: ToastType;
  text: string;
}

/** Длительности одного показа, мс. */
export interface ToastTiming {
  /** Сколько сообщение видно полностью. */
  visibleMs: number;
  /** Сколько длится линейное затухание после этого. */
  fadeMs: number;
}

/**
 * Длительности по типам — выбор владельца 2026-11-21, вариант 8.б (решение Р-35): успех
 * 1 с видно + 2 с затухания, ошибка 4 с + 2 с — фразу «Не понял: «…»» за 1 с не прочитать.
 * Компонент Toast.svelte берёт отсюда задержку и длительность затухания.
 */
export const TOAST_TIMING: Readonly<Record<ToastType, ToastTiming>> = {
  success: { visibleMs: 1000, fadeMs: 2000 },
  error: { visibleMs: 4000, fadeMs: 2000 },
};

/** Полное время показа: через столько сообщение убирается. */
export function toastDuration(type: ToastType): number {
  const timing = TOAST_TIMING[type];

  return timing.visibleMs + timing.fadeMs;
}

/** Откладывает вызов на `ms` миллисекунд; возвращает функцию отмены. */
export type Schedule = (callback: () => void, ms: number) => () => void;

/** Таймер по умолчанию — обычный setTimeout. */
const scheduleTimeout: Schedule = (callback, ms) => {
  const handle = setTimeout(callback, ms);

  return () => clearTimeout(handle);
};

/** Управление показом. */
export interface ToastController {
  /**
   * Показывает сообщение. Текущее, если есть, заменяется сразу, а его таймер снятия
   * отменяется — иначе он убрал бы новое сообщение раньше срока.
   */
  show(type: ToastType, text: string): ToastMessage;
}

/**
 * Создаёт управление показом.
 *
 * @param onChange вызывается с новым сообщением при показе и с null при снятии.
 * @param schedule таймер; подменяется в тестах.
 */
export function createToastController(
  onChange: (message: ToastMessage | null) => void,
  schedule: Schedule = scheduleTimeout,
): ToastController {
  let lastId = 0;
  let cancelRemoval: (() => void) | null = null;

  return {
    show(type, text) {
      cancelRemoval?.();

      lastId += 1;
      const message: ToastMessage = { id: lastId, type, text };

      onChange(message);
      cancelRemoval = schedule(() => {
        cancelRemoval = null;
        onChange(null);
      }, toastDuration(type));

      return message;
    },
  };
}
