<script lang="ts">
  /**
   * Полноэкранный просмотр задачи (требование Т-28): весь текст целиком, дата и приоритет.
   * Отдельный маршрут #/task/<id>, поэтому кнопка «назад» в браузере возвращает к календарю.
   */
  import type { Task } from '../lib/tasks/types';
  import { PRIORITY_LABELS } from '../lib/tasks/types';
  import { PRIORITY_COLOR } from '../lib/priority';
  import { formatLongDate } from '../lib/date';
  import { taskRepository } from '../lib/task-repository';
  import { router } from '../lib/router.svelte';

  let {
    id,
  }: {
    /** Идентификатор задачи из адреса; null, если в адресе его нет. */
    id: string | null;
  } = $props();

  let task = $state<Task | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  $effect(() => {
    const requested = id;
    let cancelled = false;

    if (requested === null) {
      task = null;
      loading = false;
      error = null;

      return;
    }

    loading = true;
    error = null;

    taskRepository
      .get(requested)
      .then((found) => {
        if (cancelled) {
          return;
        }

        task = found;
        loading = false;
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        task = null;
        error = 'Не удалось открыть задачу.';
        loading = false;
      });

    return () => {
      cancelled = true;
    };
  });

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      router.go('/calendar');
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<section class="screen">
  <header class="header">
    <h1 class="title">Задача</h1>
    <a class="close" href={router.href('/calendar')} aria-label="Закрыть задачу и вернуться к календарю">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M6 6l12 12M18 6L6 18"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    </a>
  </header>

  {#if loading}
    <p class="hint">Загрузка задачи…</p>
  {:else if error !== null}
    <p class="hint hint--error" role="alert">{error}</p>
  {:else if task === null}
    <p class="hint">Задача не найдена: возможно, она была удалена.</p>
  {:else}
    <dl class="meta">
      <div class="meta-row">
        <dt class="meta-label">Дата</dt>
        <dd class="meta-value">{formatLongDate(task.date)}</dd>
      </div>
      <div class="meta-row">
        <dt class="meta-label">Приоритет</dt>
        <dd class="meta-value">
          <span class="mark" style="background: {PRIORITY_COLOR[task.priority]}"></span>
          {PRIORITY_LABELS[task.priority]}
        </dd>
      </div>
    </dl>

    <p class="text">{task.text}</p>
  {/if}
</section>

<style>
  .screen {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    min-height: 100%;
    padding: var(--space-md);
  }

  .header {
    display: flex;
    gap: var(--space-sm);
    align-items: center;
    justify-content: space-between;
  }

  .title {
    margin: 0;
    color: var(--color-text);
    font-family: var(--font-family-heading);
    font-size: 1.4rem;
    font-weight: var(--font-weight-heading);
    letter-spacing: var(--letter-spacing-heading);
    line-height: 1.2;
  }

  .close {
    display: inline-flex;
    width: 40px;
    height: 40px;
    flex: none;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-pill);
    background: var(--color-surface);
    color: var(--color-text);
    text-decoration: none;
  }

  .close svg {
    width: 22px;
    height: 22px;
  }

  .close:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  .hint {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 0.95rem;
  }

  .hint--error {
    color: var(--color-weekend);
  }

  .meta {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    margin: 0;
  }

  .meta-row {
    display: flex;
    gap: var(--space-sm);
    align-items: center;
  }

  .meta-label {
    color: var(--color-text-muted);
    font-size: 0.85rem;
  }

  .meta-value {
    display: inline-flex;
    gap: var(--space-xs);
    align-items: center;
    margin: 0;
    color: var(--color-text);
    font-size: 0.95rem;
  }

  .mark {
    width: 10px;
    height: 10px;
    flex: none;
    border-radius: var(--radius-pill);
  }

  /*
   * Полный текст задачи: переносы строк сохраняются, длинные слова и ссылки переносятся,
   * длинный текст прокручивается вместе со страницей — горизонтальной прокрутки нет.
   */
  .text {
    margin: 0;
    padding: var(--space-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-card);
    color: var(--color-text);
    font-size: 1rem;
    line-height: 1.5;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }
</style>
