import { describe, expect, it } from 'vitest';
import { compareTasksInDay, sortOccurrences, sortTasksByDate } from './sort';
import type { Occurrence, Priority, Task } from './types';

/** Задача с минимально нужными для сортировки полями; остальное — фиксированные значения. */
function makeTask(id: string, priority: Priority, date = '2026-09-15'): Task {
  return {
    id,
    text: `Задача ${id}`,
    date,
    priority,
    recurrence: 'none',
    searchTokens: ['задача', id],
    createdAt: 1000,
    updatedAt: 1000,
  };
}

/** Вхождение задачи без повторений: день вхождения совпадает с датой задачи. */
function makeOccurrence(id: string, priority: Priority, date = '2026-09-15'): Occurrence {
  return { task: makeTask(id, priority, date), date, done: false };
}

/** Идентификаторы задаются по возрастанию: UUID v7 сортируется по времени создания. */
const EARLY = '0192f000-0000-7000-8000-000000000001';
const MIDDLE = '0192f000-0000-7000-8000-000000000002';
const LATE = '0192f000-0000-7000-8000-000000000003';

describe('compareTasksInDay', () => {
  it('высокий приоритет идёт раньше среднего', () => {
    expect(compareTasksInDay(makeTask(LATE, 'high'), makeTask(EARLY, 'medium'))).toBeLessThan(0);
  });

  it('средний приоритет идёт раньше низкого', () => {
    expect(compareTasksInDay(makeTask(LATE, 'medium'), makeTask(EARLY, 'low'))).toBeLessThan(0);
  });

  it('низкий приоритет идёт позже высокого', () => {
    expect(compareTasksInDay(makeTask(EARLY, 'low'), makeTask(LATE, 'high'))).toBeGreaterThan(0);
  });

  it('при равном приоритете раньше идёт созданная раньше', () => {
    expect(compareTasksInDay(makeTask(EARLY, 'medium'), makeTask(LATE, 'medium'))).toBeLessThan(0);
  });

  it('одна и та же задача равна сама себе', () => {
    expect(compareTasksInDay(makeTask(EARLY, 'medium'), makeTask(EARLY, 'medium'))).toBe(0);
  });
});

describe('sortOccurrences', () => {
  it('пустой список остаётся пустым', () => {
    expect(sortOccurrences([])).toEqual([]);
  });

  it('список из одного вхождения не меняется', () => {
    const only = makeOccurrence(EARLY, 'low');

    expect(sortOccurrences([only])).toEqual([only]);
  });

  it('раскладывает перемешанные приоритеты в порядке высокий, средний, низкий', () => {
    const low = makeOccurrence(EARLY, 'low');
    const high = makeOccurrence(MIDDLE, 'high');
    const medium = makeOccurrence(LATE, 'medium');

    expect(sortOccurrences([low, high, medium]).map((item) => item.task.id)).toEqual([
      MIDDLE,
      LATE,
      EARLY,
    ]);
  });

  it('внутри одного приоритета сохраняет порядок создания', () => {
    const third = makeOccurrence(LATE, 'high');
    const first = makeOccurrence(EARLY, 'high');
    const second = makeOccurrence(MIDDLE, 'high');

    expect(sortOccurrences([third, first, second]).map((item) => item.task.id)).toEqual([
      EARLY,
      MIDDLE,
      LATE,
    ]);
  });

  it('не меняет исходный массив', () => {
    const occurrences = [makeOccurrence(EARLY, 'low'), makeOccurrence(MIDDLE, 'high')];

    sortOccurrences(occurrences);

    expect(occurrences.map((item) => item.task.id)).toEqual([EARLY, MIDDLE]);
  });

  it('сортирует по дню вхождения, а внутри дня — по приоритету', () => {
    const tomorrowHigh = makeOccurrence(EARLY, 'high', '2026-09-16');
    const todayLow = makeOccurrence(MIDDLE, 'low', '2026-09-15');
    const todayHigh = makeOccurrence(LATE, 'high', '2026-09-15');

    expect(
      sortOccurrences([tomorrowHigh, todayLow, todayHigh]).map((item) => item.task.id),
    ).toEqual([LATE, MIDDLE, EARLY]);
  });

  it('сравнивает день вхождения, а не дату старта задачи', () => {
    // У регулярной задачи день вхождения отличается от даты старта.
    const weeklyLater: Occurrence = {
      task: makeTask(EARLY, 'medium', '2026-09-01'),
      date: '2026-09-22',
      done: false,
    };
    const plainEarlier = makeOccurrence(MIDDLE, 'medium', '2026-09-15');

    expect(sortOccurrences([weeklyLater, plainEarlier]).map((item) => item.date)).toEqual([
      '2026-09-15',
      '2026-09-22',
    ]);
  });

  it('при полностью равных ключах сохраняет исходный порядок', () => {
    const first: Occurrence = { ...makeOccurrence(EARLY, 'medium'), done: true };
    const second = makeOccurrence(EARLY, 'medium');

    const sorted = sortOccurrences([first, second]);

    expect(sorted[0]).toBe(first);
    expect(sorted[1]).toBe(second);
  });
});

describe('sortTasksByDate', () => {
  it('пустой список остаётся пустым', () => {
    expect(sortTasksByDate([])).toEqual([]);
  });

  it('сортирует по дате, а внутри дня — по приоритету и времени создания', () => {
    const tasks = [
      makeTask(EARLY, 'low', '2026-09-16'),
      makeTask(MIDDLE, 'low', '2026-09-15'),
      makeTask(LATE, 'high', '2026-09-15'),
    ];

    expect(sortTasksByDate(tasks).map((task) => task.id)).toEqual([LATE, MIDDLE, EARLY]);
  });

  it('сравнивает даты как строки, а не как числа', () => {
    const tasks = [
      makeTask(EARLY, 'medium', '2026-10-01'),
      makeTask(MIDDLE, 'medium', '2026-09-30'),
    ];

    expect(sortTasksByDate(tasks).map((task) => task.date)).toEqual(['2026-09-30', '2026-10-01']);
  });
});
