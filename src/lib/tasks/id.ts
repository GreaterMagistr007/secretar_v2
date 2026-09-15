/**
 * Идентификаторы задач — UUID v7 (RFC 9562).
 *
 * Версия 7 выбрана ради сортируемости: лексикографический порядок строк совпадает
 * с порядком создания, поэтому «по времени создания» сортируется по самому
 * идентификатору — отдельное поле и разбор UUID не нужны.
 *
 * Раскладка: 48 бит метки времени в миллисекундах, 4 бита версии, 12 бит rand_a,
 * 2 бита варианта, 62 бита случайных данных.
 */

/** Поле rand_a (12 бит) занято счётчиком внутри одной миллисекунды. */
const COUNTER_MAX = 0xfff;

/**
 * Стартовое значение счётчика в новой миллисекунде — случайное, но из младшей
 * четверти диапазона: остаётся запас приращений, если за одну миллисекунду
 * создаётся много задач (метод «monotonic random» из RFC 9562).
 */
const COUNTER_SEED_MASK = 0x3ff;

/** Метка времени последнего выданного идентификатора, epoch ms. */
let lastTimestamp = -1;

/** Счётчик внутри миллисекунды lastTimestamp. */
let counter = 0;

/** Случайные байты из криптографического источника. */
function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/** Случайное стартовое значение счётчика. */
function seedCounter(): number {
  const [high, low] = randomBytes(2);
  return ((high << 8) | low) & COUNTER_SEED_MASK;
}

/**
 * Продвигает состояние генератора.
 *
 * Внутри одной миллисекунды счётчик растёт — это и даёт монотонность. При
 * переполнении счётчика и при переводе часов назад метка времени берётся на
 * миллисекунду вперёд от предыдущей: порядок выдачи важнее точности метки.
 */
function advance(now: number): void {
  if (now > lastTimestamp) {
    lastTimestamp = now;
    counter = seedCounter();
    return;
  }

  counter += 1;

  if (counter > COUNTER_MAX) {
    lastTimestamp += 1;
    counter = seedCounter();
  }
}

/** Шестнадцатеричное представление байтов. */
function toHex(bytes: Uint8Array): string {
  let hex = '';

  for (let index = 0; index < bytes.length; index += 1) {
    hex += bytes[index].toString(16).padStart(2, '0');
  }

  return hex;
}

/**
 * Создаёт идентификатор задачи.
 *
 * Гарантии: строки, выданные подряд, строго возрастают лексикографически;
 * совпадений не бывает (62 бита случайных данных плюс счётчик).
 */
export function createId(): string {
  advance(Date.now());

  const bytes = new Uint8Array(16);
  const random = randomBytes(8);
  const timestamp = lastTimestamp;

  // Старшие 16 бит метки времени не помещаются в 32-битные побитовые операции.
  bytes[0] = Math.floor(timestamp / 2 ** 40) & 0xff;
  bytes[1] = Math.floor(timestamp / 2 ** 32) & 0xff;
  bytes[2] = (timestamp >>> 24) & 0xff;
  bytes[3] = (timestamp >>> 16) & 0xff;
  bytes[4] = (timestamp >>> 8) & 0xff;
  bytes[5] = timestamp & 0xff;

  bytes[6] = 0x70 | ((counter >>> 8) & 0x0f);
  bytes[7] = counter & 0xff;

  bytes[8] = (random[0] & 0x3f) | 0x80;

  for (let index = 1; index < 8; index += 1) {
    bytes[8 + index] = random[index];
  }

  const hex = toHex(bytes);

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
