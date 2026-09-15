<script lang="ts">
  /**
   * Список задач выбранного дня (требование Т-27). Появляется под календарём только
   * когда день выбран — за это отвечает вызывающий экран.
   *
   * Текст задачи умещается в одну строку и обрезается многоточием; полный текст
   * открывается на экране задачи (требование Т-28).
   */
  import type { Task } from '../tasks/types';
  import { PRIORITY_LABELS } from '../tasks/types';
  import { PRIORITY_COLOR } from '../priority';
  import { formatLongDate } from '../date';
  import { router } from '../router.svelte';

  let {
    date,
    tasks,
    loading,
    error,
  }: {
    /** Выбранный день в виде YYYY-MM-DD. */
    date: string;
    tasks: Task[];
    loading: boolean;
    /** Сообщение об ошибке чтения задач; null, когда ошибки нет. */
    error: string | null;
  } = $props();
</script>

<section class="day-tasks" aria-label="Задачи выбранного дня">
  <h2 class="title">Задачи на {formatLongDate(date)}</h2>

  {#if loading}
    <p class="hint">Загрузка задач…</p>
  {:else if error !== null}
    <p class="hint hint--error" role="alert">{error}</p>
  {:else if tasks.length === 0}
    <p class="hint">На этот день задач нет.</p>
  {:else}
    <ul class="list">
      {#each tasks as task (task.id)}
        <li class="item">
          <a class="link" href={router.hrefTask(task.id)}>
            <span class="mark" style="background: {PRIORITY_COLOR[task.priority]}"></span>
            <span class="text">{task.text}</span>
            <span class="priority">{PRIORITY_LABELS[task.priority]} приоритет</span>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .day-tasks {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    min-width: 0;
  }

  .title {
    margin: 0;
    color: var(--color-text);
    font-family: var(--font-family-heading);
    font-size: 1.05rem;
    font-weight: var(--font-weight-heading);
    letter-spacing: var(--letter-spacing-heading);
    line-height: 1.2;
  }

  .hint {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 0.9rem;
  }

  .hint--error {
    color: var(--color-weekend);
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .item {
    min-width: 0;
  }

  .link {
    display: flex;
    gap: var(--space-sm);
    align-items: center;
    min-width: 0;
    padding: var(--space-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    box-shadow: var(--shadow-card);
    color: var(--color-text);
    text-decoration: none;
  }

  .link:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  .mark {
    width: 10px;
    height: 10px;
    flex: none;
    border-radius: var(--radius-pill);
  }

  .text {
    min-width: 0;
    flex: 1;
    overflow: hidden;
    font-size: 0.95rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Приоритет назван словами только для озвучки: на экране он показан цветной меткой. */
  .priority {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
