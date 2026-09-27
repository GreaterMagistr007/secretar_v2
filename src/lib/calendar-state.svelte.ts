/**
 * Состояние экрана календаря: показываемый месяц и выбранный день (требование Т-27).
 *
 * Живёт вне компонента намеренно: переход на экран задачи (требование Т-28) размонтирует
 * календарь, и локальное состояние пропало бы — возврат по кнопке «назад» терял бы
 * и выбранный день, и пролистанный месяц.
 *
 * Файл назван *.svelte.ts, потому что руна $state компилируется только в .svelte и .svelte.ts.
 */

import { isIsoDate, isStaleSelection, todayIso } from './date';

const today = new Date();

let viewYear = $state(today.getFullYear());
let viewMonth = $state(today.getMonth());
let selectedDate = $state<string | null>(null);

/**
 * Сутки, в которые сделан выбор дня. Нужны, потому что выбор живёт в модуле и переживает
 * размонтирование экрана календаря: пользователь выбирает день вечером, уходит на экран задачи,
 * возвращается утром — и выбор всё ещё указывает на вчера. Форма создания взяла бы эту дату,
 * а править сохранённую задачу в интерфейсе нечем (требование Т-28 — только просмотр).
 */
let selectedOn: string | null = null;

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
    selectedOn = todayIso();
    viewYear = year;
    viewMonth = month - 1;
  },

  /**
   * Снимает выбор, сделанный в прежние сутки, и сообщает, снял ли.
   *
   * Вызывается и при создании экрана календаря, и при его пробуждении: подписки на события
   * живут только пока экран смонтирован, а выбор — дольше, поэтому одной проверки на пробуждение
   * мало. Маршрут, который она закрывает: выбрать день вечером, уйти на экран задачи, вернуться
   * утром — без этой сверки форма создания подставила бы вчерашнее число.
   */
  dropStaleSelection(): void {
    if (selectedDate === null || !isStaleSelection(selectedOn, todayIso())) {
      return;
    }

    selectedDate = null;
    selectedOn = null;
  },
};
