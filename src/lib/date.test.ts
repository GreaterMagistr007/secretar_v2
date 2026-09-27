import { describe, expect, it } from 'vitest';
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

  // Часы можно и перевести назад: выбор всё равно сделан не в текущие сутки.
  it('выбор будущих суток тоже считается устаревшим', () => {
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
  // Сравнение с системными часами, а не с фиксированной датой: тест не должен ломаться завтра.
  it('отдаёт сегодняшний день по локальному календарю', () => {
    expect(todayIso()).toBe(toIsoDate(new Date()));
  });

  it('результат проходит проверку формата', () => {
    expect(isIsoDate(todayIso())).toBe(true);
  });
});
