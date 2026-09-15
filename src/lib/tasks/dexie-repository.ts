/**
 * Хранилище задач в IndexedDB через Dexie (решение Р-15, требование Т-9).
 *
 * Поведение повторяет MemoryTaskRepository, отличается только доступ к данным:
 * выборки идут по индексам, а не перебором (требования Т-7, Т-8).
 *
 * Модуль тестами не покрывается: это и есть слой доступа к базе, а автотесты
 * проекта не обращаются к базам данных вообще (docs/code_style.md, «Тесты»).
 * Логика, общая с хранилищем в памяти, вынесена в чистые модули sort.ts и text.ts
 * и проверяется там.
 */

import Dexie from 'dexie';
import type { Table } from 'dexie';
import { createId } from './id';
import { sortTasksByDate, sortTasksForDay } from './sort';
import { DEFAULT_SEARCH_LIMIT, matchesSearchQuery, parseSearchQuery, tokenize } from './text';
import type { NewTask, Task, TaskPatch, TaskRepository } from './types';

/** Имя базы в IndexedDB. */
const DATABASE_NAME = 'secretar';

/** Версия схемы. Меняется только добавлением новой версии Dexie, не правкой этой. */
const SCHEMA_VERSION = 1;

/**
 * Схема таблицы `tasks`: первичный ключ и индексы.
 * `date` — выборка дня и диапазона; `priority` и `[priority+date]` — отбор по
 * приоритету, в том числе внутри диапазона дат; `*searchTokens` — multiEntry-индекс
 * поиска; `updatedAt` — порядок последних изменений.
 */
const TASKS_SCHEMA = 'id, date, priority, [priority+date], *searchTokens, updatedAt';

export class DexieTaskRepository implements TaskRepository {
  private readonly db: Dexie;

  private readonly tasks: Table<Task, string>;

  constructor(databaseName: string = DATABASE_NAME) {
    this.db = new Dexie(databaseName);
    this.db.version(SCHEMA_VERSION).stores({ tasks: TASKS_SCHEMA });
    this.tasks = this.db.table<Task, string>('tasks');
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

    await this.tasks.add(task);

    return task;
  }

  async listByDate(date: string): Promise<Task[]> {
    const found = await this.tasks.where('date').equals(date).toArray();

    return sortTasksForDay(found);
  }

  async listByRange(from: string, to: string): Promise<Task[]> {
    // Границы включительно; даты плавающие и сравниваются как строки.
    const found = await this.tasks.where('date').between(from, to, true, true).toArray();

    return sortTasksByDate(found);
  }

  async get(id: string): Promise<Task | null> {
    return (await this.tasks.get(id)) ?? null;
  }

  async update(id: string, patch: TaskPatch): Promise<Task | null> {
    // Чтение и запись в одной транзакции: между ними задачу могла изменить другая вкладка.
    return this.db.transaction('rw', this.tasks, async () => {
      const current = await this.tasks.get(id);

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

      await this.tasks.put(next);

      return next;
    });
  }

  async remove(id: string): Promise<boolean> {
    return this.db.transaction('rw', this.tasks, async () => {
      const deleted = await this.tasks.where('id').equals(id).delete();

      return deleted > 0;
    });
  }

  /**
   * Поиск по вхождению (требование Т-6).
   *
   * По индексу отбирается самый длинный токен запроса — он отсекает больше всего
   * лишнего; остальные условия проверяются на курсоре, поэтому обход
   * останавливается, как только набрано `limit` подходящих задач, и объём базы
   * на время отклика не влияет (требование Т-8).
   */
  async search(query: string, limit: number = DEFAULT_SEARCH_LIMIT): Promise<Task[]> {
    const parsed = parseSearchQuery(query);

    if (parsed.tokens.length === 0 || limit <= 0) {
      return [];
    }

    const indexKey = parsed.tokens.reduce((longest, token) =>
      token.length > longest.length ? token : longest,
    );

    const found = await this.tasks
      .where('searchTokens')
      .startsWith(indexKey)
      .distinct()
      .filter((task) => matchesSearchQuery(task.text, task.searchTokens, parsed))
      .limit(limit)
      .toArray();

    return sortTasksByDate(found);
  }

  /** Закрывает соединение с базой. Нужно при замене хранилища на ходу. */
  close(): void {
    this.db.close();
  }
}
