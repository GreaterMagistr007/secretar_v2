<script lang="ts">
  /**
   * Экран «Голос» (решение Р-36): выбор модели для голосового управления и её докачка с компьютера
   * в локальной сети. Скачивает Android-приложение (мост model-downloader.ts); в браузере экран
   * показывает только выбор и пояснение. Прогресс опрашивается раз в секунду, пока экран открыт;
   * сама загрузка идёт и без экрана — её ведёт система.
   *
   * Раздел «Журнал» (решение Р-37): сколько нажатий голосовой кнопки записано, выгрузка архива
   * журнала с записями звука через меню «Поделиться» и очистка.
   *
   * «Устройство для модели» (только в APK): видеоускоритель или процессор для текстовой части
   * модели; смена перезагружает модель в фоне.
   */
  import { untrack } from 'svelte';
  import { router } from '../lib/router.svelte';
  import { showToast } from '../lib/toast.svelte';
  import {
    cancelModelDownload,
    isModelDownloaderAvailable,
    readModelState,
    removeModel,
    startModelDownload,
  } from '../lib/model-downloader';
  import type { ModelState } from '../lib/model-downloader';
  import {
    VOICE_DEVICES,
    VOICE_MODELS,
    downloadPercent,
    formatGigabytes,
    formatMegabytes,
    loadServerAddress,
    loadVoiceDevice,
    loadVoiceModel,
    modelFileUrl,
    normalizeServerAddress,
    saveServerAddress,
    saveVoiceDevice,
    saveVoiceModel,
  } from '../lib/voice-models';
  import type { VoiceDevice, VoiceModel } from '../lib/voice-models';
  import { clearVoiceLog, loadVoiceEngine, shareVoiceLog, voiceLogInfo } from '../lib/voice';

  /** Период опроса прогресса, мс. */
  const POLL_MS = 1000;

  const available = isModelDownloaderAvailable();

  let model = $state<VoiceModel>(loadVoiceModel());
  let address = $state(loadServerAddress());
  let device = $state<VoiceDevice>(loadVoiceDevice());
  /** Состояние файла выбранной модели; null — ещё не прочитано или это браузер. */
  let modelState = $state<ModelState | null>(null);
  /** Идёт команда (скачать, отменить, удалить): кнопки недоступны, чтобы не нажать дважды. */
  let busy = $state(false);
  /** Текст отказа последнего чтения состояния; null — прочитано. */
  let readError = $state<string | null>(null);

  /** Сколько нажатий в журнале; null — ещё не прочитано или это браузер. */
  let logEntries = $state<number | null>(null);
  /**
   * Размер каталога журнала в байтах. Кнопки блокируются по нему, а не по числу нажатий:
   * запись о загрузке модели (с ошибкой GPU или CPU) лежит в журнале и до первого нажатия.
   */
  let logBytes = $state(0);

  const downloading = $derived(modelState?.state === 'downloading');

  const percent = $derived(
    modelState?.state === 'downloading' ? downloadPercent(modelState.downloaded, modelState.total) : null,
  );

  /**
   * Принимает новое состояние. Ошибку нативная часть отдаёт один раз и уже убрала загрузку,
   * поэтому она уходит во всплывающее сообщение, а экран показывает «не скачана». Переход
   * «качается → скачана» сообщается успехом.
   */
  function apply(next: ModelState | null): void {
    if (next?.state === 'error') {
      showToast('error', next.reason);
      modelState = { state: 'absent' };

      return;
    }

    if (modelState?.state === 'downloading' && next?.state === 'downloaded') {
      showToast('success', `${model.title} скачана`);
    }

    modelState = next;
  }

  /**
   * Перечитывает состояние. Отказ, пока состояния нет, экран показывает текстом с кнопкой
   * «Повторить»; при известном состоянии — всплывающим сообщением, но только первый: опрос
   * раз в секунду иначе повторял бы его каждую секунду.
   */
  async function refresh(): Promise<void> {
    try {
      apply(await readModelState(model));
      readError = null;
    } catch (error: unknown) {
      const text = `Не удалось узнать состояние модели: ${errorText(error)}`;

      if (readError === null && modelState !== null) {
        showToast('error', text);
      }

      readError = text;
    }
  }

  function errorText(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  // Первое чтение при открытии экрана. untrack: refresh читает model, и без него эффект
  // перезапускался бы при смене модели вдобавок к вызову из selectModel.
  $effect(() => {
    untrack(() => void refresh());

    // Не через run: чтение числа записей не должно снимать блокировку идущей команды.
    if (available) {
      refreshLog().catch((error: unknown) =>
        showToast('error', `Не удалось прочитать журнал: ${errorText(error)}`),
      );
    }
  });

  async function refreshLog(): Promise<void> {
    const info = await voiceLogInfo();

    logEntries = info.entries;
    logBytes = info.bytes;
  }

  // Опрос только пока модель качается; конец загрузки снимает таймер.
  $effect(() => {
    if (!downloading) {
      return;
    }

    const timer = setInterval(() => {
      if (!busy) {
        void refresh();
      }
    }, POLL_MS);

    return () => clearInterval(timer);
  });

  /** Возвращение в приложение: за это время загрузка могла закончиться. */
  function handleVisibilityChange(): void {
    if (available && document.visibilityState === 'visible') {
      void refresh();
    }
  }

  function selectModel(next: VoiceModel): void {
    model = next;
    saveVoiceModel(next);
    modelState = null;
    void refresh();
  }

  /**
   * Смена устройства для модели: выбор запоминается, модель перезагружается в фоне (базовый
   * промпт плагин помнит с прошлой загрузки). Не скачана — только запоминается.
   */
  function selectDevice(next: (typeof VOICE_DEVICES)[number]): Promise<void> {
    device = next.id;
    saveVoiceDevice(next.id);

    return run(async () => {
      if ((await loadVoiceEngine(model, next.id)).state === 'loading') {
        showToast('success', `Модель перезагружается: ${next.title}`);
      }
    });
  }

  /** Выполняет команду с блокировкой кнопок; отказ нативной части — во всплывающее сообщение. */
  async function run(action: () => Promise<void>): Promise<void> {
    busy = true;

    try {
      await action();
    } catch (error: unknown) {
      showToast('error', errorText(error));
    } finally {
      busy = false;
    }
  }

  function download(): Promise<void> {
    const server = normalizeServerAddress(address);

    if (server === null) {
      showToast('error', address.trim() === '' ? 'Введите адрес сервера' : `Неверный адрес сервера: ${address}`);

      return Promise.resolve();
    }

    saveServerAddress(address);

    return run(async () => {
      apply(await startModelDownload(model, modelFileUrl(server, model)));
    });
  }

  function cancel(): Promise<void> {
    return run(async () => {
      await cancelModelDownload();
      await refresh();

      // Загрузка успела завершиться до отмены: модель осталась, об этом уже сообщил apply.
      if (modelState?.state !== 'downloaded') {
        showToast('success', 'Загрузка отменена');
      }
    });
  }

  function shareLog(): Promise<void> {
    return run(async () => {
      await shareVoiceLog();
    });
  }

  function clearLog(): Promise<void> {
    return run(async () => {
      await clearVoiceLog();
      await refreshLog();
      showToast('success', 'Журнал очищен');
    });
  }

  function remove(): Promise<void> {
    return run(async () => {
      await removeModel(model);
      await refresh();
      showToast('success', `${model.title} удалена`);
    });
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
    <h1 class="title">Голос</h1>
  </header>

  <fieldset class="group">
    <legend class="label">Модель</legend>
    {#each VOICE_MODELS as item (item.id)}
      <label class="option">
        <input
          type="radio"
          name="voice-model"
          checked={item.id === model.id}
          disabled={busy}
          onchange={() => selectModel(item)}
        />
        <span class="option-text">{item.title}</span>
        <span class="muted">{formatGigabytes(item.size)}</span>
      </label>
    {/each}
  </fieldset>

  <label class="field">
    <span class="label">Адрес сервера раздачи</span>
    <input
      class="input"
      type="text"
      inputmode="url"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      placeholder="192.168.1.10:8088"
      bind:value={address}
      onchange={() => saveServerAddress(address)}
    />
    <span class="muted">Компьютер в той же сети, где запущена раздача моделей.</span>
  </label>

  {#if !available}
    <p class="muted">
      Модель скачивается и работает только в Android-приложении. В браузере докачки нет.
    </p>
  {:else if modelState === null && readError !== null}
    <p class="status">{readError}</p>
    <button type="button" class="button" disabled={busy} onclick={() => run(refresh)}>Повторить</button>
  {:else if modelState?.state === 'absent'}
    <p class="status">Не скачана</p>
    <button type="button" class="button" disabled={busy} onclick={download}>Скачать</button>
  {:else if modelState?.state === 'downloading'}
    <div class="status">
      {#if modelState.total === null}
        <p>Скачивается: {formatMegabytes(modelState.downloaded)}</p>
      {:else}
        <p>
          Скачивается: {formatMegabytes(modelState.downloaded)} из {formatMegabytes(modelState.total)}
          ({percent} %)
        </p>
        <progress class="progress" max={modelState.total} value={modelState.downloaded}></progress>
      {/if}
      {#if modelState.paused !== null}
        <p class="muted">{modelState.paused}</p>
      {/if}
    </div>
    <button type="button" class="button button--secondary" disabled={busy} onclick={cancel}>Отменить</button>
  {:else if modelState?.state === 'downloaded'}
    <p class="status">Скачана, {formatGigabytes(modelState.size)}</p>
    <button type="button" class="button button--secondary" disabled={busy} onclick={remove}>
      Удалить модель
    </button>
  {/if}

  {#if available}
    <fieldset class="group">
      <legend class="label">Устройство для модели</legend>
      {#each VOICE_DEVICES as item (item.id)}
        <label class="option">
          <input
            type="radio"
            name="voice-device"
            checked={item.id === device}
            disabled={busy}
            onchange={() => selectDevice(item)}
          />
          <span class="option-text">{item.title}</span>
        </label>
      {/each}
    </fieldset>

    <section class="group" aria-labelledby="voice-log-title">
      <h2 class="label" id="voice-log-title">Журнал</h2>
      <p class="status">
        {logEntries === null ? 'Записей: …' : `Записей: ${logEntries}`}
      </p>
      <span class="muted">
        Каждое нажатие голосовой кнопки: запись звука, что отдано модели и что она ответила.
        Хранятся последние 30.
      </span>
      <button type="button" class="button" disabled={busy || logBytes === 0} onclick={shareLog}>
        Поделиться журналом
      </button>
      <button
        type="button"
        class="button button--secondary"
        disabled={busy || logBytes === 0}
        onclick={clearLog}
      >
        Очистить журнал
      </button>
    </section>
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

  .group {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    margin: 0;
    padding: 0;
    border: none;
  }

  .label {
    margin: 0;
    padding: 0;
    font-weight: normal;
    color: var(--color-text-muted);
    font-size: 0.8rem;
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

  .option-text {
    flex: 1;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
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

  .input:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 1px;
  }

  .muted {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .status {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    margin: 0;
    color: var(--color-text);
  }

  .status p {
    margin: 0;
  }

  .progress {
    width: 100%;
    height: 8px;
    accent-color: var(--color-primary);
  }

  .button {
    display: block;
    padding: var(--space-md);
    border: 1px solid var(--button-primary-border);
    border-radius: var(--button-radius);
    background: var(--button-primary-bg);
    color: var(--button-primary-text);
    font: inherit;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
  }

  .button--secondary {
    border-color: var(--button-secondary-border);
    background: var(--button-secondary-bg);
    color: var(--button-secondary-text);
  }

  .button:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .button:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
</style>
