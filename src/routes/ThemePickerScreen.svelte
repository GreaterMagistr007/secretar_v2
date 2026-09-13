<script lang="ts">
  /**
   * Экран выбора темы (требование Т-20): сетка превью всех вариантов.
   * Клик по карточке применяет тему ко всему приложению сразу, а не открывает макет.
   * Превью — исходный макет галереи в iframe, уменьшенный transform: scale.
   */
  import { themes } from '../lib/themes/index';
  import type { Theme } from '../lib/themes/types';
  import { router } from '../lib/router.svelte';

  let {
    currentThemeId,
    onSelect,
  }: {
    /** Идентификатор применённой темы; null, пока владелец ничего не выбрал. */
    currentThemeId: string | null;
    onSelect: (theme: Theme) => void;
  } = $props();

  const base = import.meta.env.BASE_URL;
</script>

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
    <h1 class="title">Выбор темы</h1>
  </header>

  {#if themes.length === 0}
    <p class="empty">Темы ещё не подготовлены.</p>
  {:else}
    <ul class="cards">
      {#each themes as theme (theme.id)}
        <li class="card" class:card--selected={theme.id === currentThemeId}>
          <div class="preview">
            <iframe
              class="frame"
              src="{base}gallery/{theme.id}.html"
              title="Превью темы «{theme.name}»"
              loading="lazy"
              tabindex="-1"
              aria-hidden="true"
            ></iframe>

            {#if theme.id === currentThemeId}
              <!-- Зелёная галочка выбранной темы: цвет литералом намеренно —
                   отметка должна читаться одинаково в любой теме (исключение из правила токенов). -->
              <span class="check" aria-hidden="true">
                <svg viewBox="0 0 48 48" focusable="false">
                  <circle cx="24" cy="24" r="22" fill="#22c55e" />
                  <path
                    d="M14 24.5l7 7 13-15"
                    fill="none"
                    stroke="#ffffff"
                    stroke-width="5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
            {/if}
          </div>

          <span class="name"><span class="num">{theme.id.slice(1)}</span> {theme.name}</span>

          <button
            type="button"
            class="hit"
            aria-label="Применить тему «{theme.name}»"
            aria-pressed={theme.id === currentThemeId}
            onclick={() => onSelect(theme)}
          ></button>
        </li>
      {/each}
    </ul>
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

  .empty {
    margin: 0;
    color: var(--color-text-muted);
  }

  .cards {
    display: grid;
    /* Колонки резиновые: карточка занимает доступную ширину, а превью подстраивается
       под неё через контейнерные единицы. Раньше ширина была фиксированной, и на узком
       телефоне оставалась одна колонка с пустой половиной экрана. */
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: var(--space-sm);
    margin: 0;
    padding: 0;
    list-style: none;

    /* Размеры макета галереи: задают пропорции превью и запасной масштаб. */
    --frame-width: 390px;
    --frame-height: 650px;
    --preview-scale: 0.374;
  }

  @media (min-width: 520px) {
    .cards {
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: var(--space-md);
    }
  }

  .card {
    position: relative;
    display: flex;
    overflow: hidden;
    flex-direction: column;
    gap: var(--space-xs);
    padding: var(--space-xs);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-card);
  }

  .card--selected {
    border-color: var(--color-primary);
  }

  .preview {
    position: relative;
    width: 100%;
    /* Пропорции макета телефона: высота считается от фактической ширины карточки. */
    aspect-ratio: var(--frame-width) / var(--frame-height);
    overflow: hidden;
    border-radius: var(--radius-md);
    background: var(--color-surface-muted);
    /* Единицы cqw ниже считаются от ширины этого контейнера. */
    container-type: inline-size;
  }

  .frame {
    position: absolute;
    top: 0;
    left: 0;
    width: var(--frame-width);
    height: var(--frame-height);
    border: 0;
    /* Масштаб привязан к фактической ширине превью, а не к заранее посчитанному числу:
       при любой ширине карточки макет вписывается ровно в её границы. */
    /* Делим на длину, а не на число: scale() принимает безразмерный множитель,
       и только деление cqw на px даёт его. */
    transform: scale(calc(100cqw / var(--frame-width)));
    transform-origin: top left;
    /* Превью не перехватывает касания: кликом занимается кнопка .hit поверх карточки. */
    pointer-events: none;
  }

  /* Запасной путь для браузеров без контейнерных запросов: фиксированный масштаб. */
  @supports not (container-type: inline-size) {
    .frame {
      transform: scale(var(--preview-scale));
    }
  }

  .check {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    /* Зелёный задан литералом намеренно — см. комментарий в разметке. */
    background: color-mix(in srgb, #22c55e 20%, transparent);
  }

  .check svg {
    width: 76px;
    height: 76px;
  }

  .name {
    color: var(--color-text);
    font-size: 0.8rem;
    line-height: 1.2;
    text-align: center;
    overflow-wrap: anywhere;
  }

  /* Номер варианта совпадает с номером макета в галерее и различает одноимённые темы:
     «Полночь» есть и под номером 05, и под номером 21. */
  .num {
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    opacity: 0.65;
  }

  .hit {
    position: absolute;
    inset: 0;
    border: none;
    border-radius: var(--radius-lg);
    background: transparent;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .hit:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
</style>
