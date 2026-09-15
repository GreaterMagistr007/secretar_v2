/**
 * Оформление приоритета задачи (требование Т-24).
 *
 * Соответствие «приоритет — токен» задано в docs/design_tokens.md и собрано здесь
 * в одном месте: метка приоритета рисуется в трёх местах — в сетке календаря,
 * в списке задач дня и на экране задачи.
 */

import type { Priority } from './tasks/types';

/** Цвет метки приоритета. Значение — токен темы, литеральных цветов в компонентах нет. */
export const PRIORITY_COLOR: Record<Priority, string> = {
  high: 'var(--color-task-c)',
  medium: 'var(--color-task-a)',
  low: 'var(--color-task-b)',
};

/** Порядок показа приоритетов: важное первым — и в метках дня, и в форме создания. */
export const PRIORITY_ORDER: readonly Priority[] = ['high', 'medium', 'low'];
