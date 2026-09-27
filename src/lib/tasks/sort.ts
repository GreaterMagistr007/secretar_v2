/**
 * Порядок задач в списках (требование Т-24).
 *
 * Внутри дня сначала высокий приоритет, затем средний, затем низкий; равные
 * приоритеты — по времени создания. Отдельного сравнения по времени не нужно:
 * идентификатор задачи — UUID v7, он сортируется по времени создания как строка.
 */

import type { Occurrence, Priority, Task } from './types';

/** Вес приоритета: чем меньше, тем выше место в списке. */
const PRIORITY_WEIGHT: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/** Сравнение задач одного дня: приоритет, затем время создания. */
export function compareTasksInDay(a: Task, b: Task): number {
  const byPriority = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];

  if (byPriority !== 0) {
    return byPriority;
  }

  if (a.id === b.id) {
    return 0;
  }

  return a.id < b.id ? -1 : 1;
}

/**
 * Вхождения в порядке показа: по дню вхождения, внутри дня — как в списке дня.
 * Порядок — часть контракта хранилища, у обеих реализаций он обязан совпадать.
 */
export function sortOccurrences(occurrences: readonly Occurrence[]): Occurrence[] {
  return [...occurrences].sort((a, b) => {
    if (a.date === b.date) {
      return compareTasksInDay(a.task, b.task);
    }

    return a.date < b.date ? -1 : 1;
  });
}

/** Список задач нескольких дней: по дате, внутри дня — как в списке дня. */
export function sortTasksByDate(tasks: readonly Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.date === b.date) {
      return compareTasksInDay(a, b);
    }

    return a.date < b.date ? -1 : 1;
  });
}
