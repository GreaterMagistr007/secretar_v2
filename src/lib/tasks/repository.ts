/**
 * Точка получения хранилища задач.
 *
 * Экранам достаётся интерфейс TaskRepository, а не конкретная реализация: тесты работают
 * с реализацией в памяти, приложение — с Dexie, и вызывающий код об этом не знает.
 * Решение Р-15 закрепляет IndexedDB через Dexie и переоткрытию не подлежит; интерфейс здесь
 * не про смену хранилища, а про то, чтобы тесты не открывали базу.
 */

import { DexieTaskRepository } from './dexie-repository';
import type { TaskRepository } from './types';

/** Хранилище задач приложения — IndexedDB через Dexie. */
export function createTaskRepository(): TaskRepository {
  return new DexieTaskRepository();
}
