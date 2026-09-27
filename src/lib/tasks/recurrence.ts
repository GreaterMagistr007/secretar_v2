/**
 * Развёртка правил повторения в конкретные дни (требование Т-4, решения Р-15 и Р-25).
 *
 * Чистые функции без обращения к хранилищу: вхождения повторений в базе не лежат, а
 * вычисляются при каждом показе дня или диапазона. Таблица правил — единственный
 * источник семантики, docs/plan_stage_03_recurrence_completions.md.
 *
 * Арифметика дат здесь своя, числовая: функции из src/lib/date.ts не импортируются и
 * локальные поля Date не читаются намеренно. Преобразование «Date → строка» в src/lib/date.ts
 * собирает строку из локальных полей, и при TZ=America/New_York дата
 * `new Date(Date.UTC(2026, 1, 1))` превращается в 2026-01-31 — все вхождения уехали бы
 * на сутки в западных поясах. Обратного преобразования в этом модуле нет вовсе, а `Date.UTC`
 * для разницы в сутках безопасен: это чистая функция от аргументов, часовой пояс в ней
 * не участвует.
 */

import type { Recurrence } from './types';
import { daysInMonth } from './validate';

/** Миллисекунд в сутках. */
const MS_IN_DAY = 86_400_000;

/**
 * Дополняет число нулями слева: 7 → «07», год 26 → «0026».
 *
 * Год дополняется до четырёх знаков обязательно: иначе `nextDay` вернул бы «26-01-02»,
 * такая строка не равна ни одной дате формата YYYY-MM-DD, и перебор диапазона перестал бы
 * находить вхождения. Шаблон даты проекта (\d{4}) сам по себе годы меньше 1000 пропускает.
 */
function pad(value: number, length: number = 2): string {
  return String(value).padStart(length, '0');
}

/** Год, месяц и день из строки YYYY-MM-DD. */
function parts(iso: string): [number, number, number] {
  return [Number(iso.slice(0, 4)), Number(iso.slice(5, 7)), Number(iso.slice(8, 10))];
}

/** Следующий день в виде YYYY-MM-DD. Только числовая арифметика, без Date. */
function nextDay(iso: string): string {
  const [year, month, day] = parts(iso);

  if (day < daysInMonth(year, month)) {
    return `${pad(year, 4)}-${pad(month)}-${pad(day + 1)}`;
  }

  if (month < 12) {
    return `${pad(year, 4)}-${pad(month + 1)}-01`;
  }

  return `${pad(year + 1, 4)}-01-01`;
}

/**
 * Число суток от 1970-01-01. Нужно правилу `weekly` для проверки кратности семи
 * и перебору диапазона как ограничителю числа шагов.
 *
 * Год задаётся через `setUTCFullYear`, а не аргументом `Date.UTC`: `Date.UTC(26, 2, 1)`
 * по спецификации даёт 1926 год, а шаблон даты проекта (\d{4}) пропускает «0026-03-01».
 */
function dayNumber(iso: string): number {
  const [year, month, day] = parts(iso);
  const date = new Date(0);

  date.setUTCFullYear(year, month - 1, day);

  return Math.round(date.getTime() / MS_IN_DAY);
}

/**
 * Попадает ли повторение задачи на указанный день.
 *
 * `start` — дата старта задачи, `date` — проверяемый день, оба в виде YYYY-MM-DD.
 * Условие `date < start` проверяется первым и относится ко всем правилам: кратность
 * семи суткам и совпадение числа месяца истинны и для дат раньше старта.
 */
export function occursOn(start: string, recurrence: Recurrence, date: string): boolean {
  if (date < start) {
    return false;
  }

  const [, startMonth, startDay] = parts(start);
  const [year, month, day] = parts(date);

  switch (recurrence) {
    case 'none':
      return date === start;
    case 'daily':
      return true;
    case 'weekly':
      return (dayNumber(date) - dayNumber(start)) % 7 === 0;
    // min(...) — это и есть перенос на последний день месяца (решение Р-25): старт
    // 31 января даёт 28 февраля в невисокосном году. Отдельной ветки «перенести» нет.
    case 'monthly':
      return day === Math.min(startDay, daysInMonth(year, month));
    case 'yearly':
      return month === startMonth && day === Math.min(startDay, daysInMonth(year, startMonth));
  }
}

/**
 * Дни вхождения правила в диапазон [from, to] включительно, по возрастанию.
 *
 * Перебираются все дни диапазона: вызывающий код спрашивает сетку месяца (42 дня),
 * и перебор проще пяти отдельных генераторов при том же ответе.
 */
export function occurrencesInRange(
  start: string,
  recurrence: Recurrence,
  from: string,
  to: string,
): string[] {
  if (from > to || to < start) {
    return [];
  }

  const result: string[] = [];
  const lastNumber = dayNumber(to);
  let current = from;

  // Шаги считаются по числу суток, а не по сравнению строк «пока не равно»:
  // некорректный вход не должен давать бесконечного цикла.
  for (let number = dayNumber(from); number <= lastNumber; number += 1) {
    if (occursOn(start, recurrence, current)) {
      result.push(current);
    }

    current = nextDay(current);
  }

  return result;
}
