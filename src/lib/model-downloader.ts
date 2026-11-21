/**
 * Мост к докачке модели для голоса в Android-приложении (решение Р-36). Скачивает нативная часть —
 * локальный плагин ModelDownloader на системном DownloadManager, docs/mechanic_voice.md.
 *
 * В браузере плагина нет: функции, обращающиеся к нему, там отвечают null и ничего не делают.
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import type { VoiceModel } from './voice-models';

/** Состояние файла модели на устройстве. */
export type ModelState =
  | { state: 'absent' }
  | {
      state: 'downloading';
      /** Скачано байт. */
      downloaded: number;
      /** Размер файла в байтах; null — сервер его ещё не сообщил. */
      total: number | null;
      /** Почему загрузка стоит (ждёт сети, повтора); null — идёт. */
      paused: string | null;
    }
  | { state: 'downloaded'; size: number }
  | { state: 'error'; reason: string };

/** Методы нативного плагина; ответ start и status — сырое состояние, его разбирает parseModelState. */
interface ModelDownloaderPlugin {
  start(options: { url: string; fileName: string; size: number; title: string }): Promise<unknown>;
  status(options: { fileName: string; size: number }): Promise<unknown>;
  cancel(): Promise<void>;
  remove(options: { fileName: string }): Promise<void>;
}

const ModelDownloader = registerPlugin<ModelDownloaderPlugin>('ModelDownloader');

/** Есть ли докачка: только в Android-приложении. */
export function isModelDownloaderAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

/** Неотрицательное целое число — количество байт. */
function isByteCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/** Состояние «ошибка» для ответа, который не удалось разобрать. */
function malformed(raw: unknown): ModelState {
  return { state: 'error', reason: `Непонятный ответ приложения: ${JSON.stringify(raw) ?? String(raw)}` };
}

/**
 * Разбирает ответ нативной части в состояние. Ответ проверяется целиком: неверный ответ
 * превращается в ошибку с его текстом, а не в «скачано» или «не скачано», чтобы экран
 * не показал неправду.
 */
export function parseModelState(raw: unknown): ModelState {
  if (typeof raw !== 'object' || raw === null) {
    return malformed(raw);
  }

  const data = raw as Record<string, unknown>;

  switch (data.state) {
    case 'absent':
      return { state: 'absent' };
    case 'downloading': {
      const total = data.total ?? null;
      const paused = data.paused ?? null;

      if (
        !isByteCount(data.downloaded) ||
        (total !== null && !isByteCount(total)) ||
        (paused !== null && typeof paused !== 'string')
      ) {
        return malformed(raw);
      }

      return { state: 'downloading', downloaded: data.downloaded, total, paused };
    }
    case 'downloaded':
      return isByteCount(data.size) ? { state: 'downloaded', size: data.size } : malformed(raw);
    case 'error':
      return typeof data.reason === 'string' && data.reason !== ''
        ? { state: 'error', reason: data.reason }
        : malformed(raw);
    default:
      return malformed(raw);
  }
}

/**
 * Ставит модель на скачивание с адреса url; прежняя загрузка и прежний файл отбрасываются.
 * Возвращает состояние сразу после постановки; null в браузере.
 */
export async function startModelDownload(model: VoiceModel, url: string): Promise<ModelState | null> {
  if (!isModelDownloaderAvailable()) {
    return null;
  }

  return parseModelState(
    await ModelDownloader.start({ url, fileName: model.fileName, size: model.size, title: model.title }),
  );
}

/**
 * Состояние модели на устройстве; null в браузере. Ошибка загрузки отдаётся один раз:
 * нативная часть после неё убирает загрузку, и следующий запрос ответит «не скачана».
 */
export async function readModelState(model: VoiceModel): Promise<ModelState | null> {
  if (!isModelDownloaderAvailable()) {
    return null;
  }

  return parseModelState(await ModelDownloader.status({ fileName: model.fileName, size: model.size }));
}

/** Отменяет идущую загрузку вместе с недокачанным файлом. */
export async function cancelModelDownload(): Promise<void> {
  if (isModelDownloaderAvailable()) {
    await ModelDownloader.cancel();
  }
}

/** Удаляет файл модели с устройства, отменив его загрузку, если она идёт. */
export async function removeModel(model: VoiceModel): Promise<void> {
  if (isModelDownloaderAvailable()) {
    await ModelDownloader.remove({ fileName: model.fileName });
  }
}
