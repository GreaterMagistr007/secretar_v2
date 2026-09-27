/**
 * Проверка данных формы создания задачи (требования Т-2, Т-3, Т-4, Т-24).
 *
 * Исключения не бросаются: форме нужен полный список проблем сразу, а не первая
 * из них, поэтому результат — размеченное объединение с массивом сообщений.
 */

import type { NewTask, Priority, Recurrence } from './types';

/** Сообщения об ошибках — на русском, показываются пользователю как есть. */
export const VALIDATION_MESSAGES = {
  textEmpty: 'Текст задачи не может быть пустым',
  dateFormat: 'Дата должна быть в формате ГГГГ-ММ-ДД',
  dateUnreal: 'Такой даты нет в календаре',
  priorityUnknown: 'Неизвестный приоритет',
  recurrenceUnknown: 'Неизвестное повторение',
} as const;

/** Результат проверки: либо разобранное значение, либо список ошибок. */
export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

/**
 * Данные формы до проверки: приоритет и повторение приходят строками, потому что в
 * форме они выбираются из разметки и могут не принадлежать перечню.
 */
export interface NewTaskInput {
  text: string;
  date: string;
  priority: string;
  recurrence: string;
}

/** Закрытый перечень приоритетов (требование Т-24). */
const PRIORITIES: readonly Priority[] = ['low', 'medium', 'high'];

/** Закрытый перечень значений регулярности (требование Т-4). */
const RECURRENCES: readonly Recurrence[] = ['none', 'daily', 'weekly', 'monthly', 'yearly'];

/** Формат плавающей даты YYYY-MM-DD (docs/architecture_storage.md, раздел «Даты и часовой пояс»). */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Значение принадлежит перечню приоритетов. */
export function isPriority(value: string): value is Priority {
  return (PRIORITIES as readonly string[]).includes(value);
}

/** Значение принадлежит перечню значений регулярности. */
export function isRecurrence(value: string): value is Recurrence {
  return (RECURRENCES as readonly string[]).includes(value);
}

/** Високосный ли год по григорианскому правилу. */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Число дней в месяце; 0 для номера месяца вне диапазона 1…12. */
export function daysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) {
    return 0;
  }

  const lengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  return lengths[month - 1];
}

/**
 * Дата записана как YYYY-MM-DD и существует в календаре.
 * Разбор ручной: `new Date('2026-02-31')` переносит дату на 3 марта вместо отказа.
 */
export function isCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));

  return day >= 1 && day <= daysInMonth(year, month);
}

/** Проверяет данные формы и возвращает задачу с обрезанным текстом либо список ошибок. */
export function validateNewTask(input: NewTaskInput): ValidationResult<NewTask> {
  const errors: string[] = [];
  const text = input.text.trim();
  const priority = isPriority(input.priority) ? input.priority : null;
  const recurrence = isRecurrence(input.recurrence) ? input.recurrence : null;

  if (text.length === 0) {
    errors.push(VALIDATION_MESSAGES.textEmpty);
  }

  if (!DATE_PATTERN.test(input.date)) {
    errors.push(VALIDATION_MESSAGES.dateFormat);
  } else if (!isCalendarDate(input.date)) {
    errors.push(VALIDATION_MESSAGES.dateUnreal);
  }

  if (priority === null) {
    errors.push(VALIDATION_MESSAGES.priorityUnknown);
  }

  if (recurrence === null) {
    errors.push(VALIDATION_MESSAGES.recurrenceUnknown);
  }

  // Проверки priority и recurrence повторяются ради сужения типа: выше они добавили сообщения.
  if (errors.length > 0 || priority === null || recurrence === null) {
    return { ok: false, errors };
  }

  return { ok: true, value: { text, date: input.date, priority, recurrence } };
}
