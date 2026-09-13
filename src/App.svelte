<script lang="ts">
  // Базовый путь сборки: на GitHub Pages приложение живёт в подкаталоге,
  // поэтому ссылки строятся от него, а не от корня домена.
  const base = import.meta.env.BASE_URL;
</script>

<!-- Главный экран первой поставки: название приложения (требование Т-15)
     и ссылка на галерею вариантов вёрстки календаря (позиция каталога 22). -->
<main class="screen">
  <h1 class="title">Секретарь</h1>
  <a class="link" href="{base}gallery/">Демо шаблонов календаря</a>
</main>

<style>
  .screen {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    align-items: center;
    justify-content: center;
    min-height: 100svh;
    padding:
      calc(var(--space-lg) + env(safe-area-inset-top))
      calc(var(--space-lg) + env(safe-area-inset-right))
      calc(var(--space-lg) + env(safe-area-inset-bottom))
      calc(var(--space-lg) + env(safe-area-inset-left));
    box-sizing: border-box;
  }

  .title {
    margin: 0;
    max-width: 100%;
    font-size: var(--font-size-title);
    font-weight: 600;
    line-height: 1.2;
    letter-spacing: 0.01em;
    color: var(--color-text);
    text-align: center;
    overflow-wrap: anywhere;
  }

  .link {
    max-width: 100%;
    padding: var(--space-sm) var(--space-md);
    border: 1px solid var(--color-border);
    border-radius: 999px;
    background: var(--color-surface);
    color: var(--color-accent);
    font-size: 0.95rem;
    font-weight: 500;
    text-align: center;
    text-decoration: none;
    overflow-wrap: anywhere;
  }

  .link:hover,
  .link:focus-visible {
    border-color: var(--color-accent);
  }
</style>
