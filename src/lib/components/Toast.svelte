<script lang="ts">
  /**
   * Всплывающее сообщение (решение Р-35, docs/mechanic_toast.md). Монтируется один раз
   * в App.svelte и переживает смену экранов; показ — через showToast из toast.svelte.ts.
   *
   * Контейнер с aria-live всегда в DOM: экранный диктор озвучивает изменения только
   * внутри области, которая существовала до них.
   */
  import { toast } from '../toast.svelte';
  import { TOAST_TIMING } from '../toast';
</script>

<div class="region" aria-live="polite">
  {#if toast.current}
    <!-- Новый показ — новый элемент: анимация начинается заново и при повторе того же текста. -->
    {#key toast.current.id}
      <div
        class="toast toast--{toast.current.type}"
        role={toast.current.type === 'error' ? 'alert' : undefined}
        style:--toast-visible="{TOAST_TIMING[toast.current.type].visibleMs}ms"
        style:--toast-fade="{TOAST_TIMING[toast.current.type].fadeMs}ms"
      >
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          {#if toast.current.type === 'error'}
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" />
            <path d="M12 7.5v5.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <circle cx="12" cy="16.5" r="1.25" fill="currentColor" />
          {:else}
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              fill="none"
              stroke="currentColor"
              stroke-width="2.25"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          {/if}
        </svg>
        <span class="text">{toast.current.text}</span>
      </div>
    {/key}
  {/if}
</div>

<style>
  /*
   * Над нижним рядом кнопок экрана календаря: кнопка «+» стоит на
   * space-md + nav-height + safe-area от низа и высотой 56px — сообщение выше неё на space-sm.
   */
  .region {
    position: fixed;
    right: calc(var(--space-md) + env(safe-area-inset-right));
    bottom: calc(
      var(--space-md) + var(--nav-height) + env(safe-area-inset-bottom) + 56px + var(--space-sm)
    );
    left: calc(var(--space-md) + env(safe-area-inset-left));
    z-index: 60;
    display: flex;
    justify-content: center;
    pointer-events: none;
  }

  .toast {
    display: flex;
    max-width: 100%;
    align-items: flex-start;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md) var(--space-sm) var(--space-sm);
    border-left: 4px solid var(--toast-accent);
    border-radius: var(--radius-md);
    /* Поверх фона страницы: в части тем (v18 «Стекло») surface полупрозрачна, и без
       подложки текст сообщения ложился бы на текст экрана под ним. */
    background:
      linear-gradient(var(--color-surface), var(--color-surface)),
      var(--color-bg);
    box-shadow:
      var(--shadow-card),
      0 4px 16px rgb(0 0 0 / 0.16);
    color: var(--color-text);
    line-height: 1.4;
    /* Видно visibleMs (задержка), затем линейно гаснет за fadeMs — оба из TOAST_TIMING.
       Из DOM сообщение убирает таймер логики, а не конец анимации. */
    animation: toast-fade var(--toast-fade) linear var(--toast-visible) both;
  }

  /* Тип виден формой значка и цветом полосы; фон и текст общие. */
  .toast--success {
    --toast-accent: var(--color-primary);
  }

  .toast--error {
    --toast-accent: var(--color-weekend);
  }

  .icon {
    flex: none;
    width: 22px;
    height: 22px;
    /* Цветом текста, а не акцента: primary в части тем на surface почти не виден
       (v17 — 1,32:1); тип различим формой значка. */
    color: var(--color-text);
  }

  .text {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  @keyframes toast-fade {
    from {
      opacity: 1;
    }

    to {
      opacity: 0;
    }
  }

  /* Без затухания: видно всё время показа, затем снимается таймером. Перекрывает правило
     .toast: специфичность одинаковая, @media стоит ниже. */
  @media (prefers-reduced-motion: reduce) {
    .toast {
      animation: none;
    }
  }
</style>
