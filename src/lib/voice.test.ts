import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearVoiceLog,
  ensureMicrophone,
  isVoiceAvailable,
  loadVoiceEngine,
  parseEngineStatus,
  parseModelReply,
  runModel,
  shareVoiceLog,
  startRecording,
  stopRecording,
  voiceLogInfo,
  writeVoiceLog,
} from './voice';
import type { VoiceModel } from './voice-models';

/** Плагин Capacitor подменён: тест не обращается к нативной части. */
const mocks = vi.hoisted(() => ({
  isNative: vi.fn<() => boolean>(),
  load: vi.fn<(options: unknown) => Promise<unknown>>(),
  process: vi.fn<(options: unknown) => Promise<unknown>>(),
  writeLog: vi.fn<(options: { line: string }) => Promise<void>>(),
  checkPermissions: vi.fn<() => Promise<{ microphone: string }>>(),
  requestPermissions: vi.fn<() => Promise<{ microphone: string }>>(),
  passthrough: vi.fn<() => Promise<unknown>>(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: mocks.isNative },
  registerPlugin: () => ({
    load: mocks.load,
    process: mocks.process,
    writeLog: mocks.writeLog,
    checkPermissions: mocks.checkPermissions,
    requestPermissions: mocks.requestPermissions,
    startRecording: mocks.passthrough,
    stopRecording: mocks.passthrough,
    logInfo: mocks.passthrough,
    clearLog: mocks.passthrough,
    shareLog: mocks.passthrough,
  }),
}));

const MODEL: VoiceModel = {
  id: 'gemma-4-e2b',
  title: 'Gemma 4 E2B',
  fileName: 'gemma-4-E2B-it.litertlm',
  size: 2588147712,
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('isVoiceAvailable', () => {
  it('только в нативном приложении', () => {
    mocks.isNative.mockReturnValue(true);
    expect(isVoiceAvailable()).toBe(true);
    mocks.isNative.mockReturnValue(false);
    expect(isVoiceAvailable()).toBe(false);
  });
});

describe('parseEngineStatus', () => {
  it('каждое известное состояние', () => {
    expect(parseEngineStatus({ state: 'absent' })).toEqual({ state: 'absent', backend: null, loadMs: 0, error: null });
    expect(parseEngineStatus({ state: 'loading' })).toMatchObject({ state: 'loading' });
    expect(parseEngineStatus({ state: 'ready', backend: 'GPU', loadMs: 8123 })).toEqual({
      state: 'ready',
      backend: 'GPU',
      loadMs: 8123,
      error: null,
    });
    expect(parseEngineStatus({ state: 'error', error: 'нет памяти' })).toMatchObject({ state: 'error', error: 'нет памяти' });
  });

  it('поля неверного типа читаются как пустые', () => {
    expect(parseEngineStatus({ state: 'ready', backend: 1, loadMs: '5', error: {} })).toEqual({
      state: 'ready',
      backend: null,
      loadMs: 0,
      error: null,
    });
  });

  it('неизвестное состояние и не объект — ошибка с текстом ответа', () => {
    expect(parseEngineStatus({ state: 'busy' })).toEqual({
      state: 'error',
      backend: null,
      loadMs: 0,
      error: 'Непонятный ответ приложения: {"state":"busy"}',
    });
    expect(parseEngineStatus(null).error).toBe('Непонятный ответ приложения: null');
    expect(parseEngineStatus(undefined).error).toBe('Непонятный ответ приложения: undefined');
  });
});

describe('parseModelReply', () => {
  it('разбирает сообщение с текстом, вызовом и замерами', () => {
    const raw = {
      messages: [
        {
          role: 'assistant',
          text: '',
          toolCalls: [{ name: 'add_task', arguments: { date: '2026-11-23' } }],
          channels: { thought: '' },
        },
      ],
      backend: 'CPU',
      waitMs: 3,
      conversationMs: 12,
      inferenceMs: 2400,
      config: { maxOutputTokens: 128 },
    };

    expect(parseModelReply(raw)).toEqual({
      messages: [
        {
          role: 'assistant',
          text: '',
          toolCalls: [{ name: 'add_task', arguments: { date: '2026-11-23' } }],
          channels: { thought: '' },
        },
      ],
      backend: 'CPU',
      waitMs: 3,
      conversationMs: 12,
      inferenceMs: 2400,
      config: { maxOutputTokens: 128 },
    });
  });

  it('вызовы без имени отбрасываются, неверные поля читаются как пустые', () => {
    const parsed = parseModelReply({
      messages: [{ toolCalls: [{ arguments: {} }, null, 'x', { name: 'add_task' }], text: 5, channels: 'x' }, null],
    });

    expect(parsed.messages).toEqual([
      { role: '', text: '', toolCalls: [{ name: 'add_task', arguments: undefined }], channels: {} },
      { role: '', text: '', toolCalls: [], channels: {} },
    ]);
    expect(parsed).toMatchObject({ backend: null, waitMs: 0, conversationMs: 0, inferenceMs: 0, config: null });
  });

  it('не объект — пустой ответ', () => {
    expect(parseModelReply('ok').messages).toEqual([]);
    expect(parseModelReply({ messages: 'x' }).messages).toEqual([]);
  });
});

describe('мост', () => {
  it('loadVoiceEngine передаёт имя файла и размер модели', async () => {
    mocks.load.mockResolvedValue({ state: 'loading' });

    expect(await loadVoiceEngine(MODEL)).toMatchObject({ state: 'loading' });
    expect(mocks.load).toHaveBeenCalledWith({ fileName: 'gemma-4-E2B-it.litertlm', size: 2588147712 });
  });

  it('runModel отдаёт и сырой, и разобранный ответ', async () => {
    const raw = { messages: [], backend: 'GPU' };
    const request = { audioPath: '/a.wav', systemPrompt: 'p', userText: 'u', tool: '{}' };

    mocks.process.mockResolvedValue(raw);

    const result = await runModel(request);

    expect(mocks.process).toHaveBeenCalledWith(request);
    expect(result.raw).toBe(raw);
    expect(result.reply.backend).toBe('GPU');
  });

  it('writeVoiceLog пишет одну строку JSON, kind — первым', async () => {
    mocks.writeLog.mockResolvedValue(undefined);

    await writeVoiceLog({ kind: 'press', text: 'строка\nвторая' });

    const line = mocks.writeLog.mock.calls[0][0].line;

    expect(line.startsWith('{"kind":"press"')).toBe(true);
    expect(line).not.toContain('\n');
    expect(JSON.parse(line)).toEqual({ kind: 'press', text: 'строка\nвторая' });
  });
});

describe('прямые вызовы плагина', () => {
  it('запись, сведения о журнале, очистка и выгрузка отдают ответ плагина как есть', async () => {
    const answer = { file: 'voice-1.wav' };

    mocks.passthrough.mockResolvedValue(answer);

    for (const call of [startRecording, stopRecording, voiceLogInfo, clearVoiceLog, shareVoiceLog]) {
      expect(await call()).toBe(answer);
    }

    expect(mocks.passthrough).toHaveBeenCalledTimes(5);
  });
});

describe('ensureMicrophone', () => {
  it('разрешение уже есть — не спрашивает', async () => {
    mocks.checkPermissions.mockResolvedValue({ microphone: 'granted' });

    expect(await ensureMicrophone()).toBe('granted');
    expect(mocks.requestPermissions).not.toHaveBeenCalled();
  });

  it('нет разрешения — спрашивает; выдано только что', async () => {
    mocks.checkPermissions.mockResolvedValue({ microphone: 'prompt' });
    mocks.requestPermissions.mockResolvedValue({ microphone: 'granted' });

    expect(await ensureMicrophone()).toBe('just-granted');
    expect(mocks.requestPermissions).toHaveBeenCalledTimes(1);
  });

  it('отказ и запрет без диалога — denied', async () => {
    mocks.checkPermissions.mockResolvedValue({ microphone: 'prompt-with-rationale' });
    mocks.requestPermissions.mockResolvedValue({ microphone: 'denied' });
    expect(await ensureMicrophone()).toBe('denied');

    mocks.checkPermissions.mockResolvedValue({ microphone: 'denied' });
    expect(await ensureMicrophone()).toBe('denied');
  });
});
