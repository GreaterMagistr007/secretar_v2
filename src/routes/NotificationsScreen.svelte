<script lang="ts">
  /**
   * Экран «Уведомления» (требование Т-30): переключатель «Показывать push уведомление с задачами».
   * По умолчанию включён (решение Р-32). Само уведомление есть только в Android-приложении
   * (требование Т-31); в браузере под переключателем пояснение об этом.
   */
  import type { PermissionState } from '@capacitor/core';
  import { router } from '../lib/router.svelte';
  import {
    checkNotificationPermission,
    isNotifierAvailable,
    loadNotificationsEnabled,
    refreshTaskNotification,
    requestNotificationPermission,
    saveNotificationsEnabled,
  } from '../lib/task-notifier';

  const available = isNotifierAvailable();

  let enabled = $state(loadNotificationsEnabled());

  /** Разрешение Android на уведомления; null — ещё не известно или это браузер. */
  let permission = $state<PermissionState | null>(null);

  /** Отказ в разрешении: пункт включён, а Android уведомления не покажет. */
  const blocked = $derived(
    enabled && (permission === 'denied' || permission === 'prompt-with-rationale'),
  );

  /** Перечитывает разрешение. Сбой моста оставляет прежнее значение — экран от него не зависит. */
  async function readPermission(): Promise<void> {
    try {
      permission = await checkNotificationPermission();
    } catch (error: unknown) {
      console.error('Не удалось узнать разрешение на уведомления', error);
    }
  }

  $effect(() => {
    void readPermission();
  });

  /**
   * Возвращение из системных настроек, где пользователь мог разрешить уведомления: разрешение
   * перечитывается, чтобы пояснение об отказе не висело зря. Само уведомление при возвращении
   * пересчитывает оболочка (startTaskNotifier в App).
   */
  function handleVisibilityChange(): void {
    if (available && document.visibilityState === 'visible') {
      void readPermission();
    }
  }

  async function toggle(event: Event & { currentTarget: HTMLInputElement }): Promise<void> {
    enabled = event.currentTarget.checked;
    saveNotificationsEnabled(enabled);

    if (enabled && available && permission !== 'granted') {
      try {
        permission = await requestNotificationPermission();
      } catch (error: unknown) {
        console.error('Не удалось запросить разрешение на уведомления', error);
      }
    }

    await refreshTaskNotification();
  }
</script>

<svelte:document onvisibilitychange={handleVisibilityChange} />

<section class="screen">
  <header class="header">
    <a class="back" href={router.href('/settings')} aria-label="Назад к настройкам">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M14 6l-6 6 6 6"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </a>
    <h1 class="title">Уведомления</h1>
  </header>

  <label class="option">
    <input type="checkbox" role="switch" checked={enabled} onchange={toggle} />
    <span>Показывать push уведомление с задачами</span>
  </label>

  {#if !available}
    <p class="hint">
      Пункт действует в Android-приложении: там, пока на сегодня есть незавершённые задачи, в шторке
      висит уведомление с их числом. В браузере уведомление не показывается.
    </p>
  {:else if blocked}
    <p class="hint">
      Android запретил приложению показывать уведомления. Чтобы включить: Настройки телефона →
      Приложения → Секретарь → Уведомления → разрешить.
    </p>
  {/if}
</section>

<style>
  .screen {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    padding: var(--space-md);
  }

  .header {
    display: flex;
    gap: var(--space-sm);
    align-items: center;
  }

  .back {
    display: inline-flex;
    width: 36px;
    height: 36px;
    flex: none;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text);
  }

  .back svg {
    width: 20px;
    height: 20px;
  }

  .title {
    margin: 0;
    color: var(--color-text);
    font-family: var(--font-family-heading);
    font-size: 1.3rem;
    font-weight: var(--font-weight-heading);
    letter-spacing: var(--letter-spacing-heading);
    line-height: 1.2;
  }

  .option {
    display: flex;
    gap: var(--space-sm);
    align-items: center;
    padding: var(--space-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text);
    cursor: pointer;
  }

  .option input {
    width: 22px;
    height: 22px;
    flex: none;
    margin: 0;
    accent-color: var(--color-primary);
  }

  .hint {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 0.9rem;
    line-height: 1.4;
  }
</style>
