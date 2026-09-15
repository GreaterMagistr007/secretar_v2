/**
 * Единственный на приложение экземпляр хранилища задач.
 *
 * Экраны обращаются к данным только через него: календарь и экран задачи
 * работают с одним соединением, а не открывают своё на каждое монтирование.
 */

import { createTaskRepository } from './tasks/repository';
import type { TaskRepository } from './tasks/types';

export const taskRepository: TaskRepository = createTaskRepository();
