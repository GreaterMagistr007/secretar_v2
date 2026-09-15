import { afterEach, describe, expect, it, vi } from 'vitest';
import { createId } from './id';

/** Канонический вид UUID v7: версия 7 и вариант RFC (8, 9, a или b). */
const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Метка времени из первых 48 бит идентификатора. */
function timestampOf(id: string): number {
  return Number.parseInt(id.slice(0, 8) + id.slice(9, 13), 16);
}

/**
 * Замороженное время берётся заведомо позже реального: генератор хранит метку
 * последней выдачи, и при переводе часов назад он оставляет прежнюю метку.
 */
const FROZEN = Date.UTC(2030, 0, 1, 0, 0, 0, 0);

describe('createId', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('возвращает строку канонического формата UUID', () => {
    expect(createId()).toMatch(UUID_V7);
  });

  it('проставляет версию 7 и вариант RFC во всей выборке', () => {
    for (let index = 0; index < 500; index += 1) {
      const id = createId();

      expect(id).toHaveLength(36);
      expect(id[14]).toBe('7');
      expect(['8', '9', 'a', 'b']).toContain(id[19]);
    }
  });

  it('выдаёт идентификаторы, возрастающие в порядке создания', () => {
    const ids = Array.from({ length: 1000 }, () => createId());

    for (let index = 1; index < ids.length; index += 1) {
      expect(ids[index] > ids[index - 1]).toBe(true);
    }
  });

  it('не повторяется на большой выборке', () => {
    const ids = Array.from({ length: 10000 }, () => createId());

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('сохраняет возрастание внутри одной миллисекунды', () => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN);

    const ids = Array.from({ length: 2000 }, () => createId());

    for (let index = 1; index < ids.length; index += 1) {
      expect(ids[index] > ids[index - 1]).toBe(true);
    }

    expect(timestampOf(ids[0])).toBe(FROZEN);
    expect(timestampOf(ids[ids.length - 1])).toBe(FROZEN);
  });

  it('записывает в старшие 48 бит текущую метку времени', () => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN + 60000);

    expect(timestampOf(createId())).toBe(FROZEN + 60000);
  });

  it('остаётся возрастающим при переводе часов назад', () => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN + 120000);

    const before = createId();

    vi.setSystemTime(FROZEN + 120000 - 5000);

    const after = createId();

    expect(after > before).toBe(true);
    expect(after).toMatch(UUID_V7);
  });

  it('переполнение счётчика занимает следующую миллисекунду и не ломает порядок', () => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN + 600000);

    // Счётчик занимает 12 бит, стартует не выше 1023 — 5000 выдач его переполняют.
    const ids = Array.from({ length: 5000 }, () => createId());

    for (let index = 1; index < ids.length; index += 1) {
      expect(ids[index] > ids[index - 1]).toBe(true);
      expect(ids[index]).toMatch(UUID_V7);
    }

    expect(timestampOf(ids[ids.length - 1])).toBeGreaterThan(timestampOf(ids[0]));
  });
});
