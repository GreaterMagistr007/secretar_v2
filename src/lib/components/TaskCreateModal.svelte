<script lang="ts">
  /**
   * Модалка создания задачи (требование Т-26): текст, дата и приоритет, все три поля обязательны.
   * Сохранение недоступно, пока хотя бы одно поле пустое; закрытие — по фону, по Esc и по кнопке
   * отмены, введённое при закрытии не сохраняется.
   *
   * Сохранением занимается вызывающий экран: модалка отдаёт ему данные через onSubmit и показывает
   * ошибку, если обещание отклонено. Так доступ к хранилищу остаётся в одном месте.
   */
  import { untrack } from 'svelte';
  import { DEFAULT_PRIORITY, PRIORITY_LABELS } from '../tasks/types';
  import type { NewTask, Priority } from '../tasks/types';
  import { PRIORITY_COLOR, PRIORITY_ORDER } from '../priority';
  import { isIsoDate } from '../date';

  let {
    initialDate,
    onSubmit,
    onClose,
  }: {
    /** Дата, подставленная в поле при открытии: выбранный в календаре день или сегодня. */
    initialDate: string;
    /** Сохранение задачи; отклонённое обещание показывается как ошибка сохранения. */
    onSubmit: (task: NewTask) => Promise<void>;
    onClose: () => void;
  } = $props();

  let text = $state('');
  // Дата берётся один раз при открытии: дальше полем распоряжается пользователь,
  // и внешние изменения не должны затирать введённое (untrack снимает связь с пропсом).
  let date = $state(untrack(() => initialDate));
  let priority = $state<Priority>(DEFAULT_PRIORITY);

  // Ошибка у поля показывается после первого ухода из него или после попытки сохранить,
  // чтобы пустая форма не встречала пользователя красным текстом.
  let textTouched = $state(false);
  let dateTouched = $state(false);
  let saving = $state(false);
  let saveError = $state<string | null>(null);

  let dialog = $state<HTMLDivElement | null>(null);
  let textField = $state<HTMLTextAreaElement | null>(null);

  // Фокус возвращается на кнопку, с которой модалку открыли.
  const openerElement = typeof document === 'undefined' ? null : document.activeElement;

  const textError = $derived(text.trim() === '' ? 'Введите текст задачи' : null);
  const dateError = $derived(
    date === '' ? 'Выберите дату' : isIsoDate(date) ? null : 'Дата указана неверно',
  );
  const canSave = $derived(textError === null && dateError === null && !saving);

  $effect(() => {
    textField?.focus();

    return () => {
      if (openerElement instanceof HTMLElement) {
        openerElement.focus();
      }
    };
  });

  /** Перечень элементов, по которым внутри модалки ходит Tab. */
  function focusableItems(): HTMLElement[] {
    if (dialog === null) {
      return [];
    }

    const items = dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled])',
    );

    return Array.from(items);
  }

  /** Замыкает Tab внутри модалки: фокус не уходит на экран под ней. */
  function trapTab(event: KeyboardEvent): void {
    const items = focusableItems();

    if (items.length === 0) {
      return;
    }

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || !(active instanceof HTMLElement))) {
      event.preventDefault();
      last.focus();

      return;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();

      return;
    }

    if (event.key === 'Tab') {
      trapTab(event);
    }
  }

  async function handleSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    textTouched = true;
    dateTouched = true;

    if (!canSave) {
      return;
    }

    saving = true;
    saveError = null;

    try {
      await onSubmit({ text: text.trim(), date, priority });
    } catch {
      saveError = 'Не удалось сохранить задачу. Попробуйте ещё раз.';
    } finally {
      saving = false;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="overlay">
  <button type="button" class="backdrop" aria-label="Закрыть форму задачи" onclick={onClose}
  ></button>

  <div
    class="modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="task-create-title"
    bind:this={dialog}
  >
    <h2 class="title" id="task-create-title">Новая задача</h2>

    <form class="form" onsubmit={handleSubmit} novalidate>
      <label class="field">
        <span class="field-label">Текст</span>
        <textarea
          class="input textarea"
          rows="4"
          bind:value={text}
          bind:this={textField}
          onblur={() => (textTouched = true)}
          aria-invalid={textTouched && textError !== null}
          aria-describedby={textTouched && textError !== null ? 'task-text-error' : undefined}
        ></textarea>
        {#if textTouched && textError !== null}
          <span class="error" id="task-text-error">{textError}</span>
        {/if}
      </label>

      <label class="field">
        <span class="field-label">Дата</span>
        <input
          class="input"
          type="date"
          bind:value={date}
          onblur={() => (dateTouched = true)}
          aria-invalid={dateTouched && dateError !== null}
          aria-describedby={dateTouched && dateError !== null ? 'task-date-error' : undefined}
        />
        {#if dateTouched && dateError !== null}
          <span class="error" id="task-date-error">{dateError}</span>
        {/if}
      </label>

      <fieldset class="field fieldset">
        <legend class="field-label">Приоритет</legend>
        <div class="priorities">
          {#each PRIORITY_ORDER as value (value)}
            <label class="chip" class:chip--active={priority === value}>
              <input
                class="radio"
                type="radio"
                name="task-priority"
                value={value}
                bind:group={priority}
              />
              <span class="dot" style="background: {PRIORITY_COLOR[value]}"></span>
              <span>{PRIORITY_LABELS[value]}</span>
            </label>
          {/each}
        </div>
      </fieldset>

      {#if saveError !== null}
        <p class="error error--form" role="alert">{saveError}</p>
      {/if}

      <div class="actions">
        <button type="button" class="button button--secondary" onclick={onClose}>Отмена</button>
        <button type="submit" class="button button--primary" disabled={!canSave}>
          {saving ? 'Сохранение…' : 'Сохранить'}
        </button>
      </div>
    </form>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: grid;
    place-items: center;
    padding: calc(var(--space-md) + env(safe-area-inset-top)) var(--space-md)
      calc(var(--space-md) + env(safe-area-inset-bottom));
  }

  .backdrop {
    position: absolute;
    inset: 0;
    border: none;
    padding: 0;
    background: color-mix(in srgb, var(--color-text) 45%, transparent);
    cursor: pointer;
  }

  .modal {
    position: relative;
    width: min(100%, 360px);
    max-height: 100%;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    padding: var(--space-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-card);
  }

  .title {
    margin: 0;
    color: var(--color-text);
    font-family: var(--font-family-heading);
    font-size: 1.15rem;
    font-weight: var(--font-weight-heading);
    letter-spacing: var(--letter-spacing-heading);
    line-height: 1.2;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    min-width: 0;
  }

  .fieldset {
    margin: 0;
    padding: 0;
    border: none;
  }

  .field-label {
    padding: 0;
    color: var(--color-text-muted);
    font-size: 0.8rem;
  }

  .input {
    width: 100%;
    min-width: 0;
    padding: var(--space-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface-muted);
    color: var(--color-text);
    font-size: 1rem;
    line-height: 1.4;
  }

  .textarea {
    resize: vertical;
  }

  .input:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 1px;
  }

  .input[aria-invalid='true'] {
    border-color: var(--color-weekend);
  }

  .error {
    color: var(--color-weekend);
    font-size: 0.8rem;
    line-height: 1.3;
  }

  .error--form {
    margin: 0;
  }

  .priorities {
    display: flex;
    gap: var(--space-xs);
    flex-wrap: wrap;
  }

  .chip {
    display: inline-flex;
    gap: var(--space-xs);
    align-items: center;
    padding: var(--space-xs) var(--space-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-pill);
    background: var(--color-surface-muted);
    color: var(--color-text);
    font-size: 0.9rem;
    cursor: pointer;
  }

  .chip--active {
    border-color: var(--color-primary);
    background: var(--color-selected);
    font-weight: 600;
  }

  /* Кружок радиокнопки не нужен: выбранный приоритет виден по подсветке чипа,
     но сам input остаётся в разметке — с ним работают клавиатура и озвучка. */
  .radio {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    border: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .chip:has(.radio:focus-visible) {
    outline: 2px solid var(--color-primary);
    outline-offset: 1px;
  }

  .dot {
    width: 10px;
    height: 10px;
    flex: none;
    border-radius: var(--radius-pill);
  }

  .actions {
    display: flex;
    gap: var(--space-sm);
    justify-content: flex-end;
  }

  .button {
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--button-radius);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
  }

  .button--primary {
    border: 1px solid var(--button-primary-border);
    background: var(--button-primary-bg);
    color: var(--button-primary-text);
  }

  .button--secondary {
    border: 1px solid var(--button-secondary-border);
    background: var(--button-secondary-bg);
    color: var(--button-secondary-text);
  }

  .button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .button:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
</style>
