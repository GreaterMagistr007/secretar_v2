<!-- Главный экран первой поставки: только название приложения (требование Т-15). -->
<main class="screen">
  <h1 class="title">Секретарь</h1>
</main>

<style>
  .screen {
    display: flex;
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
</style>
