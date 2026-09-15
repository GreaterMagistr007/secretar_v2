/**
 * Хранилище задач в памяти.
 *
 * Рабочая реализация контракта TaskRepository и эталон поведения для проверок:
 * юнит-тесты работают с ней и не открывают ни одного соединения с базой
 * (правило проекта, docs/code_style.md, раздел «Тесты»).
 */

import { createId } from './id';
import { sortTasksByDate, sortTasksForDay } from './sort';
import { DEFAULT_SEARCH_LIMIT, matchesSearchQuery, parseSearchQuery, tokenize } from './text';
import type { NewTask, Task, TaskPatch, TaskRepository } from './types';

export class MemoryTaskRepository implements TaskRepository {
  private readonly tasks = new Map<string, Task>();

  /**
   * Копия задачи: наружу и внутрь хранилища попадают разные объекты, иначе
   * вызывающий код может незаметно поменять сохранённые данные.
   */
  private static copy(task: Task): Task {
    return { ...task, searchTokens: [...task.searchTokens] };
  }

  async create(data: NewTask): Promise<Task> {
    const now = Date.now();
    const task: Task = {
      id: createId(),
      text: data.text,
      date: data.date,
      priority: data.priority,
      recurrence: 'none',
      searchTokens: tokenize(data.text),
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.set(task.id, MemoryTaskRepository.copy(task));

    return MemoryTaskRepository.copy(task);
  }

  async listByDate(date: string): Promise<Task[]> {
    const found = [...this.tasks.values()].filter((task) => task.date === date);

    return sortTasksForDay(found).map(MemoryTaskRepository.copy);
  }

  async listByRange(from: string, to: string): Promise<Task[]> {
    // Даты плавающие и записаны как YYYY-MM-DD, поэтому сравниваются как строки.
    const found = [...this.tasks.values()].filter((task) => task.date >= from && task.date <= to);

    return sortTasksByDate(found).map(MemoryTaskRepository.copy);
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
