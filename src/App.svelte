<script lang="ts">
  /**
   * Оболочка приложения: применение сохранённой темы, вывод экрана по маршруту,
   * нижняя навигация, видимая на всех экранах (требование Т-18), всплывающее сообщение
   * (решение Р-35) и синхронизация уведомления о задачах дня в Android-приложении
   * (требование Т-31).
   */
  import BottomNav from './lib/components/BottomNav.svelte';
  import Toast from './lib/components/Toast.svelte';
  import CalendarScreen from './routes/CalendarScreen.svelte';
  import NotificationsScreen from './routes/NotificationsScreen.svelte';
  import SettingsScreen from './routes/SettingsScreen.svelte';
  import TaskScreen from './routes/TaskScreen.svelte';
  import ThemePickerScreen from './routes/ThemePickerScreen.svelte';
  import { router, startRouter } from './lib/router.svelte';
  import { startTaskNotifier } from './lib/task-notifier';
  import { findTheme } from './lib/themes/index';
  import { applyTheme, loadThemeId, saveThemeId } from './lib/themes/apply';
  import type { Theme } from './lib/themes/types';

  // Тема восстанавливается до первой отрисовки (требование Т-21). Если выбора не было
  // или сохранён id исчезнувшей темы, приложение остаётся на значениях из app.css.
  const savedTheme = findTheme(loadThemeId());

  let currentThemeId = $state<string | null>(savedTheme ? savedTheme.id : null);

  if (savedTheme) {
    applyTheme(savedTheme);
  }

  // Слежение за хэшем живёт столько же, сколько оболочка.
  $effect(() => startRouter());

  // Передача чисел нативной части при старте и при каждом возвращении в приложение;
  // в браузере ничего не делает.
  $effect(() => startTaskNotifier());

  /** Клик по карточке темы: перекрашивает приложение целиком и запоминает выбор. */
  function selectTheme(theme: Theme): void {
    applyTheme(theme);
    saveThemeId(theme.id);
    currentThemeId = theme.id;
  }
</script>

<div class="app">
  <main class="content">
    {#if router.current === '/settings'}
      <SettingsScreen />
    {:else if router.current === '/settings/theme'}
      <ThemePickerScreen {currentThemeId} onSelect={selectTheme} />
    {:else if router.current === '/settings/notifications'}
      <NotificationsScreen />
    {:else if router.current === '/task'}
      <TaskScreen id={router.taskId} />
    {:else}
      <CalendarScreen />
    {/if}
  </main>

  <BottomNav current={router.current} />

  <Toast />
</div>

<style>
  .app {
    min-height: 100svh;
    background: var(--color-bg);
  }

  .content {
    /* Запас снизу: панель навигации прижата к низу и не должна перекрывать содержимое. */
    padding:
      env(safe-area-inset-top) env(safe-area-inset-right)
      calc(var(--nav-height) + env(safe-area-inset-bottom)) env(safe-area-inset-left);
  }
</style>
