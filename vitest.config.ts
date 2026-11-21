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
    // Западная зона с ненулевым смещением — намеренно, а не для экзотики. Весь проект держится
    // на «плавающих» датах: день хранится строкой и собирается из ЛОКАЛЬНЫХ полей Date, потому
    // что UTC сдвигает сутки. В зоне UTC локальные и UTC-поля совпадают, и подмена одного на
    // другое тестами не ловится — именно такую ошибку пришлось искать вручную в модуле повторений.
    // Здесь поздний вечер по местному времени в UTC уже следующий день, и такие ошибки видны.
    // Не все: локальная полночь здесь — тот же день по UTC, поэтому подмену для значений,
    // построенных от полуночи, ловит только восточная зона (UTC+3) — такие тесты временно
    // меняют process.env.TZ сами (notification-counts.test.ts).
    env: { TZ: 'America/New_York' },
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      include: [
        'src/lib/tasks/**/*.ts',
        'src/lib/date.ts',
        'src/lib/notification-counts.ts',
        'src/lib/task-notifier.ts',
        'src/lib/toast.ts',
      ],
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
