/**
 * Мост к голосовой кнопке в Android-приложении (решения Р-34, Р-37): загрузка модели, микрофон,
 * обработка записи моделью и журнал нажатий. Исполняет нативная часть — локальный плагин Voice
 * (VoicePlugin.java), docs/mechanic_voice.md, раздел «Голосовая кнопка».
 *
 * В браузере плагина нет и кнопки нет: isVoiceAvailable() отвечает false.
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import type { PermissionState } from '@capacitor/core';
import type { ModelMessage, ModelToolCall } from './voice-command';
import type { VoiceDevice, VoiceModel } from './voice-models';

/** Состояние модели в памяти приложения. */
export type EngineState = 'absent' | 'loading' | 'ready' | 'error';

export interface EngineStatus {
  state: EngineState;
  /** На чём работает текстовая часть: GPU или CPU; null — не загружена. */
  backend: string | null;
  /** Режим MTP-драфтера загруженной модели: ON или OFF (откат); null — не загружена. */
  mtp: string | null;
  loadMs: number;
  error: string | null;
}

/** Ответ на старт записи: сколько ждали первый буфер микрофона. */
export interface RecordingStart {
  startMs: number;
  firstBuffer: boolean;
  bufferBytes: number;
  source: string;
}

/** Готовая запись — WAV-файл в каталоге журнала. */
export interface Recording {
  file: string;
  path: string;
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  bytes: number;
  samples: number;
  durationMs: number;
  recordedMs: number;
  /** Пиковый модуль отсчёта 0…32768: около нуля — микрофон отдал тишину. */
  peak: number;
  truncated: boolean;
}

/**
 * Базовый разговор: системный промпт дня и описание инструмента JSON-строкой. Плагин читает их
 * один раз и на нажатие копирует готовый разговор, пока текст не изменится.
 */
export interface BasePrompt {
  systemPrompt: string;
  tool: string;
}

/** Что отдаётся модели на нажатие. */
export interface ModelRequest {
  audioPath: string;
  /** Базовый промпт дня; не совпал с прочитанным — плагин перечитает его перед нажатием. */
  systemPrompt: string;
  /** Сообщение нажатия к записи (`USER_TEXT`). */
  userText: string;
  /** Описание инструмента JSON-строкой. */
  tool: string;
}

/** Ответ модели и замеры нативной части. */
export interface ModelReply {
  messages: ModelMessage[];
  backend: string | null;
  /** Ожидание очереди фонового потока (например, догружалась модель), мс. */
  waitMs: number;
  conversationMs: number;
  inferenceMs: number;
  /** Параметры движка и сэмплера — для журнала. */
  config: unknown;
}

interface VoicePlugin {
  load(options: { fileName: string; size: number; device: VoiceDevice } & Partial<BasePrompt>): Promise<unknown>;
  startRecording(): Promise<RecordingStart>;
  stopRecording(): Promise<Recording>;
  process(options: ModelRequest): Promise<unknown>;
  writeLog(options: { line: string }): Promise<void>;
  logInfo(): Promise<{ entries: number; bytes: number }>;
  clearLog(): Promise<void>;
  shareLog(): Promise<{ file: string; bytes: number }>;
  checkPermissions(): Promise<{ microphone: PermissionState }>;
  requestPermissions(): Promise<{ microphone: PermissionState }>;
}

const Voice = registerPlugin<VoicePlugin>('Voice');

const ENGINE_STATES: readonly EngineState[] = ['absent', 'loading', 'ready', 'error'];

/** Есть ли голосовая кнопка: только в Android-приложении. */
export function isVoiceAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

/** Разбирает состояние движка; непонятный ответ — ошибка с его текстом. */
export function parseEngineStatus(raw: unknown): EngineStatus {
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const state = ENGINE_STATES.find((item) => item === data.state);

  if (state === undefined) {
    return {
      state: 'error',
      backend: null,
      mtp: null,
      loadMs: 0,
      error: `Непонятный ответ приложения: ${JSON.stringify(raw) ?? String(raw)}`,
    };
  }

  return {
    state,
    backend: typeof data.backend === 'string' ? data.backend : null,
    mtp: typeof data.mtp === 'string' ? data.mtp : null,
    loadMs: typeof data.loadMs === 'number' ? data.loadMs : 0,
    error: typeof data.error === 'string' ? data.error : null,
  };
}

/** Вызов инструмента из ответа: имя строкой, аргументы — как пришли. Иное отбрасывается. */
function parseToolCall(raw: unknown): ModelToolCall[] {
  if (typeof raw !== 'object' || raw === null) {
    return [];
  }

  const data = raw as Record<string, unknown>;

  return typeof data.name === 'string' ? [{ name: data.name, arguments: data.arguments }] : [];
}

/**
 * Разбирает ответ модели. Сообщения приводятся к одному виду, лишние поля и неверные вызовы
 * отбрасываются; сырой ответ журнал получает отдельно (runModel отдаёт оба).
 */
export function parseModelReply(raw: unknown): ModelReply {
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const messages = Array.isArray(data.messages) ? data.messages : [];
  const number = (value: unknown): number => (typeof value === 'number' ? value : 0);

  return {
    messages: messages.map((item: unknown) => {
      const message = (typeof item === 'object' && item !== null ? item : {}) as Record<string, unknown>;

      return {
        role: typeof message.role === 'string' ? message.role : '',
        text: typeof message.text === 'string' ? message.text : '',
        toolCalls: Array.isArray(message.toolCalls) ? message.toolCalls.flatMap(parseToolCall) : [],
        channels:
          typeof message.channels === 'object' && message.channels !== null
            ? (message.channels as Record<string, unknown>)
            : {},
      };
    }),
    backend: typeof data.backend === 'string' ? data.backend : null,
    waitMs: number(data.waitMs),
    conversationMs: number(data.conversationMs),
    inferenceMs: number(data.inferenceMs),
    config: data.config ?? null,
  };
}

/**
 * Загружает модель в фоне на устройстве `device`, если она скачана и проверена, и отдаёт
 * состояние. Повторный вызов ничего не перезапускает — им же опрашивается ход загрузки; другое
 * устройство — перезагрузка в фоне. `base` — базовый промпт дня: плагин прочитает его после
 * загрузки или, если он изменился, сразу в фоне; без `base` остаётся прежний.
 */
export async function loadVoiceEngine(
  model: VoiceModel,
  device: VoiceDevice,
  base?: BasePrompt,
): Promise<EngineStatus> {
  return parseEngineStatus(await Voice.load({ fileName: model.fileName, size: model.size, device, ...base }));
}

/**
 * Разрешение на микрофон: спрашивается, только если его нет (решение Р-34). «just-granted» —
 * выдано только что: само нажатие ушло на системный диалог, говорить нужно следующим.
 */
export async function ensureMicrophone(): Promise<'granted' | 'just-granted' | 'denied'> {
  if ((await Voice.checkPermissions()).microphone === 'granted') {
    return 'granted';
  }

  return (await Voice.requestPermissions()).microphone === 'granted' ? 'just-granted' : 'denied';
}

export function startRecording(): Promise<RecordingStart> {
  return Voice.startRecording();
}

export function stopRecording(): Promise<Recording> {
  return Voice.stopRecording();
}

/**
 * Отдаёт запись модели; ответ — после инференса в фоновом потоке. `raw` — ответ нативной части
 * как пришёл, для журнала; `reply` — разобранный.
 */
export async function runModel(request: ModelRequest): Promise<{ raw: unknown; reply: ModelReply }> {
  const raw = await Voice.process(request);

  return { raw, reply: parseModelReply(raw) };
}

/** Дописывает запись нажатия в журнал; первым полем объекта должен быть `kind`. */
export function writeVoiceLog(entry: { kind: 'press' } & Record<string, unknown>): Promise<void> {
  return Voice.writeLog({ line: JSON.stringify(entry) });
}

export function voiceLogInfo(): Promise<{ entries: number; bytes: number }> {
  return Voice.logInfo();
}

export function clearVoiceLog(): Promise<void> {
  return Voice.clearLog();
}

export function shareVoiceLog(): Promise<{ file: string; bytes: number }> {
  return Voice.shareLog();
}
