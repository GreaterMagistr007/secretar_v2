<script lang="ts">
  /**
   * Нижняя панель навигации (требование Т-18): видна на всех экранах,
   * две вкладки — «Календарь» и «Настройки», сначала значок, под ним название.
   * Значки — инлайновый SVG: иконочные библиотеки не подключаются.
   */
  import { router } from '../router.svelte';
  import type { Route } from '../router.svelte';

  let { current }: { current: Route } = $props();

  /** Вкладка «Настройки» остаётся активной и на вложенном экране выбора темы. */
  const settingsActive = $derived(current === '/settings' || current === '/settings/theme');
  /** Экран задачи открывается из календаря, поэтому активной остаётся вкладка «Календарь». */
  const calendarActive = $derived(current === '/calendar' || current === '/task');
</script>

<nav class="nav" aria-label="Основная навигация">
  <a
    class="tab"
    class:tab--active={calendarActive}
    href={router.href('/calendar')}
    aria-current={calendarActive ? 'page' : undefined}
  >
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="3"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
      />
      <path
        d="M3 10h18M8 3v4M16 3v4"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
      />
      <rect x="7" y="13" width="3" height="3" rx="0.8" fill="currentColor" />
      <rect x="14" y="13" width="3" height="3" rx="0.8" fill="currentColor" />
    </svg>
    <span class="label">Календарь</span>
  </a>

  <a
    class="tab"
    class:tab--active={settingsActive}
    href={router.href('/settings')}
    aria-current={settingsActive ? 'page' : undefined}
  >
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
      />
      <path
        d="M19.4 13.5a7.7 7.7 0 0 0 0-3l1.8-1.4-1.9-3.2-2.1.9a7.6 7.6 0 0 0-2.6-1.5L14.3 3H9.7l-.3 2.3a7.6 7.6 0 0 0-2.6 1.5l-2.1-.9-1.9 3.2 1.8 1.4a7.7 7.7 0 0 0 0 3l-1.8 1.4 1.9 3.2 2.1-.9a7.6 7.6 0 0 0 2.6 1.5l.3 2.3h4.6l.3-2.3a7.6 7.6 0 0 0 2.6-1.5l2.1.9 1.9-3.2-1.8-1.4Z"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linejoin="round"
      />
    </svg>
    <span class="label">Настройки</span>
  </a>
</nav>

<style>
  .nav {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 20;
    display: grid;
    grid-template-columns: 1fr 1fr;
    padding-bottom: env(safe-area-inset-bottom);
    border-top: 1px solid var(--nav-border);
    background: var(--nav-bg);
  }

  .tab {
    display: flex;
    flex-direction: column;
    gap: 2px;
    align-items: center;
    justify-content: center;
    min-height: var(--nav-height);
    padding: var(--space-sm) var(--space-xs);
    color: var(--nav-text);
    text-decoration: none;
    -webkit-tap-highlight-color: transparent;
  }

  .tab--active {
    color: var(--nav-text-active);
  }

  .icon {
    width: 24px;
    height: 24px;
    flex: none;
  }

  .label {
    font-size: 0.75rem;
    line-height: 1.1;
    font-weight: 500;
  }

  .tab:focus-visible {
    outline: 2px solid var(--nav-text-active);
    outline-offset: -3px;
    border-radius: var(--radius-sm);
  }
</style>
