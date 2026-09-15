/**
 * Точка получения хранилища задач.
 *
 * Экранам достаётся интерфейс TaskRepository, а не конкретная реализация: смена
 * хранилища (решение Р-15 допускает уход с Dexie) не затрагивает вызывающий код.
 */

import { DexieTaskRepository } from './dexie-repository';
import type { TaskRepository } from './types';

/** Хранилище задач приложения — IndexedDB через Dexie. */
export function createTaskRepository(): TaskRepository {
  return new DexieTaskRepository();
}
