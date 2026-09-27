/**
 * Хранилище задач в памяти.
 *
 * Рабочая реализация контракта TaskRepository и эталон поведения для проверок:
 * юнит-тесты работают с ней и не открывают ни одного соединения с базой
 * (правило проекта, docs/code_style.md, раздел «Тесты»).
 */

import { createId } from './id';
import { occurrencesInRange, occursOn } from './recurrence';
import { sortOccurrences, sortTasksByDate } from './sort';
import { DEFAULT_SEARCH_LIMIT, matchesSearchQuery, parseSearchQuery, tokenize } from './text';
import type { NewTask, Occurrence, Task, TaskPatch, TaskRepository } from './types';

export class MemoryTaskRepository implements TaskRepository {
  private readonly tasks = new Map<string, Task>();

  /**
   * Отметки выполнения: ключ `${taskId}|${occurrenceDate}`. Время отметки в памяти не
   * хранится — наружу отдаётся только признак `done`.
   */
  private readonly completions = new Set<string>();

  /**
   * Копия задачи: наружу и внутрь хранилища попадают разные объекты, иначе
   * вызывающий код может незаметно поменять сохранённые данные.
   */
  private static copy(task: Task): Task {
    return { ...task, searchTokens: [...task.searchTokens] };
  }

  /** Ключ отметки. Форма ключа та же, что в Dexie-реализации, — реализации не разойдутся. */
  private static completionKey(taskId: string, occurrenceDate: string): string {
    return `${taskId}|${occurrenceDate}`;
  }

  /** Вхождение задачи в указанный день вместе с отметкой выполнения этого дня. */
  private occurrence(task: Task, date: string): Occurrence {
    return {
      task: MemoryTaskRepository.copy(task),
      date,
      done: this.completions.has(MemoryTaskRepository.completionKey(task.id, date)),
    };
  }

  async create(data: NewTask): Promise<Task> {
    const now = Date.now();
    const task: Task = {
      id: createId(),
      text: data.text,
      date: data.date,
      priority: data.priority,
      recurrence: data.recurrence,
      searchTokens: tokenize(data.text),
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.set(task.id, MemoryTaskRepository.copy(task));

    return MemoryTaskRepository.copy(task);
  }

  async listOccurrencesByDate(date: string): Promise<Occurrence[]> {
    const found = [...this.tasks.values()]
      .filter((task) => occursOn(task.date, task.recurrence, date))
      .map((task) => this.occurrence(task, date));

    return sortOccurrences(found);
  }

  async listOccurrencesByRange(from: string, to: string): Promise<Occurrence[]> {
    const found = [...this.tasks.values()].flatMap((task) =>
      occurrencesInRange(task.date, task.recurrence, from, to).map((date) =>
        this.occurrence(task, date),
      ),
    );

    return sortOccurrences(found);
  }

  async setCompleted(taskId: string, occurrenceDate: string, done: boolean): Promise<void> {
    const key = MemoryTaskRepository.completionKey(taskId, occurrenceDate);

    if (done) {
      this.completions.add(key);
    } else {
      this.completions.delete(key);
    }
  }

  async get(id: string): Promise<Task | null> {
    const task = this.tasks.get(id);

    return task === undefined ? null : MemoryTaskRepository.copy(task);
  }

  async update(id: string, patch: TaskPatch): Promise<Task | null> {
    const current = this.tasks.get(id);

    if (current === undefined) {
      return null;
    }

    const text = patch.text ?? current.text;
    const next: Task = {
      ...current,
      text,
      date: patch.date ?? current.date,
      priority: patch.priority ?? current.priority,
      recurrence: patch.recurrence ?? current.recurrence,
      searchTokens: tokenize(text),
      updatedAt: Date.now(),
    };

    this.tasks.set(id, next);

    return MemoryTaskRepository.copy(next);
  }

  async remove(id: string): Promise<boolean> {
    const prefix = `${id}|`;

    // Каскад: вместе с задачей уходят все её отметки выполнения.
    for (const key of this.completions) {
      if (key.startsWith(prefix)) {
        this.completions.delete(key);
      }
    }

    return this.tasks.delete(id);
  }

  async search(query: string, limit: number = DEFAULT_SEARCH_LIMIT): Promise<Task[]> {
    const parsed = parseSearchQuery(query);

    if (parsed.tokens.length === 0 || limit <= 0) {
      return [];
    }

    const found = [...this.tasks.values()].filter((task) =>
      matchesSearchQuery(task.text, task.searchTokens, parsed),
    );

    return sortTasksByDate(found).slice(0, limit).map(MemoryTaskRepository.copy);
  }
}
