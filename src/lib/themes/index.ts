/**
 * Сбор всех тем проекта.
 *
 * Файлы тем подключаются через import.meta.glob: список не перечисляется руками,
 * поэтому появление нового файла v31.ts достаточно только создать — правки здесь не нужны.
 * Пустой набор тем допустим: приложение работает на значениях по умолчанию из app.css.
 */

import type { Theme } from './types';

const modules = import.meta.glob<{ default: Theme }>('./v*.ts', { eager: true });

/** Все темы, отсортированные по id ('v01' … 'v30'). Пустой массив, пока файлов тем нет. */
export const themes: Theme[] = Object.values(modules)
  .map((module) => module.default)
  .filter((theme): theme is Theme => Boolean(theme) && typeof theme.id === 'string')
  .sort((a, b) => a.id.localeCompare(b.id, 'en'));

/** Тема по идентификатору; undefined, если такой темы нет (например, сохранён id удалённой темы). */
export function findTheme(id: string | null | undefined): Theme | undefined {
  if (typeof id !== 'string' || id.length === 0) {
    return undefined;
  }

  return themes.find((theme) => theme.id === id);
}
