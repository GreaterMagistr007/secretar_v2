import { describe, expect, it } from 'vitest';
import { compareTasksInDay, sortTasksByDate, sortTasksForDay } from './sort';
import type { Priority, Task } from './types';

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

describe('sortTasksForDay', () => {
  it('пустой список остаётся пустым', () => {
    expect(sortTasksForDay([])).toEqual([]);
  });

  it('список из одной задачи не меняется', () => {
    const only = makeTask(EARLY, 'low');

    expect(sortTasksForDay([only])).toEqual([only]);
  });

  it('раскладывает перемешанные приоритеты в порядке высокий, средний, низкий', () => {
    const low = makeTask(EARLY, 'low');
    const high = makeTask(MIDDLE, 'high');
    const medium = makeTask(LATE, 'medium');

    expect(sortTasksForDay([low, high, medium]).map((task) => task.id)).toEqual([
      MIDDLE,
      LATE,
      EARLY,
    ]);
  });

  it('внутри одного приоритета сохраняет порядок создания', () => {
    const third = makeTask(LATE, 'high');
    const first = makeTask(EARLY, 'high');
    const second = makeTask(MIDDLE, 'high');

    expect(sortTasksForDay([third, first, second]).map((task) => task.id)).toEqual([
      EARLY,
      MIDDLE,
      LATE,
    ]);
  });

  it('не меняет исходный массив', () => {
    const tasks = [makeTask(EARLY, 'low'), makeTask(MIDDLE, 'high')];

    sortTasksForDay(tasks);

    expect(tasks.map((task) => task.id)).toEqual([EARLY, MIDDLE]);
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
