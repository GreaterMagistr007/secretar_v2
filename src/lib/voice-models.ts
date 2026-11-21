/**
 * Модели для голосового управления и их докачка из локальной сети (решение Р-36,
 * docs/mechanic_voice.md): каталог моделей, адрес сервера раздачи, запоминание выбора
 * и вид размеров на экране «Настройки → Голос». Чистая логика без моста к нативной части.
 */

/** Модель из каталога: файл, который приложение скачивает с сервера раздачи. */
export interface VoiceModel {
  /** Постоянный идентификатор — он запоминается как выбор пользователя. */
  id: string;
  /** Название на экране. */
  title: string;
  /** Имя файла на сервере раздачи и на устройстве. */
  fileName: string;
  /** Ожидаемый размер файла в байтах: скачанный файл другого размера отбрасывается. */
  size: number;
}

/** Каталог моделей; первая — модель по умолчанию. */
export const VOICE_MODELS: readonly VoiceModel[] = [
  {
    id: 'gemma-4-e2b',
    title: 'Gemma 4 E2B',
    fileName: 'gemma-4-E2B-it.litertlm',
    size: 2_588_147_712,
  },
];

/** Модель по идентификатору; неизвестный и отсутствующий идентификатор дают модель по умолчанию. */
export function findVoiceModel(id: string | null): VoiceModel {
  return VOICE_MODELS.find((model) => model.id === id) ?? VOICE_MODELS[0];
}

/**
 * Приводит введённый адрес сервера раздачи к виду «схема://хост[:порт][/путь]» без `/` в конце.
 * Без схемы подставляется `http://` — сервер в локальной сети, сертификата у него нет.
 * Порт проверяет разбор `URL`: вне 0…65535 адрес неверен. Возвращает null для пустого
 * и неверного адреса, для схем кроме http и https, для адреса с параметрами (`?`) или якорем (`#`):
 * к такому адресу имя файла не приписать.
 */
export function normalizeServerAddress(input: string): string | null {
  const trimmed = input.trim();

  if (trimmed === '') {
    return null;
  }

  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  let url: URL;

  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }

  if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.search !== '' || url.hash !== '') {
    return null;
  }

  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
}

/** Адрес файла модели: нормализованный адрес сервера и имя файла. */
export function modelFileUrl(server: string, model: VoiceModel): string {
  return `${server}/${encodeURIComponent(model.fileName)}`;
}

/** Ключ хранения выбранной модели. */
const MODEL_KEY = 'secretar.voice.model';

/** Ключ хранения адреса сервера раздачи. */
const SERVER_KEY = 'secretar.voice.server';

/**
 * Читает строку настройки. Недоступное хранилище — как у остальных настроек проекта:
 * настройка действует в текущем сеансе, но не запоминается.
 */
function readSetting(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSetting(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Хранилище недоступно: значение действует в текущем сеансе, но не запомнено.
  }
}

/** Выбранная модель; без сохранённого выбора — модель по умолчанию. */
export function loadVoiceModel(): VoiceModel {
  return findVoiceModel(readSetting(MODEL_KEY));
}

export function saveVoiceModel(model: VoiceModel): void {
  writeSetting(MODEL_KEY, model.id);
}

/** Адрес сервера раздачи в том виде, как его ввёл пользователь; пустая строка — не вводился. */
export function loadServerAddress(): string {
  return readSetting(SERVER_KEY) ?? '';
}

export function saveServerAddress(address: string): void {
  writeSetting(SERVER_KEY, address);
}

const BYTES_IN_MB = 1_000_000;
const BYTES_IN_GB = 1_000_000_000;

/** Мегабайты целым числом с разделением разрядов: «2 588 МБ». */
export function formatMegabytes(bytes: number): string {
  const value = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(
    Math.floor(bytes / BYTES_IN_MB),
  );

  return `${value} МБ`;
}

/** Гигабайты с двумя знаками после запятой: «2,59 ГБ». */
export function formatGigabytes(bytes: number): string {
  const value = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(bytes / BYTES_IN_GB);

  return `${value} ГБ`;
}

/**
 * Процент скачанного, округлённый вниз: 100 % только у полностью скачанного файла.
 * Неизвестный (null) или нулевой общий размер — null: процент не посчитать.
 */
export function downloadPercent(downloaded: number, total: number | null): number | null {
  if (total === null || total <= 0) {
    return null;
  }

  return Math.min(100, Math.max(0, Math.floor((downloaded * 100) / total)));
}
