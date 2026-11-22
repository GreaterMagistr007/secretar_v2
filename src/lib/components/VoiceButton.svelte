<script module lang="ts">
  /**
   * Идёт ли нажатие — на уровне модуля, а не экземпляра: кнопка размонтируется при уходе с экрана
   * календаря, а начатое нажатие продолжает обработку. Без общего флага новый экземпляр пустил бы
   * второе нажатие параллельно первому, и ротация журнала первого удалила бы WAV второго.
   */
  let pressing = false;
</script>

<script lang="ts">
  /**
   * Голосовая кнопка (решения Р-34, Р-37): удерживать, пока говоришь. Запись — нативная, звук
   * сразу в модель на телефоне, модель вызывает инструмент add_task, задача сохраняется тем же
   * путём, что из формы (onCreate), итог — всплывающее сообщение. Каждое нажатие целиком
   * пишется в журнал (docs/mechanic_voice.md, раздел «Голосовая кнопка»).
   *
   * Показывается только в Android-приложении.
   */
  import { showToast } from '../toast.svelte';
  import type { NewTask } from '../tasks/types';
  import { loadVoiceDevice, loadVoiceModel } from '../voice-models';
  import {
    ADD_TASK_TOOL,
    MAX_RECORD_MS,
    MIN_PEAK,
    MIN_PRESS_MS,
    RECORD_TAIL_MS,
    USER_TEXT,
    VOICE_MESSAGES,
    buildBasePrompt,
    formatTimestamp,
    interpretReply,
    nextPromptDayChange,
    promptDayKey,
    recordTailMs,
    recordingProblem,
  } from '../voice-command';
  import {
    ensureMicrophone,
    isVoiceAvailable,
    loadVoiceEngine,
    runModel,
    startRecording,
    stopRecording,
    writeVoiceLog,
  } from '../voice';
  import type { BasePrompt, EngineStatus } from '../voice';

  interface Props {
    /** Сохранение задачи — то же, что у формы создания на экране календаря. */
    onCreate: (task: NewTask) => Promise<void>;
  }

  let { onCreate }: Props = $props();

  /** Период опроса, пока модель загружается, мс. */
  const POLL_MS = 1000;

  /** Запас после границы дня промпта, чтобы часы уже показывали новый день, мс. */
  const DAY_CHANGE_DELAY_MS = 1000;

  const available = isVoiceAvailable();

  /** Ошибка, текст которой показывается пользователю как есть. */
  class VoiceError extends Error {}

  let engine = $state<EngineStatus | null>(null);
  /** Ход нажатия: покой → подготовка → запись → обработка → покой. */
  let phase = $state<'idle' | 'starting' | 'recording' | 'processing'>('idle');
  /** Палец на кнопке. Не реактивное: читается только кодом нажатия. */
  let held = false;
  /**
   * Кнопку отпустили пальцем или клавишей — запись продолжается хвостом. Сворачивание приложения
   * и предел записи — без хвоста. Не реактивное.
   */
  let withTail = false;
  /** Будит ожидание отпускания. */
  let release: (() => void) | null = null;

  const loading = $derived(engine?.state === 'loading');
  const off = $derived(engine !== null && (engine.state === 'absent' || engine.state === 'error'));

  const label = $derived(
    phase === 'recording'
      ? 'Идёт запись: отпустите, когда закончите'
      : phase === 'processing'
        ? 'Обработка команды'
        : loading
          ? 'Модель загружается'
          : off
            ? 'Голосовая команда недоступна'
            : 'Голосовая команда: удерживайте и говорите',
  );

  /** Базовый промпт дня на момент `now`: его плагин читает один раз и копирует на нажатие. */
  function basePrompt(now: Date, timeZone: string): BasePrompt {
    return { systemPrompt: buildBasePrompt(now, timeZone), tool: JSON.stringify(ADD_TASK_TOOL) };
  }

  /** Загрузка модели и, если день промпта сменился, перечитывание базы — оба в фоне. */
  async function refreshEngine(): Promise<void> {
    try {
      engine = await loadVoiceEngine(
        loadVoiceModel(),
        loadVoiceDevice(),
        basePrompt(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone),
      );
    } catch (error: unknown) {
      engine = { state: 'error', backend: null, mtp: null, loadMs: 0, error: errorText(error) };
    }
  }

  // Загрузка модели при появлении экрана календаря (он же стартовый) и опрос, пока она идёт.
  $effect(() => {
    if (available) {
      void refreshEngine();
    }
  });

  $effect(() => {
    if (!loading) {
      return;
    }

    const timer = setInterval(() => void refreshEngine(), POLL_MS);

    return () => clearInterval(timer);
  });

  // Базовый промпт меняется на границах дня промпта (00:00 и 04:00): к границе — перечитать его
  // заранее, а не на нажатии. Если таймер в фоне не сработал, это сделают возвращение
  // в приложение (handleVisibilityChange) или само нажатие.
  $effect(() => {
    if (!available) {
      return;
    }

    let timer: ReturnType<typeof setTimeout>;
    const schedule = (): void => {
      const delay = nextPromptDayChange(new Date()).getTime() - Date.now() + DAY_CHANGE_DELAY_MS;

      timer = setTimeout(() => {
        void refreshEngine();
        schedule();
      }, delay);
    };

    schedule();

    return () => clearTimeout(timer);
  });

  function errorText(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /** Ждёт отпускания кнопки, но не дольше предела записи. */
  function waitRelease(): Promise<void> {
    return new Promise((resolve) => {
      if (!held) {
        resolve();

        return;
      }

      const timer = setTimeout(done, MAX_RECORD_MS);

      function done(): void {
        clearTimeout(timer);
        release = null;
        resolve();
      }

      release = done;
    });
  }

  /** Одно нажатие целиком; запись в журнал — всегда, чем бы ни кончилось. */
  async function press(): Promise<void> {
    const pressedAt = new Date();
    const started = performance.now();
    const steps: Record<string, number> = {};
    let mark = started;
    const step = (name: string): void => {
      const now = performance.now();

      steps[name] = Math.round(now - mark);
      mark = now;
    };
    const model = loadVoiceModel();
    const device = loadVoiceDevice();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const base = basePrompt(pressedAt, timeZone);
    // kind — первым полем: по нему нативная часть считает нажатия при ротации журнала.
    const entry: { kind: 'press' } & Record<string, unknown> = {
      kind: 'press',
      at: formatTimestamp(pressedAt),
      timeZone,
      model: model.fileName,
      device,
      thresholds: { minPressMs: MIN_PRESS_MS, minPeak: MIN_PEAK, recordTailMs: RECORD_TAIL_MS },
      steps,
    };
    let recording = false;

    pressing = true;
    phase = 'starting';

    try {
      engine = await loadVoiceEngine(model, device, base);
      entry.engine = engine;
      step('engineMs');

      // Состояние error нативная часть не отдаёт: load() после ошибки сразу повторяет загрузку
      // и отвечает loading — нажатие дождётся её в очереди, итог виден в reply.waitMs.
      if (engine.state === 'absent') {
        throw new VoiceError(VOICE_MESSAGES.modelMissing);
      }

      const permission = await ensureMicrophone();

      entry.permission = permission;
      step('permissionMs');

      if (permission === 'denied') {
        throw new VoiceError(VOICE_MESSAGES.microphoneDenied);
      }

      if (permission === 'just-granted') {
        // Нажатие ушло на системный диалог: говорить — следующим нажатием.
        entry.toast = { type: 'success', text: VOICE_MESSAGES.microphoneGranted };
        showToast('success', VOICE_MESSAGES.microphoneGranted);

        return;
      }

      entry.recordingStart = await startRecording();
      recording = true;
      phase = 'recording';
      step('recordStartMs');

      await waitRelease();
      step('holdMs');
      // Палец отпущен — запись принята: хвост идёт уже в виде «обработка».
      phase = 'processing';

      const tailMs = withTail ? recordTailMs(steps.holdMs) : 0;

      if (tailMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, tailMs));
      }

      step('tailMs');

      const audio = await stopRecording();

      recording = false;
      entry.recording = audio;
      step('recordStopMs');

      const problem = recordingProblem(audio.durationMs, audio.peak);

      if (problem !== null) {
        throw new VoiceError(problem);
      }

      const request = {
        audioPath: audio.path,
        systemPrompt: base.systemPrompt,
        userText: USER_TEXT,
        tool: base.tool,
      };

      entry.request = { ...request, tool: ADD_TASK_TOOL, baseKey: promptDayKey(pressedAt) };

      const { raw, reply } = await runModel(request);

      entry.reply = raw;
      step('modelMs');

      const result = interpretReply(reply.messages, pressedAt);

      if (!result.ok) {
        entry.rawArgs = result.rawArgs;
        throw new VoiceError(result.error);
      }

      entry.args = result.args;
      entry.chrono = result.chrono;
      entry.dateChoice = result.dateChoice;
      step('interpretMs');

      await onCreate(result.task);
      entry.task = result.task;
      step('saveMs');

      entry.toast = { type: 'success', text: result.toast };
      showToast('success', result.toast);
    } catch (error: unknown) {
      const text = error instanceof VoiceError ? error.message : `Ошибка голосовой команды: ${errorText(error)}`;

      entry.toast = { type: 'error', text };
      entry.error = {
        message: errorText(error),
        stack: error instanceof Error ? (error.stack ?? null) : null,
        // Ошибки нативной части: стек Java приходит в data.stack.
        data: (error as { data?: unknown } | null)?.data ?? null,
      };
      showToast('error', text);

      if (recording) {
        // Запись не остановлена из-за ошибки посреди нажатия — освободить микрофон.
        await stopRecording().catch(() => undefined);
      }
    } finally {
      steps.totalMs = Math.round(performance.now() - started);
      phase = 'idle';
      pressing = false;

      try {
        await writeVoiceLog(entry);
      } catch (error: unknown) {
        console.warn('Голос: не удалось записать журнал', error);
      }
    }
  }

  function begin(): void {
    if (pressing || phase !== 'idle') {
      return;
    }

    held = true;
    withTail = false;
    void press();
  }

  /** Отпускание; `tail` — продолжить запись хвостом (обычное отпускание, не сворачивание). */
  function end(tail: boolean): void {
    // Повторное отпускание (pointercancel после сворачивания) решение первого не меняет.
    if (held) {
      withTail = tail;
    }

    held = false;
    release?.();
  }

  function handlePointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    // Захват указателя: уход пальца за край кнопки не отпускает её, отпускание приходит сюда.
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    begin();
  }

  /**
   * Сворачивание во время записи — как отпускание, но без хвоста: в фоне микрофон отдаёт тишину.
   * Возвращение в приложение — проверка модели и базового промпта: пока приложение было в фоне,
   * мог смениться день промпта.
   */
  function handleVisibilityChange(): void {
    if (document.visibilityState === 'hidden') {
      end(false);
    } else if (available) {
      void refreshEngine();
    }
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
      event.preventDefault();
      begin();
    }
  }

  function handleKeyUp(event: KeyboardEvent): void {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      end(true);
    }
  }
</script>

<svelte:document onvisibilitychange={handleVisibilityChange} />

{#if available}
  <button
    type="button"
    class="voice"
    class:voice--off={off && phase === 'idle'}
    class:voice--loading={loading && phase === 'idle'}
    class:voice--recording={phase === 'recording'}
    class:voice--busy={phase === 'starting' || phase === 'processing'}
    aria-label={label}
    title={label}
    onpointerdown={handlePointerDown}
    onpointerup={() => end(true)}
    onpointercancel={() => end(true)}
    onkeydown={handleKeyDown}
    onkeyup={handleKeyUp}
    oncontextmenu={(event) => event.preventDefault()}
  >
    {#if phase === 'processing'}
      <svg class="spinner" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M12 4a8 8 0 1 0 8 8"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
        />
      </svg>
    {:else}
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect
          x="9"
          y="3"
          width="6"
          height="11"
          rx="3"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        />
        <path
          d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    {/if}
  </button>
{/if}

<style>
  /* Центр нижнего ряда, на одной высоте с кнопкой «+» (решение Р-34, этап 1 плана). */
  .voice {
    position: fixed;
    left: 50%;
    bottom: calc(var(--space-md) + var(--nav-height) + env(safe-area-inset-bottom));
    z-index: 30;
    display: inline-flex;
    width: 56px;
    height: 56px;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--button-primary-border);
    border-radius: var(--radius-pill);
    background: var(--button-primary-bg);
    box-shadow: var(--shadow-card);
    color: var(--button-primary-text);
    cursor: pointer;
    transform: translateX(-50%);
    /* Долгое нажатие в WebView: без выделения, без меню и без прокрутки страницы под пальцем. */
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
  }

  .voice svg {
    width: 26px;
    height: 26px;
    pointer-events: none;
  }

  .voice:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  /* Модель не скачана или не загрузилась: кнопка видна, нажатие объяснит причину. */
  .voice--off {
    border-color: var(--button-secondary-border);
    background: var(--button-secondary-bg);
    color: var(--button-secondary-text);
  }

  /* Модель загружается: вторичный вид и бегущее кольцо. */
  .voice--loading {
    border-color: var(--button-secondary-border);
    background: var(--button-secondary-bg);
    color: var(--button-secondary-text);
  }

  .voice--loading::after {
    position: absolute;
    inset: -5px;
    border: 2px dashed var(--color-primary);
    border-radius: var(--radius-pill);
    content: '';
    animation: voice-spin 2.4s linear infinite;
  }

  /* Запись идёт: цвет ошибок проекта как «красная точка» и пульсирующее кольцо. */
  .voice--recording {
    border-color: var(--color-weekend);
    background: var(--color-weekend);
    color: var(--color-surface);
    transform: translateX(-50%) scale(1.12);
  }

  .voice--recording::after {
    position: absolute;
    inset: -6px;
    border: 3px solid var(--color-weekend);
    border-radius: var(--radius-pill);
    content: '';
    animation: voice-pulse 1s ease-out infinite;
  }

  .voice--busy {
    cursor: progress;
    opacity: 0.85;
  }

  .spinner {
    animation: voice-spin 0.9s linear infinite;
  }

  @keyframes voice-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes voice-pulse {
    from {
      opacity: 0.9;
      transform: scale(1);
    }

    to {
      opacity: 0;
      transform: scale(1.35);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .voice--loading::after,
    .voice--recording::after,
    .spinner {
      animation: none;
    }
  }
</style>
