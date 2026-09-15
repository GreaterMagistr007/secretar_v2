import { defineConfig } from 'vitest/config';

/**
 * Конфигурация юнит-тестов.
 *
 * Окружение node: тесты работают с чистыми функциями и хранилищем в памяти,
 * браузерное окружение и база данных им не нужны — автотесты проекта не
 * обращаются к базам вообще (docs/code_style.md, раздел «Тесты»).
 *
 * Отдельный файл, а не секция в vite.config.ts: иначе тесты тянули бы плагины
 * Svelte и PWA, которые к ним отношения не имеют.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      include: ['src/lib/tasks/**/*.ts'],
      // types.ts — только контракт; dexie-repository.ts и repository.ts — слой
      // доступа к базе, он покрывается не тестами, а проверкой в приложении.
      exclude: [
        'src/lib/tasks/types.ts',
        'src/lib/tasks/dexie-repository.ts',
        'src/lib/tasks/repository.ts',
      ],
    },
  },
});
