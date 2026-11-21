/**
 * Состояние всплывающего сообщения для компонента Toast.svelte и функция показа для
 * остального приложения. Логика — в toast.ts; здесь только руна поверх неё.
 *
 * Файл назван *.svelte.ts, потому что руна $state компилируется только в .svelte и .svelte.ts.
 */

import { createToastController } from './toast';
import type { ToastMessage, ToastType } from './toast';

let current = $state<ToastMessage | null>(null);

const controller = createToastController((message) => {
  current = message;
});

export const toast = {
  /** Показываемое сообщение; null — ничего не показано. */
  get current(): ToastMessage | null {
    return current;
  },
};

/** Показывает всплывающее сообщение; предыдущее, если ещё видно, заменяется. */
export function showToast(type: ToastType, text: string): void {
  controller.show(type, text);
}
