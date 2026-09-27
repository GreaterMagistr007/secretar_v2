import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatLongDate, isIsoDate, isStaleSelection, toIsoDate, todayIso } from './date';

describe('isStaleSelection', () => {
  it('выбор тех же суток не устарел', () => {
    expect(isStaleSelection('2026-09-27', '2026-09-27')).toBe(false);
  });

  it('выбор прежних суток устарел', () => {
    expect(isStaleSelection('2026-09-27', '2026-09-28')).toBe(true);
  });

  it('пустой выбор устареть не может', () => {
    expect(isStaleSelection(null, '2026-09-28')).toBe(false);
  });

  // Часы можно и перевести назад: запись всё равно сделана не в текущие сутки.
  it('запись будущих суток тоже считается устаревшей', () => {
    expect(isStaleSelection('2026-09-29', '2026-09-28')).toBe(true);
  });

  it('переход через границу года учитывается', () => {
    expect(isStaleSelection('2026-12-31', '2027-01-01')).toBe(true);
  });
});

describe('isIsoDate', () => {
  it('принимает существующую дату', () => {
    expect(isIsoDate('2026-09-27')).toBe(true);
  });

  it('отвергает несуществующий день месяца', () => {
    expect(isIsoDate('2026-02-30')).toBe(false);
  });

  it('принимает 29 февраля високосного года', () => {
    expect(isIsoDate('2024-02-29')).toBe(true);
  });

  it('отвергает 29 февраля невисокосного года', () => {
    expect(isIsoDate('2026-02-29')).toBe(false);
  });

  it('отвергает другой формат записи', () => {
    expect(isIsoDate('27-09-2026')).toBe(false);
  });

  it('отвергает пустую строку', () => {
    expect(isIsoDate('')).toBe(false);
  });
});

describe('toIsoDate', () => {
  it('собирает строку из локальных полей даты', () => {
    expect(toIsoDate(new Date(2026, 8, 27))).toBe('2026-09-27');
  });

  it('дополняет месяц и день нулями', () => {
    expect(toIsoDate(new Date(2026, 0, 7))).toBe('2026-01-07');
  });
});

describe('formatLongDate', () => {
  it('записывает дату по-русски', () => {
    expect(formatLongDate('2026-09-27')).toBe('27 сентября 2026');
  });

  it('первый и последний месяцы года берутся верно', () => {
    expect(formatLongDate('2026-01-01')).toBe('1 января 2026');
    expect(formatLongDate('2026-12-31')).toBe('31 декабря 2026');
  });

  // Интерфейс не должен падать из-за данных, которых не ждали.
  it('непонятную строку возвращает как есть', () => {
    expect(formatLongDate('не дата')).toBe('не дата');
  });
});

describe('todayIso', () => {
  // Часы подменяются, а ожидание записано литералом. Сравнивать с toIsoDate(new Date()) нельзя:
  // это ровно тело самой функции, то есть сравнение реализации с собой — утверждения в таком
  // тесте нет, а два независимых чтения часов вдобавок расходятся на границе суток.
  afterEach(() => {
    vi.useRealTimers();
  });

  it('отдаёт сегодняшний день по локальному календарю', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 27, 12, 0, 0));

    expect(todayIso()).toBe('2026-09-27');
  });

  it('берёт локальные сутки, а не UTC: поздний вечер остаётся сегодняшним днём', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 27, 23, 30, 0));

    expect(todayIso()).toBe('2026-09-27');
  });

  it('сразу после полуночи отдаёт уже новый день', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 28, 0, 0, 1));

    expect(todayIso()).toBe('2026-09-28');
  });

  it('дополняет месяц и день нулями', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 7, 9, 0, 0));

    expect(todayIso()).toBe('2026-01-07');
  });
});
