/**
 * Состояние экрана календаря: показываемый месяц и выбранный день (требование Т-27).
 *
 * Живёт вне компонента намеренно: переход на экран задачи (требование Т-28) размонтирует
 * календарь, и локальное состояние пропало бы — возврат по кнопке «назад» терял бы
 * и выбранный день, и пролистанный месяц.
 *
 * Файл назван *.svelte.ts, потому что руна $state компилируется только в .svelte и .svelte.ts.
 */

import { isIsoDate } from './date';

const today = new Date();

let viewYear = $state(today.getFullYear());
let viewMonth = $state(today.getMonth());
let selectedDate = $state<string | null>(null);

export const calendarState = {
  /** Год показываемого месяца. */
  get viewYear(): number {
    return viewYear;
  },

  /** Показываемый месяц, 0 — январь. */
  get viewMonth(): number {
    return viewMonth;
  },

  /** Выбранный день в виде YYYY-MM-DD; null, пока день не выбран. */
  get selectedDate(): string | null {
    return selectedDate;
  },

  /** Переход к месяцу без изменения выбранного дня. */
  showMonth(year: number, month: number): void {
    viewYear = year;
    viewMonth = month;
  },

  /**
   * Выбирает день. Заодно переводит сетку на его месяц: день выбирают и кликом
   * по хвосту соседнего месяца, и после сохранения задачи на другую дату.
   */
  select(date: string): void {
    if (!isIsoDate(date)) {
      return;
    }

    const [year, month] = date.split('-').map(Number);

    selectedDate = date;
    viewYear = year;
    viewMonth = month - 1;
  },

  /** Снимает выбор: список задач дня при этом исчезает. */
  clearSelection(): void {
    selectedDate = null;
  },
};
