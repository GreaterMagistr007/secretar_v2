import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ADD_TASK_TOOL,
  buildSystemPrompt,
  checkDateWithChrono,
  dayReference,
  formatTimestamp,
  interpretReply,
  parseAddTaskArgs,
  recordingProblem,
  successMessage,
  taskText,
} from './voice-command';
import type { ModelMessage } from './voice-command';
import { toIsoDate as toIso } from './date';

/** Суббота, 21 ноября 2026, 19:30 по местному времени стенда. */
const SATURDAY = new Date(2026, 10, 21, 19, 30, 5, 7);

/** Понедельник, 23 ноября 2026, 09:05. */
const MONDAY = new Date(2026, 10, 23, 9, 5);

function reply(toolCalls: ModelMessage['toolCalls'], text = ''): ModelMessage[] {
  return [{ role: 'assistant', text, toolCalls, channels: {} }];
}

describe('buildSystemPrompt', () => {
  const prompt = buildSystemPrompt(SATURDAY, 'Europe/Moscow');

  it('называет сегодняшний день, время и часовой пояс', () => {
    expect(prompt).toContain('Сейчас: суббота, 21 ноября 2026, 19:30 (часовой пояс Europe/Moscow). Сегодня — 2026-11-21.');
  });

  it('даёт календарь из 15 дней с метками первых трёх', () => {
    expect(prompt).toContain('2026-11-21 — суббота (сегодня)\n2026-11-22 — воскресенье (завтра)\n2026-11-23 — понедельник (послезавтра)\n2026-11-24 — вторник\n');
    expect(prompt).toContain('2026-12-05 — суббота\n');
    expect(prompt).not.toContain('2026-12-06');
  });

  it('подставляет даты в правила «сегодня», «завтра», «послезавтра»', () => {
    expect(prompt).toContain('день не назван — сегодня, 2026-11-21;');
    expect(prompt).toContain('«сегодня» — 2026-11-21, «завтра» — 2026-11-22, «послезавтра» — 2026-11-23;');
  });

  it('прописывает правило дня недели: сегодняшний не считается, через 7 дней', () => {
    expect(prompt).toContain('ближайший такой день после сегодняшнего; если сегодня тот же день недели — тот же день следующей недели, через 7 дней');
  });

  it('прописывает время и текст, называет инструмент', () => {
    expect(prompt).toContain('«в 12» — 12:00');
    expect(prompt).toContain('«в 7 вечера» — 19:00');
    expect(prompt).toContain('«в понедельник маникюр в 12» → «Маникюр»');
    expect(prompt).toContain('вызови инструмент add_task один раз');
  });

  it('переходит через конец месяца и года', () => {
    const december = buildSystemPrompt(new Date(2026, 11, 30, 23, 59), 'Asia/Yekaterinburg');

    expect(december).toContain('Сейчас: среда, 30 декабря 2026, 23:59 (часовой пояс Asia/Yekaterinburg)');
    expect(december).toContain('2026-12-31 — четверг (завтра)\n2027-01-01 — пятница (послезавтра)');
    expect(december).toContain('2027-01-13 — среда');
  });

  it('полночь пишется как 00:00', () => {
    expect(buildSystemPrompt(new Date(2026, 0, 1, 0, 0), 'UTC')).toContain('четверг, 1 января 2026, 00:00');
  });
});

describe('ночное правило', () => {
  /** Воскресенье, 22 ноября 2026, 01:58 — пример владельца. */
  const night = new Date(2026, 10, 22, 1, 58);

  it('dayReference: 03:59 — прошлые сутки, 04:00 — те же', () => {
    expect(toIso(dayReference(new Date(2026, 10, 22, 3, 59, 59, 999)))).toBe('2026-11-21');
    expect(toIso(dayReference(new Date(2026, 10, 22, 4, 0)))).toBe('2026-11-22');
    expect(toIso(dayReference(new Date(2026, 10, 22, 0, 0)))).toBe('2026-11-21');
  });

  it('dayReference днём возвращает тот же объект, ночью — то же время суток раньше', () => {
    const day = new Date(2026, 10, 22, 12, 0);
    const shifted = dayReference(night);

    expect(dayReference(day)).toBe(day);
    expect([shifted.getHours(), shifted.getMinutes()]).toEqual([1, 58]);
  });

  it('промпт ночью: явная оговорка, «сегодня» — вчера, день не назван — календарный', () => {
    const prompt = buildSystemPrompt(night, 'Asia/Irkutsk');

    expect(prompt).toContain(
      'Сейчас: воскресенье, 22 ноября 2026, 01:58 (часовой пояс Asia/Irkutsk). Сейчас ночь: до 04:00 «сегодня» — это ещё вчерашний день, суббота, 21 ноября 2026 (2026-11-21); «завтра», «послезавтра» и дни недели считай от него.',
    );
    expect(prompt).toContain('  - день не назван — 2026-11-22 (ночь: ближайший календарный день);');
    expect(prompt).toContain('«сегодня» — 2026-11-21, «завтра» — 2026-11-22, «послезавтра» — 2026-11-23;');
    expect(prompt).toContain('2026-11-21 — суббота (сегодня)\n2026-11-22 — воскресенье (завтра)\n2026-11-23 — понедельник (послезавтра)');
    expect(prompt).toContain('2026-12-05 — суббота\n');
    expect(prompt).not.toContain('2026-12-06');
  });

  it('03:59 — ночь, 04:00 — уже день', () => {
    expect(buildSystemPrompt(new Date(2026, 10, 22, 3, 59), 'UTC')).toContain('Сейчас ночь: до 04:00');
    const morning = buildSystemPrompt(new Date(2026, 10, 22, 4, 0), 'UTC');

    expect(morning).not.toContain('Сейчас ночь');
    expect(morning).toContain('04:00 (часовой пояс UTC). Сегодня — 2026-11-22.');
    expect(morning).toContain('2026-11-22 — воскресенье (сегодня)');
  });

  it('полночь: «сегодня» — прошлый день', () => {
    const prompt = buildSystemPrompt(new Date(2026, 10, 22, 0, 0), 'UTC');

    expect(prompt).toContain('00:00 (часовой пояс UTC). Сейчас ночь');
    expect(prompt).toContain('2026-11-21 — суббота (сегодня)');
  });

  it('переход месяца и года: 1 января 01:00 — «сегодня» 31 декабря прошлого года', () => {
    const prompt = buildSystemPrompt(new Date(2027, 0, 1, 1, 0), 'UTC');

    expect(prompt).toContain('Сейчас: пятница, 1 января 2027, 01:00');
    expect(prompt).toContain('вчерашний день, четверг, 31 декабря 2026 (2026-12-31)');
    expect(prompt).toContain('  - день не назван — 2027-01-01 (ночь: ближайший календарный день);');
    expect(prompt).toContain('2026-12-31 — четверг (сегодня)\n2027-01-01 — пятница (завтра)');
  });

  it('переход месяца: 1 декабря 02:00 — «сегодня» 30 ноября', () => {
    expect(buildSystemPrompt(new Date(2026, 11, 1, 2, 0), 'UTC')).toContain('2026-11-30 — понедельник (сегодня)');
  });

  it('chrono ночью: «завтра» — календарный сегодняшний день', () => {
    expect(checkDateWithChrono('завтра маникюр', '2026-11-22', dayReference(night))).toMatchObject({
      date: '2026-11-22',
      agrees: true,
    });
  });

  it('дни недели ночью — от вчерашнего дня: в воскресенье ночью «в воскресенье» — сегодняшнее календарное', () => {
    const reference = dayReference(night);

    expect(checkDateWithChrono('в воскресенье стрижка', '2026-11-22', reference)).toMatchObject({ date: '2026-11-22' });
    // «В субботу» от субботы — через 7 дней.
    expect(checkDateWithChrono('в субботу стрижка', '2026-11-28', reference)).toMatchObject({
      date: '2026-11-28',
      agrees: true,
    });
    expect(checkDateWithChrono('сегодня стрижка', '2026-11-21', reference)).toMatchObject({ date: '2026-11-21' });
  });

  it('interpretReply сверяет ночью от сдвинутого момента', () => {
    const result = interpretReply(
      reply([{ name: 'add_task', arguments: { heard: 'завтра маникюр', date: '2026-11-22', text: 'Маникюр' } }]),
      night,
    );

    expect(result).toMatchObject({ ok: true, chrono: { date: '2026-11-22', agrees: true }, toast: 'Добавлено: Маникюр — вс, 22 ноября' });
  });

  it('новогодняя ночь: год в сообщении — по календарной дате, а не по сдвинутой', () => {
    const result = interpretReply(
      reply([{ name: 'add_task', arguments: { heard: '1 января ёлка', date: '2027-01-01', text: 'Ёлка' } }]),
      new Date(2027, 0, 1, 1, 0),
    );

    expect(result).toMatchObject({ ok: true, chrono: { date: '2027-01-01', agrees: true }, toast: 'Добавлено: Ёлка — пт, 1 января' });
  });

  it('ночью «22 ноября» и «21 ноября» — как названо', () => {
    const reference = dayReference(night);

    expect(checkDateWithChrono('22 ноября маникюр', '2026-11-22', reference)).toMatchObject({ date: '2026-11-22', agrees: true });
    expect(checkDateWithChrono('21 ноября маникюр', '2026-11-21', reference)).toMatchObject({ date: '2026-11-21', agrees: true });
  });
});

describe('ADD_TASK_TOOL', () => {
  it('описывает add_task с полями heard, date, time, text; time необязателен', () => {
    expect(ADD_TASK_TOOL.name).toBe('add_task');
    expect(Object.keys(ADD_TASK_TOOL.parameters.properties)).toEqual(['heard', 'date', 'time', 'text']);
    expect(ADD_TASK_TOOL.parameters.required).toEqual(['heard', 'date', 'text']);
  });

  it('сериализуется в JSON без потерь', () => {
    expect(JSON.parse(JSON.stringify(ADD_TASK_TOOL))).toEqual(ADD_TASK_TOOL);
  });
});

describe('parseAddTaskArgs', () => {
  const valid = { heard: 'в понедельник маникюр в 12', date: '2026-11-23', time: '12:00', text: 'Маникюр' };

  it('принимает полный набор', () => {
    expect(parseAddTaskArgs(valid)).toEqual({ ok: true, value: valid });
  });

  it('время не передано, null или пустое — null', () => {
    const { time: _time, ...withoutTime } = valid;

    expect(parseAddTaskArgs(withoutTime)).toEqual({ ok: true, value: { ...withoutTime, time: null } });
    expect(parseAddTaskArgs({ ...valid, time: null })).toMatchObject({ ok: true, value: { time: null } });
    expect(parseAddTaskArgs({ ...valid, time: '' })).toMatchObject({ ok: true, value: { time: null } });
  });

  it('время Ч:ММ дополняется нулём, границы суток принимаются', () => {
    expect(parseAddTaskArgs({ ...valid, time: '7:05' })).toMatchObject({ value: { time: '07:05' } });
    expect(parseAddTaskArgs({ ...valid, time: '00:00' })).toMatchObject({ value: { time: '00:00' } });
    expect(parseAddTaskArgs({ ...valid, time: '23:59' })).toMatchObject({ value: { time: '23:59' } });
  });

  it('время вне суток или не по формату — ошибка', () => {
    for (const time of ['24:00', '12:60', '12', '12-00', 'полдень', 12]) {
      expect(parseAddTaskArgs({ ...valid, time })).toEqual({
        ok: false,
        error: `Модель вернула неверное время: «${String(time)}»`,
      });
    }
  });

  it('дата не по формату или несуществующая — ошибка', () => {
    for (const date of ['23.11.2026', '2026-11-31', '2026-02-29', '', undefined, 20261123]) {
      expect(parseAddTaskArgs({ ...valid, date })).toEqual({
        ok: false,
        error: `Модель вернула неверную дату: «${String(date)}»`,
      });
    }
  });

  it('пустой или не строковый текст — ошибка', () => {
    for (const text of ['', '   ', '.', undefined, 5]) {
      expect(parseAddTaskArgs({ ...valid, text })).toEqual({ ok: false, error: 'Модель вернула пустой текст задачи' });
    }
  });

  it('текст обрезается, точка в конце убирается, первая буква заглавная', () => {
    expect(parseAddTaskArgs({ ...valid, text: '  маникюр у Оли. ' })).toMatchObject({ value: { text: 'Маникюр у Оли' } });
    expect(parseAddTaskArgs({ ...valid, text: 'ёлка' })).toMatchObject({ value: { text: 'Ёлка' } });
  });

  it('heard необязателен, но если передан — строкой', () => {
    expect(parseAddTaskArgs({ date: valid.date, text: 'Маникюр' })).toMatchObject({ ok: true, value: { heard: '' } });
    expect(parseAddTaskArgs({ ...valid, heard: 42 })).toEqual({
      ok: false,
      error: 'Модель вернула услышанную фразу не строкой',
    });
  });

  it('не объект — ошибка', () => {
    for (const raw of [null, 'add_task', 1, [valid]]) {
      expect(parseAddTaskArgs(raw)).toEqual({ ok: false, error: 'Модель вернула аргументы не объектом' });
    }
  });
});

describe('recordingProblem', () => {
  const tooShort = 'Слишком короткое нажатие: удерживайте кнопку, пока говорите';
  const silence = 'Не слышно речи: говорите ближе к телефону';

  it('граница пика: 299 — тишина, 300 — годится', () => {
    expect(recordingProblem(4000, 299)).toBe(silence);
    expect(recordingProblem(4000, 300)).toBeNull();
  });

  it('граница длительности: 499 мс — коротко, 500 мс — годится', () => {
    expect(recordingProblem(499, 20000)).toBe(tooShort);
    expect(recordingProblem(500, 20000)).toBeNull();
  });

  it('короткое и тихое — причина в нажатии', () => {
    expect(recordingProblem(200, 8)).toBe(tooShort);
  });

  it('тишина эмулятора (пик 8) и полный уровень', () => {
    expect(recordingProblem(4000, 8)).toBe(silence);
    expect(recordingProblem(30000, 32768)).toBeNull();
  });
});

describe('taskText', () => {
  it('без времени — текст как есть', () => {
    expect(taskText('Маникюр', null)).toBe('Маникюр');
  });

  it('ровный час — без минут, без ведущего нуля', () => {
    expect(taskText('Маникюр', '12:00')).toBe('Маникюр в 12');
    expect(taskText('Пробежка', '07:00')).toBe('Пробежка в 7');
    expect(taskText('Сон', '00:00')).toBe('Сон в 0');
  });

  it('ненулевые минуты — с минутами', () => {
    expect(taskText('Маникюр', '12:30')).toBe('Маникюр в 12:30');
    expect(taskText('Автобус', '09:05')).toBe('Автобус в 9:05');
  });
});

describe('successMessage', () => {
  it('день недели и дата без года в текущем году', () => {
    expect(successMessage('Маникюр в 12', '2026-11-23', '2026-11-21')).toBe('Добавлено: Маникюр в 12 — пн, 23 ноября');
  });

  it('с годом, если год другой', () => {
    expect(successMessage('Ёлка', '2027-01-01', '2026-12-30')).toBe('Добавлено: Ёлка — пт, 1 января 2027');
  });
});

describe('checkDateWithChrono', () => {
  it('день недели совпал с моделью', () => {
    expect(checkDateWithChrono('в понедельник маникюр в 12', '2026-11-23', SATURDAY)).toEqual({
      found: true,
      matched: 'в понедельник',
      date: '2026-11-23',
      agrees: true,
    });
  });

  it('расхождение с моделью отмечается', () => {
    expect(checkDateWithChrono('завтра купить хлеб', '2026-11-23', SATURDAY)).toEqual({
      found: true,
      matched: 'завтра',
      date: '2026-11-22',
      agrees: false,
    });
  });

  it('сегодняшний день недели — через неделю, как в правиле промпта, утром и вечером', () => {
    // Сам chrono-node утром отдал бы сегодняшний понедельник, вечером — следующий.
    expect(checkDateWithChrono('в понедельник встреча', '2026-11-30', MONDAY)).toMatchObject({
      date: '2026-11-30',
      agrees: true,
    });
    expect(checkDateWithChrono('в понедельник встреча', '2026-11-30', new Date(2026, 10, 23, 21, 0))).toMatchObject({
      date: '2026-11-30',
      agrees: true,
    });
  });

  it('«сегодня» с явным днём не сдвигается', () => {
    expect(checkDateWithChrono('сегодня в 18 позвонить', '2026-11-23', MONDAY)).toMatchObject({
      found: true,
      date: '2026-11-23',
      agrees: true,
    });
  });

  it('число месяца', () => {
    expect(checkDateWithChrono('25 ноября день рождения', '2026-11-25', SATURDAY)).toMatchObject({
      found: true,
      date: '2026-11-25',
      agrees: true,
    });
  });

  it('только время без дня — не сверяется', () => {
    expect(checkDateWithChrono('маникюр в 12', '2026-11-21', SATURDAY)).toEqual({
      found: false,
      matched: 'в 12',
      date: null,
      agrees: null,
    });
  });

  it('без даты и времени или пустая фраза — не сверяется', () => {
    const none = { found: false, matched: null, date: null, agrees: null };

    expect(checkDateWithChrono('купить молоко', '2026-11-21', SATURDAY)).toEqual(none);
    expect(checkDateWithChrono('', '2026-11-21', SATURDAY)).toEqual(none);
  });
});

describe('interpretReply', () => {
  it('вызов add_task → задача, сверка и сообщение', () => {
    const result = interpretReply(
      reply([
        {
          name: 'add_task',
          arguments: { heard: 'в понедельник маникюр в 12', date: '2026-11-23', time: '12:00', text: 'маникюр' },
        },
      ]),
      SATURDAY,
    );

    expect(result).toEqual({
      ok: true,
      args: { heard: 'в понедельник маникюр в 12', date: '2026-11-23', time: '12:00', text: 'Маникюр' },
      chrono: { found: true, matched: 'в понедельник', date: '2026-11-23', agrees: true },
      task: { text: 'Маникюр в 12', date: '2026-11-23', priority: 'medium', recurrence: 'none' },
      toast: 'Добавлено: Маникюр в 12 — пн, 23 ноября',
    });
  });

  it('расхождение с chrono не мешает сохранению по дате модели', () => {
    const result = interpretReply(
      reply([{ name: 'add_task', arguments: { heard: 'завтра хлеб', date: '2026-11-21', text: 'Хлеб' } }]),
      SATURDAY,
    );

    expect(result).toMatchObject({ ok: true, chrono: { agrees: false }, task: { date: '2026-11-21', text: 'Хлеб' } });
  });

  it('берётся первый add_task среди всех сообщений', () => {
    const messages: ModelMessage[] = [
      { role: 'assistant', text: '', toolCalls: [{ name: 'other', arguments: {} }], channels: {} },
      ...reply([
        { name: 'add_task', arguments: { heard: '', date: '2026-11-22', text: 'Первая' } },
        { name: 'add_task', arguments: { heard: '', date: '2026-11-23', text: 'Вторая' } },
      ]),
    ];

    expect(interpretReply(messages, SATURDAY)).toMatchObject({ ok: true, task: { text: 'Первая' } });
  });

  it('нет вызова — «Не понял» с ответом модели, длинный обрезается', () => {
    expect(interpretReply(reply([], ' Я  услышал\nшум '), SATURDAY)).toEqual({
      ok: false,
      error: 'Не понял: «Я услышал шум»',
      rawArgs: null,
    });

    const long = 'а'.repeat(100);
    const result = interpretReply(reply([], long), SATURDAY);

    expect(result).toEqual({ ok: false, error: `Не понял: «${'а'.repeat(79)}…»`, rawArgs: null });
  });

  it('ровно 80 символов не обрезается', () => {
    expect(interpretReply(reply([], 'б'.repeat(80)), SATURDAY)).toMatchObject({ error: `Не понял: «${'б'.repeat(80)}»` });
  });

  it('пустой ответ и чужой инструмент', () => {
    expect(interpretReply([], SATURDAY)).toEqual({
      ok: false,
      error: 'Не понял: модель ничего не ответила',
      rawArgs: null,
    });
    expect(interpretReply(reply([{ name: 'delete_task', arguments: {} }]), SATURDAY)).toEqual({
      ok: false,
      error: 'Не понял: модель вызвала неизвестный инструмент delete_task',
      rawArgs: null,
    });
  });

  it('неверные аргументы — ошибка с сырыми аргументами', () => {
    const args = { heard: 'маникюр', date: 'завтра', text: 'Маникюр' };

    expect(interpretReply(reply([{ name: 'add_task', arguments: args }]), SATURDAY)).toEqual({
      ok: false,
      error: 'Модель вернула неверную дату: «завтра»',
      rawArgs: args,
    });
  });
});

describe('formatTimestamp', () => {
  it('локальное время со смещением зоны стенда (America/New_York, зимой −05:00)', () => {
    expect(formatTimestamp(SATURDAY)).toBe('2026-11-21T19:30:05.007-05:00');
  });

  it('летом смещение −04:00', () => {
    expect(formatTimestamp(new Date(2026, 6, 1, 0, 0, 0, 0))).toBe('2026-07-01T00:00:00.000-04:00');
  });

  describe('восточная зона с получасовым смещением', () => {
    let standZone: string | undefined;

    beforeEach(() => {
      standZone = process.env.TZ;
      process.env.TZ = 'Asia/Kolkata';
    });

    afterEach(() => {
      // Присваивание undefined записало бы строку 'undefined', поэтому отсутствующую зону удаляем.
      if (standZone === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = standZone;
      }
    });

    it('смещение +05:30', () => {
      expect(formatTimestamp(new Date(2026, 10, 21, 23, 59, 59, 999))).toBe('2026-11-21T23:59:59.999+05:30');
    });
  });
});
