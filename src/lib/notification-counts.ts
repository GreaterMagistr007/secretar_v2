/**
 * Расчёт чисел для уведомления о незавершённых задачах дня (требование Т-31, решение Р-31).
 *
 * Чистые функции без обращения к хранилищу. Нативная часть задач не видит — они в IndexedDB
 * внутри WebView, — поэтому веб-часть заранее считает число незавершённых задач на каждый день
 * горизонта, а будильник полуночи выбирает из списка число на новый день.
 */

import { toIsoDate } from './date';
import type { Occurrence } from './tasks/types';

/** Горизонт списка, суток вперёд начиная с сегодня (решение Р-31). */
export const HORIZON_DAYS = 60;

/** Число незавершённых задач одного дня — элемент списка для нативной части. */
export interface DayCount {
  /** День в виде YYYY-MM-DD. */
  date: string;
  count: number;
}

/**
 * Дни горизонта по порядку: `today` и следующие за ним, всего `days` дней.
 *
 * Следующий день берётся конструктором Date из локальных полей, а строка собирается тоже из
 * локальных (`toIsoDate`): часовой пояс в преобразовании туда и обратно не участвует, и день
 * перевода часов не сдвигает дату.
 */
export function horizonDates(today: string, days: number = HORIZON_DAYS): string[] {
  const [year, month, day] = today.split('-').map(Number);
  const dates: string[] = [];

  for (let offset = 0; offset < days; offset += 1) {
    dates.push(toIsoDate(new Date(year, month - 1, day + offset)));
  }

  return dates;
}

/**
 * Число незавершённых вхождений на каждый день из `dates`, в том же порядке.
 * Вхождения вне `dates` не учитываются; день без незавершённых задач получает ноль.
 */
export function countPendingByDay(
  occurrences: readonly Occurrence[],
  dates: readonly string[],
): DayCount[] {
  const pending = new Map<string, number>();

  for (const occurrence of occurrences) {
    if (!occurrence.done) {
      pending.set(occurrence.date, (pending.get(occurrence.date) ?? 0) + 1);
    }
  }

  return dates.map((date) => ({ date, count: pending.get(date) ?? 0 }));
}
