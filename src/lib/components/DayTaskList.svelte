<script lang="ts">
  /**
   * Список задач выбранного дня (требование Т-27). Появляется под календарём только
   * когда день выбран — за это отвечает вызывающий экран.
   *
   * На вход приходят вхождения повторений этого дня, а не задачи: у регулярной задачи
   * отметка выполнения принадлежит дню (требование Т-5, решение Р-16), поэтому флажок
   * работает с парой «задача + день». Сохранением отметки занимается вызывающий экран.
   *
   * Текст задачи умещается в одну строку и обрезается многоточием; полный текст
   * открывается на экране задачи (требование Т-28).
   */
  import type { Occurrence } from '../tasks/types';
  import { PRIORITY_LABELS } from '../tasks/types';
  import { PRIORITY_COLOR } from '../priority';
  import { formatLongDate } from '../date';
  import { router } from '../router.svelte';

  let {
    date,
    occurrences,
    loading,
    error,
    onToggle,
  }: {
    /** Выбранный день в виде YYYY-MM-DD. */
    date: string;
    occurrences: Occurrence[];
    loading: boolean;
    /** Сообщение об ошибке чтения задач; null, когда ошибки нет. */
    error: string | null;
    /** Переключение отметки выполнения одного вхождения. */
    onToggle: (occurrence: Occurrence, done: boolean) => void;
  } = $props();
</script>

<section class="day-tasks" aria-label="Задачи выбранного дня">
  <h2 class="title">Задачи на {formatLongDate(date)}</h2>

  <!-- «Загрузка» показывается только когда показывать больше нечего. Иначе перечитывание после
       отметки уничтожало бы список целиком: фокус уходил с флажка в body (переключение пробелом
       со второго раза перестаёт работать), а строки мигали. Ключ #each от этого не спасает —
       пропадает сам <ul>. -->
  {#if loading && occurrences.length === 0}
    <p class="hint">Загрузка задач…</p>
  {:else if error !== null}
    <p class="hint hint--error" role="alert">{error}</p>
  {:else if occurrences.length === 0}
    <p class="hint">На этот день задач нет.</p>
  {:else}
    <ul class="list">
      {#each occurrences as occurrence (`${occurrence.task.id}|${occurrence.date}`)}
        <li class="item">
          <input
            class="check"
            type="checkbox"
            checked={occurrence.done}
            aria-label={occurrence.done ? 'Снять отметку выполнения' : 'Отметить выполненной'}
            onchange={(event) => {
              // Браузер уже переключил флажок сам; возвращаем его к данным. Новое значение
              // придёт перечитыванием списка, и только если запись удалась: иначе на экране
              // осталась бы отметка, которой нет в базе. Своим присваиванием Svelte это
              // не исправит — оно пропускается, когда значение выражения не изменилось.
              event.currentTarget.checked = occurrence.done;
              onToggle(occurrence, !occurrence.done);
            }}
          />
          <a class="link" href={router.hrefTask(occurrence.task.id)}>
            <span
              class="mark"
              style="background: {PRIORITY_COLOR[occurrence.task.priority]}"
            ></span>
            <span class="text" class:text--done={occurrence.done}>{occurrence.task.text}</span>
            <span class="priority">{PRIORITY_LABELS[occurrence.task.priority]} приоритет</span>
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

  /* Оформление карточки лежит на элементе списка, а не на ссылке: рядом со ссылкой
     стоит флажок, и обводка карточки обязана охватывать оба. */
  .item {
    display: flex;
    gap: var(--space-sm);
    align-items: center;
    min-width: 0;
    padding: var(--space-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    box-shadow: var(--shadow-card);
  }

  .check {
    width: 18px;
    height: 18px;
    flex: none;
    accent-color: var(--color-primary);
  }

  .link {
    display: flex;
    gap: var(--space-sm);
    align-items: center;
    min-width: 0;
    flex: 1;
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

  .text--done {
    color: var(--color-text-muted);
    text-decoration: line-through;
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
