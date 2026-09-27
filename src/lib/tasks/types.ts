/**
 * Контракт сущности «Задача».
 *
 * Требования: Т-1 (привязка к дню), Т-2 (описание обязательно), Т-3 (дата),
 * Т-4 (регулярность), Т-5 (статус выполнения), Т-24 (приоритет), Т-26 (форма создания).
 * Модель хранения — docs/architecture_storage.md.
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

/** Повторение по умолчанию при создании задачи — «Без повторений» (требование Т-4). */
export const DEFAULT_RECURRENCE: Recurrence = 'none';

/** Подписи повторений для интерфейса. Формулировки — дословно из требования Т-4. */
export const RECURRENCE_LABELS: Record<Recurrence, string> = {
  none: 'Без повторений',
  daily: 'Ежедневно',
  weekly: 'Еженедельно',
  monthly: 'Ежемесячно',
  yearly: 'Ежегодично',
};

/** Порядок показа в форме — как в требовании Т-4: без повторений, затем от частого к редкому. */
export const RECURRENCE_ORDER: readonly Recurrence[] = [
  'none',
  'daily',
  'weekly',
  'monthly',
  'yearly',
];

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
  /** Регулярность (требование Т-4). Вхождения не материализуются — решение Р-15. */
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
  recurrence: Recurrence;
}

/** Поля, доступные для правки. */
export type TaskPatch = Partial<Pick<Task, 'text' | 'date' | 'priority' | 'recurrence'>>;

/** Отметка выполнения одного повторения (требование Т-5, решение Р-16). */
export interface Completion {
  taskId: string;
  /** День повторения, которое выполнено, в виде YYYY-MM-DD. */
  occurrenceDate: string;
  completedAt: number;
}

/** Вхождение задачи в конкретный день: правило развёрнуто на этот день. */
export interface Occurrence {
  task: Task;
  /** День вхождения в виде YYYY-MM-DD. Для задачи без повторений равен `task.date`. */
  date: string;
  /** Отметка выполнения именно этого дня (требование Т-5). */
  done: boolean;
}

/**
 * Хранилище задач. Реализации: Dexie поверх IndexedDB в приложении и фейк в памяти в тестах.
 * Все методы асинхронные — IndexedDB синхронного доступа не даёт.
 */
export interface TaskRepository {
  /** Создаёт задачу и возвращает её целиком. Валидация — на вызывающей стороне. */
  create(data: NewTask): Promise<Task>;
  /** Вхождения всех задач в один день, в порядке показа списка дня. */
  listOccurrencesByDate(date: string): Promise<Occurrence[]>;
  /** Вхождения всех задач в диапазон дат включительно — для меток сетки календаря. */
  listOccurrencesByRange(from: string, to: string): Promise<Occurrence[]>;
  /** Ставит или снимает отметку выполнения одного повторения. */
  setCompleted(taskId: string, occurrenceDate: string, done: boolean): Promise<void>;
  /** Одна задача по идентификатору; null, если её нет. */
  get(id: string): Promise<Task | null>;
  /** Частичная правка; возвращает обновлённую задачу или null, если задачи нет. */
  update(id: string, patch: TaskPatch): Promise<Task | null>;
  /** Удаление; true, если задача существовала. */
  remove(id: string): Promise<boolean>;
  /** Поиск по вхождению в текст (требование Т-6). */
  search(query: string, limit?: number): Promise<Task[]>;
}
