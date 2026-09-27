/**
 * Хранилище задач в IndexedDB через Dexie (решение Р-15, требование Т-9).
 *
 * Поведение повторяет MemoryTaskRepository, отличается только доступ к данным: выборки идут
 * по индексам, а не сканированием всей таблицы (требования Т-7, Т-8). Исключение названо
 * прямо: у регулярных задач индекс `recurrence` отделяет их от нерегулярных, но по дате не
 * сужает, поэтому все правила повторения читаются и разворачиваются в памяти. Это цена
 * решения Р-15 — вхождений повторений в базе нет, индексировать нечего.
 *
 * Модуль тестами не покрывается: это и есть слой доступа к базе, а автотесты
 * проекта не обращаются к базам данных вообще (docs/code_style.md, «Тесты»).
 * Логика, общая с хранилищем в памяти, вынесена в чистые модули recurrence.ts,
 * sort.ts и text.ts и проверяется там.
 */

import Dexie from 'dexie';
import type { Table } from 'dexie';
import { createId } from './id';
import { occurrencesInRange, occursOn } from './recurrence';
import { sortOccurrences, sortTasksByDate } from './sort';
import { DEFAULT_SEARCH_LIMIT, matchesSearchQuery, parseSearchQuery, tokenize } from './text';
import type {
  Completion,
  NewTask,
  Occurrence,
  Recurrence,
  Task,
  TaskPatch,
  TaskRepository,
} from './types';

/** Имя базы в IndexedDB. */
const DATABASE_NAME = 'secretar';

/** Версия схемы. Меняется только добавлением новой версии Dexie, не правкой прежних. */
const SCHEMA_VERSION = 2;

/**
 * Схема таблицы `tasks` версии 1: первичный ключ и индексы.
 * `date` — выборка дня и диапазона; `priority` и `[priority+date]` — отбор по
 * приоритету, в том числе внутри диапазона дат; `*searchTokens` — multiEntry-индекс
 * поиска; `updatedAt` — порядок последних изменений.
 */
const TASKS_SCHEMA = 'id, date, priority, [priority+date], *searchTokens, updatedAt';

/**
 * Схема таблицы `tasks` версии 2: добавлен индекс `recurrence`. Он отделяет
 * регулярные задачи от нерегулярных и по дате не сужает ничего — это прямая цена
 * решения Р-15: у правила повторения вхождений в базе нет, индексировать нечего.
 */
const TASKS_SCHEMA_V2 = 'id, date, priority, recurrence, [priority+date], *searchTokens, updatedAt';

/**
 * Схема таблицы `completions` (требование Т-5, решение Р-16): составной первичный ключ
 * «задача + день повторения», отдельные индексы — для каскадного удаления по задаче
 * и для выборки отметок дня или диапазона.
 */
const COMPLETIONS_SCHEMA = '[taskId+occurrenceDate], taskId, occurrenceDate';

/** Значения `recurrence`, у которых бывают вхождения помимо дня старта. */
const RECURRING: readonly Recurrence[] = ['daily', 'weekly', 'monthly', 'yearly'];

export class DexieTaskRepository implements TaskRepository {
  private readonly db: Dexie;

  private readonly tasks: Table<Task, string>;

  private readonly completions: Table<Completion, [string, string]>;

  constructor(databaseName: string = DATABASE_NAME) {
    this.db = new Dexie(databaseName);
    // Версия 1 оставлена как есть: применённые миграции не правятся. Функция upgrade не
    // нужна — поле `recurrence` записывалось всем задачам и в версии 1, а индекс по
    // существующим записям строит сам IndexedDB.
    this.db.version(1).stores({ tasks: TASKS_SCHEMA });
    this.db
      .version(SCHEMA_VERSION)
      .stores({ tasks: TASKS_SCHEMA_V2, completions: COMPLETIONS_SCHEMA });
    this.tasks = this.db.table<Task, string>('tasks');
    this.completions = this.db.table<Completion, [string, string]>('completions');
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

    await this.tasks.add(task);

    return task;
  }

  /**
   * Набор ключей отметок `${taskId}|${occurrenceDate}` за день или диапазон.
   * Форма ключа та же, что в реализации в памяти, — реализации не разойдутся.
   */
  private static completionKeys(completions: readonly Completion[]): Set<string> {
    return new Set(
      completions.map((completion) => `${completion.taskId}|${completion.occurrenceDate}`),
    );
  }

  async listOccurrencesByDate(date: string): Promise<Occurrence[]> {
    // Нерегулярные задачи отбираются индексом по дате, регулярные — индексом по
    // повторению: множества не пересекаются, третьего значения в типе нет,
    // поэтому вхождение не может попасть в результат дважды.
    const plain = await this.tasks
      .where('date')
      .equals(date)
      .filter((task) => task.recurrence === 'none')
      .toArray();
    const recurring = await this.tasks
      .where('recurrence')
      .anyOf(RECURRING)
      .filter((task) => task.date <= date && occursOn(task.date, task.recurrence, date))
      .toArray();
    const done = DexieTaskRepository.completionKeys(
      await this.completions.where('occurrenceDate').equals(date).toArray(),
    );

    return sortOccurrences(
      [...plain, ...recurring].map((task) => ({
        task,
        date,
        done: done.has(`${task.id}|${date}`),
      })),
    );
  }

  async listOccurrencesByRange(from: string, to: string): Promise<Occurrence[]> {
    // Границы включительно; даты плавающие и сравниваются как строки.
    const plain = await this.tasks
      .where('date')
      .between(from, to, true, true)
      .filter((task) => task.recurrence === 'none')
      .toArray();
    const recurring = await this.tasks
      .where('recurrence')
      .anyOf(RECURRING)
      .filter((task) => task.date <= to)
      .toArray();
    // Отметки диапазон тоже читает: поле `done` обязательное и врать не должно.
    const done = DexieTaskRepository.completionKeys(
      await this.completions.where('occurrenceDate').between(from, to, true, true).toArray(),
    );

    const occurrences: Occurrence[] = plain.map((task) => ({
      task,
      date: task.date,
      done: done.has(`${task.id}|${task.date}`),
    }));

    for (const task of recurring) {
      for (const date of occurrencesInRange(task.date, task.recurrence, from, to)) {
        occurrences.push({ task, date, done: done.has(`${task.id}|${date}`) });
      }
    }

    return sortOccurrences(occurrences);
  }

  async setCompleted(taskId: string, occurrenceDate: string, done: boolean): Promise<void> {
    if (done) {
      await this.completions.put({ taskId, occurrenceDate, completedAt: Date.now() });

      return;
    }

    await this.completions.delete([taskId, occurrenceDate]);
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
    // Транзакция перечисляет обе таблицы: без второй Dexie бросит NotFoundError на
    // записи в `completions`. Каскад обещан в docs/architecture_storage.md.
    return this.db.transaction('rw', this.tasks, this.completions, async () => {
      const deleted = await this.tasks.where('id').equals(id).delete();

      await this.completions.where('taskId').equals(id).delete();

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
