import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { countPendingByDay, HORIZON_DAYS, horizonDates } from './notification-counts';
import type { Occurrence, Task } from './tasks/types';

/** Задача с фиксированными полями: расчёту важны только дата вхождения и отметка. */
function makeTask(id: string): Task {
  return {
    id,
    text: `Задача ${id}`,
    date: '2026-11-21',
    priority: 'medium',
    recurrence: 'daily',
    searchTokens: ['задача', id],
    createdAt: 1000,
    updatedAt: 1000,
  };
}

function makeOccurrence(id: string, date: string, done: boolean): Occurrence {
  return { task: makeTask(id), date, done };
}

describe('horizonDates', () => {
  it('по умолчанию даёт 60 дней начиная с сегодня', () => {
    const dates = horizonDates('2026-11-21');

    expect(HORIZON_DAYS).toBe(60);
    expect(dates).toHaveLength(60);
    expect(dates[0]).toBe('2026-11-21');
    expect(dates[59]).toBe('2027-01-19');
  });

  it('один день — только сегодня', () => {
    expect(horizonDates('2026-11-21', 1)).toEqual(['2026-11-21']);
  });

  it('ноль дней — пустой список', () => {
    expect(horizonDates('2026-11-21', 0)).toEqual([]);
  });

  it('переходит через конец месяца и года', () => {
    expect(horizonDates('2026-12-30', 4)).toEqual([
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
    ]);
  });

  it('учитывает 29 февраля високосного года', () => {
    expect(horizonDates('2028-02-28', 3)).toEqual(['2028-02-28', '2028-02-29', '2028-03-01']);
  });

  it('пропускает 29 февраля невисокосного года', () => {
    expect(horizonDates('2027-02-28', 2)).toEqual(['2027-02-28', '2027-03-01']);
  });

  // Стенд тестов живёт в America/New_York: 8 марта 2026 там длится 23 часа, 1 ноября — 25.
  it('день перевода часов вперёд не теряет и не дублирует дату', () => {
    expect(horizonDates('2026-03-07', 3)).toEqual(['2026-03-07', '2026-03-08', '2026-03-09']);
  });

  it('день перевода часов назад не теряет и не дублирует дату', () => {
    expect(horizonDates('2026-10-31', 3)).toEqual(['2026-10-31', '2026-11-01', '2026-11-02']);
  });
});

// В западной зоне стенда локальная полночь — тот же день по UTC, и строка из UTC-полей
// (toISOString) совпадает с локальной. В восточной зоне (Москва, UTC+3) полночь — 21:00 UTC
// предыдущего дня: такая подмена сдвинула бы весь горизонт на сутки назад. Node применяет
// новое значение TZ сразу после присваивания; зона стенда возвращается после каждого теста.
describe('horizonDates в восточной зоне', () => {
  let standZone: string | undefined;

  beforeEach(() => {
    standZone = process.env.TZ;
    process.env.TZ = 'Europe/Moscow';
  });

  afterEach(() => {
    // Присваивание undefined записало бы строку 'undefined', поэтому отсутствующую зону удаляем.
    if (standZone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = standZone;
    }
  });

  it('зона действительно сменилась на UTC+3', () => {
    expect(new Date(2026, 10, 21).getTimezoneOffset()).toBe(-180);
  });

  it('дни горизонта не сдвигаются на сутки назад', () => {
    expect(horizonDates('2026-11-21', 3)).toEqual(['2026-11-21', '2026-11-22', '2026-11-23']);
  });

  it('переход через конец года не сдвигается', () => {
    expect(horizonDates('2026-12-31', 2)).toEqual(['2026-12-31', '2027-01-01']);
  });
});

describe('countPendingByDay', () => {
  const dates = ['2026-11-21', '2026-11-22', '2026-11-23'];

  it('без вхождений все дни получают ноль', () => {
    expect(countPendingByDay([], dates)).toEqual([
      { date: '2026-11-21', count: 0 },
      { date: '2026-11-22', count: 0 },
      { date: '2026-11-23', count: 0 },
    ]);
  });

  it('пустой список дней даёт пустой результат даже при вхождениях', () => {
    expect(countPendingByDay([makeOccurrence('a', '2026-11-21', false)], [])).toEqual([]);
  });

  it('считает только незавершённые вхождения каждого дня', () => {
    const occurrences = [
      makeOccurrence('a', '2026-11-21', false),
      makeOccurrence('b', '2026-11-21', false),
      makeOccurrence('c', '2026-11-21', true),
      makeOccurrence('a', '2026-11-22', true),
      makeOccurrence('a', '2026-11-23', false),
    ];

    expect(countPendingByDay(occurrences, dates)).toEqual([
      { date: '2026-11-21', count: 2 },
      { date: '2026-11-22', count: 0 },
      { date: '2026-11-23', count: 1 },
    ]);
  });

  it('день, где все задачи отмечены, получает ноль', () => {
    const occurrences = [
      makeOccurrence('a', '2026-11-21', true),
      makeOccurrence('b', '2026-11-21', true),
    ];

    expect(countPendingByDay(occurrences, ['2026-11-21'])).toEqual([
      { date: '2026-11-21', count: 0 },
    ]);
  });

  it('вхождения вне списка дней не учитываются', () => {
    const occurrences = [
      makeOccurrence('a', '2026-11-20', false),
      makeOccurrence('b', '2026-11-24', false),
      makeOccurrence('c', '2026-11-22', false),
    ];

    expect(countPendingByDay(occurrences, dates)).toEqual([
      { date: '2026-11-21', count: 0 },
      { date: '2026-11-22', count: 1 },
      { date: '2026-11-23', count: 0 },
    ]);
  });

  it('порядок результата — порядок списка дней, а не вхождений', () => {
    const occurrences = [
      makeOccurrence('a', '2026-11-23', false),
      makeOccurrence('b', '2026-11-21', false),
    ];

    expect(countPendingByDay(occurrences, ['2026-11-23', '2026-11-21'])).toEqual([
      { date: '2026-11-23', count: 1 },
      { date: '2026-11-21', count: 1 },
    ]);
  });
});
