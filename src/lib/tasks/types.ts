/**
 * Контракт сущности «Задача».
 *
 * Требования: Т-1 (привязка к дню), Т-2 (описание обязательно), Т-3 (дата),
 * Т-24 (приоритет), Т-26 (форма создания). Модель хранения — docs/architecture_storage.md.
 *
 * Слой доступа к данным описан интерфейсом намеренно: юнит-тесты работают с фейковой
 * реализацией в памяти и не открывают ни одного соединения с базой (правило проекта).
 */

/** Приоритет задачи. Закрытый перечень, требование Т-24. */
export type Priority = 'low' | 'medium' | 'high';

/** Регулярность повторения. Закрытый перечень, требование Т-4. */
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

/** Приоритет по умолчанию при создании задачи — «Средний» (требование Т-26). */
export const DEFAULT_PRIORITY: Priority = 'medium';

/** Подписи приоритетов для интерфейса. Порядок — как в легенде календаря. */
export const PRIORITY_LABELS: Record<Priority, string> = {
  medium: 'Средний',
  low: 'Низкий',
  high: 'Высокий',
};

/** Задача как она лежит в хранилище. */
export interface Task {
  /** UUID v7: сортируется по времени создания. */
  id: string;
  /** Текст задачи, непустой после обрезки пробелов (требование Т-2). */
  text: string;
  /** Дата в формате YYYY-MM-DD — плавающая, без времени и часового пояса. */
  date: string;
  /** Приоритет (требование Т-24). */
  priority: Priority;
  /**
   * Регулярность (требование Т-4). В форме создания пока не показывается,
   * у новых задач всегда 'none' — поле заведено сразу, чтобы не менять схему позже.
   */
  recurrence: Recurrence;
  /** Нормализованные токены текста под поиск по вхождению (требование Т-6). */
  searchTokens: string[];
  /** Метки времени, epoch ms. */
  createdAt: number;
  updatedAt: number;
}

/** Данные формы создания задачи: только то, что вводит пользователь. */
export interface NewTask {
  text: string;
  date: string;
  priority: Priority;
}

/** Поля, доступные для правки. */
export type TaskPatch = Partial<Pick<Task, 'text' | 'date' | 'priority' | 'recurrence'>>;

/**
 * Хранилище задач. Реализации: Dexie поверх IndexedDB в приложении и фейк в памяти в тестах.
 * Все методы асинхронные — IndexedDB синхронного доступа не даёт.
 */
export interface TaskRepository {
  /** Создаёт задачу и возвращает её целиком. Валидация — на вызывающей стороне. */
  create(data: NewTask): Promise<Task>;
  /** Задачи одного дня, отсортированные по приоритету (высокий первым), затем по времени создания. */
  listByDate(date: string): Promise<Task[]>;
  /** Задачи диапазона дат включительно — для отметок в сетке календаря. */
  listByRange(from: string, to: string): Promise<Task[]>;
  /** Одна задача по идентификатору; null, если её нет. */
  get(id: string): Promise<Task | null>;
  /** Частичная правка; возвращает обновлённую задачу или null, если задачи нет. */
  update(id: string, patch: TaskPatch): Promise<Task | null>;
  /** Удаление; true, если задача существовала. */
  remove(id: string): Promise<boolean>;
  /** Поиск по вхождению в текст (требование Т-6). */
  search(query: string, limit?: number): Promise<Task[]>;
}
