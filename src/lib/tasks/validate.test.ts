import { describe, expect, it } from 'vitest';
import { daysInMonth, isCalendarDate, isLeapYear, isPriority, validateNewTask } from './validate';

describe('isLeapYear', () => {
  it('год, кратный 4, — високосный', () => {
    expect(isLeapYear(2024)).toBe(true);
  });

  it('обычный год — невисокосный', () => {
    expect(isLeapYear(2026)).toBe(false);
  });

  it('год, кратный 100, — невисокосный', () => {
    expect(isLeapYear(1900)).toBe(false);
  });

  it('год, кратный 400, — високосный', () => {
    expect(isLeapYear(2000)).toBe(true);
  });
});

describe('daysInMonth', () => {
  it('в январе 31 день', () => {
    expect(daysInMonth(2026, 1)).toBe(31);
  });

  it('в апреле 30 дней', () => {
    expect(daysInMonth(2026, 4)).toBe(30);
  });

  it('в феврале невисокосного года 28 дней', () => {
    expect(daysInMonth(2026, 2)).toBe(28);
  });

  it('в феврале високосного года 29 дней', () => {
    expect(daysInMonth(2024, 2)).toBe(29);
  });

  it('в декабре 31 день', () => {
    expect(daysInMonth(2026, 12)).toBe(31);
  });

  it('номер месяца вне диапазона даёт 0', () => {
    expect(daysInMonth(2026, 0)).toBe(0);
    expect(daysInMonth(2026, 13)).toBe(0);
  });
});

describe('isCalendarDate', () => {
  it('принимает существующую дату', () => {
    expect(isCalendarDate('2026-09-15')).toBe(true);
  });

  it('принимает 29 февраля високосного года', () => {
    expect(isCalendarDate('2024-02-29')).toBe(true);
  });

  it('отклоняет 29 февраля невисокосного года', () => {
    expect(isCalendarDate('2026-02-29')).toBe(false);
  });

  it('отклоняет 31 февраля', () => {
    expect(isCalendarDate('2026-02-31')).toBe(false);
  });

  it('отклоняет 31 апреля', () => {
    expect(isCalendarDate('2026-04-31')).toBe(false);
  });

  it('отклоняет нулевые день и месяц', () => {
    expect(isCalendarDate('2026-00-10')).toBe(false);
    expect(isCalendarDate('2026-09-00')).toBe(false);
  });

  it('отклоняет тринадцатый месяц', () => {
    expect(isCalendarDate('2026-13-01')).toBe(false);
  });

  it('отклоняет чужой формат записи', () => {
    expect(isCalendarDate('15.09.2026')).toBe(false);
    expect(isCalendarDate('2026-9-15')).toBe(false);
    expect(isCalendarDate('')).toBe(false);
  });
});

describe('isPriority', () => {
  it('принимает значения перечня', () => {
    expect(isPriority('low')).toBe(true);
    expect(isPriority('medium')).toBe(true);
    expect(isPriority('high')).toBe(true);
  });

  it('отклоняет значение вне перечня', () => {
    expect(isPriority('urgent')).toBe(false);
    expect(isPriority('')).toBe(false);
    expect(isPriority('Medium')).toBe(false);
  });
});

describe('validateNewTask', () => {
  it('принимает корректный набор и обрезает пробелы в тексте', () => {
    const result = validateNewTask({
      text: '  Купить молоко  ',
      date: '2026-09-15',
      priority: 'high',
    });

    expect(result).toEqual({
      ok: true,
      value: { text: 'Купить молоко', date: '2026-09-15', priority: 'high' },
    });
  });

  it('принимает 29 февраля високосного года', () => {
    const result = validateNewTask({ text: 'Проверить', date: '2024-02-29', priority: 'low' });

    expect(result.ok).toBe(true);
  });

  it('отклоняет пустой текст', () => {
    const result = validateNewTask({ text: '', date: '2026-09-15', priority: 'medium' });

    expect(result).toEqual({ ok: false, errors: ['Текст задачи не может быть пустым'] });
  });

  it('отклоняет текст из одних пробелов', () => {
    const result = validateNewTask({ text: '   \t ', date: '2026-09-15', priority: 'medium' });

    expect(result).toEqual({ ok: false, errors: ['Текст задачи не может быть пустым'] });
  });

  it('отклоняет неверный формат даты', () => {
    const result = validateNewTask({ text: 'Задача', date: '15.09.2026', priority: 'medium' });

    expect(result).toEqual({ ok: false, errors: ['Дата должна быть в формате ГГГГ-ММ-ДД'] });
  });

  it('отклоняет несуществующую дату 2026-02-31', () => {
    const result = validateNewTask({ text: 'Задача', date: '2026-02-31', priority: 'medium' });

    expect(result).toEqual({ ok: false, errors: ['Такой даты нет в календаре'] });
  });

  it('отклоняет 29 февраля невисокосного года', () => {
    const result = validateNewTask({ text: 'Задача', date: '2026-02-29', priority: 'medium' });

    expect(result).toEqual({ ok: false, errors: ['Такой даты нет в календаре'] });
  });

  it('отклоняет неизвестный приоритет', () => {
    const result = validateNewTask({ text: 'Задача', date: '2026-09-15', priority: 'urgent' });

    expect(result).toEqual({ ok: false, errors: ['Неизвестный приоритет'] });
  });

  it('собирает все ошибки сразу', () => {
    const result = validateNewTask({ text: ' ', date: '2026-02-30', priority: 'urgent' });

    expect(result).toEqual({
      ok: false,
      errors: [
        'Текст задачи не может быть пустым',
        'Такой даты нет в календаре',
        'Неизвестный приоритет',
      ],
    });
  });

  it('при ошибке не отдаёт значение', () => {
    const result = validateNewTask({ text: '', date: '2026-09-15', priority: 'medium' });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.errors).toHaveLength(1);
    }
  });
});
