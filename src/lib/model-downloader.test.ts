import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cancelModelDownload,
  isModelDownloaderAvailable,
  parseModelState,
  readModelState,
  removeModel,
  startModelDownload,
} from './model-downloader';
import type { VoiceModel } from './voice-models';

/** Плагин Capacitor подменён: тест не обращается к нативной части. */
const mocks = vi.hoisted(() => ({
  isNative: vi.fn<() => boolean>(),
  start: vi.fn<(options: unknown) => Promise<unknown>>(),
  status: vi.fn<(options: unknown) => Promise<unknown>>(),
  cancel: vi.fn<() => Promise<void>>(),
  remove: vi.fn<(options: unknown) => Promise<void>>(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: mocks.isNative },
  registerPlugin: () => ({
    start: mocks.start,
    status: mocks.status,
    cancel: mocks.cancel,
    remove: mocks.remove,
  }),
}));

const MODEL: VoiceModel = {
  id: 'gemma-4-e2b',
  title: 'Gemma 4 E2B',
  fileName: 'gemma-4-E2B-it.litertlm',
  size: 2588147712,
};

const URL = 'http://192.168.1.10:8088/gemma-4-E2B-it.litertlm';

beforeEach(() => {
  mocks.start.mockResolvedValue({ state: 'downloading', downloaded: 0, total: null, paused: null });
  mocks.status.mockResolvedValue({ state: 'absent' });
  mocks.cancel.mockResolvedValue(undefined);
  mocks.remove.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('parseModelState', () => {
  it('не скачана', () => {
    expect(parseModelState({ state: 'absent' })).toEqual({ state: 'absent' });
  });

  it('качается: байты, размер и причина паузы', () => {
    expect(
      parseModelState({ state: 'downloading', downloaded: 254111299, total: 2588147712, paused: null }),
    ).toEqual({ state: 'downloading', downloaded: 254111299, total: 2588147712, paused: null });
    expect(
      parseModelState({ state: 'downloading', downloaded: 0, total: 2588147712, paused: 'Ждёт сети' }),
    ).toEqual({ state: 'downloading', downloaded: 0, total: 2588147712, paused: 'Ждёт сети' });
  });

  it('качается: неизвестный размер и отсутствующие поля читаются как null', () => {
    expect(parseModelState({ state: 'downloading', downloaded: 0, total: null })).toEqual({
      state: 'downloading',
      downloaded: 0,
      total: null,
      paused: null,
    });
    expect(parseModelState({ state: 'downloading', downloaded: 5 })).toEqual({
      state: 'downloading',
      downloaded: 5,
      total: null,
      paused: null,
    });
  });

  it('скачана: размер файла, в том числе ноль', () => {
    expect(parseModelState({ state: 'downloaded', size: 2588147712 })).toEqual({
      state: 'downloaded',
      size: 2588147712,
    });
    expect(parseModelState({ state: 'downloaded', size: 0 })).toEqual({ state: 'downloaded', size: 0 });
  });

  it('ошибка с причиной', () => {
    expect(parseModelState({ state: 'error', reason: 'Сервер ответил 404' })).toEqual({
      state: 'error',
      reason: 'Сервер ответил 404',
    });
  });

  it('не объект — ошибка с текстом ответа', () => {
    expect(parseModelState(null)).toEqual({ state: 'error', reason: 'Непонятный ответ приложения: null' });
    expect(parseModelState(undefined)).toEqual({
      state: 'error',
      reason: 'Непонятный ответ приложения: undefined',
    });
    expect(parseModelState('absent')).toEqual({
      state: 'error',
      reason: 'Непонятный ответ приложения: "absent"',
    });
  });

  it('неизвестное и отсутствующее состояние — ошибка', () => {
    expect(parseModelState({ state: 'paused' }).state).toBe('error');
    expect(parseModelState({}).state).toBe('error');
  });

  it('качается с неверными числами — ошибка', () => {
    expect(parseModelState({ state: 'downloading' }).state).toBe('error');
    expect(parseModelState({ state: 'downloading', downloaded: -1, total: 10 }).state).toBe('error');
    expect(parseModelState({ state: 'downloading', downloaded: 1.5, total: 10 }).state).toBe('error');
    expect(parseModelState({ state: 'downloading', downloaded: '1', total: 10 }).state).toBe('error');
    expect(parseModelState({ state: 'downloading', downloaded: 1, total: -1 }).state).toBe('error');
    expect(parseModelState({ state: 'downloading', downloaded: 1, total: 10, paused: 3 }).state).toBe(
      'error',
    );
  });

  it('скачана без размера или с неверным размером — ошибка', () => {
    expect(parseModelState({ state: 'downloaded' }).state).toBe('error');
    expect(parseModelState({ state: 'downloaded', size: -1 }).state).toBe('error');
    expect(parseModelState({ state: 'downloaded', size: '2588147712' }).state).toBe('error');
  });

  it('ошибка без причины или с пустой причиной — ошибка с текстом ответа', () => {
    expect(parseModelState({ state: 'error' })).toEqual({
      state: 'error',
      reason: 'Непонятный ответ приложения: {"state":"error"}',
    });
    expect(parseModelState({ state: 'error', reason: '' }).state).toBe('error');
  });
});

describe('в браузере', () => {
  beforeEach(() => {
    mocks.isNative.mockReturnValue(false);
  });

  it('докачка недоступна, плагин не вызывается', async () => {
    expect(isModelDownloaderAvailable()).toBe(false);
    expect(await startModelDownload(MODEL, URL)).toBeNull();
    expect(await readModelState(MODEL)).toBeNull();
    await cancelModelDownload();
    await removeModel(MODEL);

    expect(mocks.start).not.toHaveBeenCalled();
    expect(mocks.status).not.toHaveBeenCalled();
    expect(mocks.cancel).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});

describe('в Android-приложении', () => {
  beforeEach(() => {
    mocks.isNative.mockReturnValue(true);
  });

  it('докачка доступна', () => {
    expect(isModelDownloaderAvailable()).toBe(true);
  });

  it('start передаёт адрес, имя файла, размер и название и разбирает ответ', async () => {
    expect(await startModelDownload(MODEL, URL)).toEqual({
      state: 'downloading',
      downloaded: 0,
      total: null,
      paused: null,
    });
    expect(mocks.start).toHaveBeenCalledWith({
      url: URL,
      fileName: 'gemma-4-E2B-it.litertlm',
      size: 2588147712,
      title: 'Gemma 4 E2B',
    });
  });

  it('status передаёт имя файла и размер и разбирает ответ', async () => {
    mocks.status.mockResolvedValue({ state: 'downloaded', size: 2588147712 });

    expect(await readModelState(MODEL)).toEqual({ state: 'downloaded', size: 2588147712 });
    expect(mocks.status).toHaveBeenCalledWith({ fileName: 'gemma-4-E2B-it.litertlm', size: 2588147712 });
  });

  it('неверный ответ status — состояние ошибки, а не исключение', async () => {
    mocks.status.mockResolvedValue({ state: 'downloaded' });

    expect((await readModelState(MODEL))?.state).toBe('error');
  });

  it('отказ плагина всплывает к экрану', async () => {
    mocks.start.mockRejectedValue(new Error('Неверный адрес'));

    await expect(startModelDownload(MODEL, URL)).rejects.toThrow('Неверный адрес');
  });

  it('cancel и remove вызывают плагин', async () => {
    await cancelModelDownload();
    await removeModel(MODEL);

    expect(mocks.cancel).toHaveBeenCalledTimes(1);
    expect(mocks.remove).toHaveBeenCalledWith({ fileName: 'gemma-4-E2B-it.litertlm' });
  });
});
