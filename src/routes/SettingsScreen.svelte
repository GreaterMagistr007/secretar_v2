<script lang="ts">
  /**
   * Экран «Настройки» (требование Т-19): единственная кнопка — «Выбор темы»,
   * она ведёт на экран выбора темы.
   */
  import { router } from '../lib/router.svelte';
</script>

<section class="screen">
  <h1 class="title">Настройки</h1>

  <a class="button" href={router.href('/settings/theme')}>Выбор темы</a>
</section>

<style>
  .screen {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    padding: var(--space-lg) var(--space-md);
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

  .button {
    display: block;
    padding: var(--space-md);
    border: 1px solid var(--button-primary-border);
    border-radius: var(--button-radius);
    background: var(--button-primary-bg);
    color: var(--button-primary-text);
    font-size: 1rem;
    font-weight: 600;
    text-align: center;
    text-decoration: none;
  }

  .button:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
</style>
