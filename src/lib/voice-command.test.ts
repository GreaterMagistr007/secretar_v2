import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ADD_TASK_TOOL,
  addedMessage,
  buildBasePrompt,
  buildPressMessage,
  checkDateWithChrono,
  dayReference,
  formatTimestamp,
  interpretReply,
  nextPromptDayChange,
  parseAddTaskArgs,
  promptDayKey,
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

describe('buildBasePrompt', () => {
  const prompt = buildBasePrompt(SATURDAY, 'Europe/Moscow');

  it('называет сегодняшний день и часовой пояс, без времени суток', () => {
    expect(prompt).toContain('Сейчас: суббота, 21 ноября 2026 (часовой пояс Europe/Moscow). Сегодня — 2026-11-21.');
    expect(prompt).not.toContain('19:30');
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
    expect(prompt).toContain(
      'вызови инструмент add_task. Один вызов — одна задача на один день; если дней или дел несколько («в понедельник и в среду бассейн»), после ответа инструмента вызови add_task снова — для следующего дня или дела. Когда все задачи добавлены, ответь одним словом: Готово.',
    );
    expect(prompt).not.toContain('один раз');
  });

  it('переходит через конец месяца и года', () => {
    const december = buildBasePrompt(new Date(2026, 11, 30, 23, 59), 'Asia/Yekaterinburg');

    expect(december).toContain('Сейчас: среда, 30 декабря 2026 (часовой пояс Asia/Yekaterinburg)');
    expect(december).toContain('2026-12-31 — четверг (завтра)\n2027-01-01 — пятница (послезавтра)');
    expect(december).toContain('2027-01-13 — среда');
  });

  it('один текст на весь день промпта: от 04:00 до 23:59 и от 00:00 до 03:59', () => {
    const day = buildBasePrompt(new Date(2026, 10, 22, 4, 0), 'UTC');

    expect(buildBasePrompt(new Date(2026, 10, 22, 12, 34), 'UTC')).toBe(day);
    expect(buildBasePrompt(new Date(2026, 10, 22, 23, 59, 59, 999), 'UTC')).toBe(day);
    expect(buildBasePrompt(new Date(2026, 10, 23, 3, 59), 'UTC')).toBe(buildBasePrompt(new Date(2026, 10, 23, 0, 0), 'UTC'));
  });

  it('меняется на границах 00:00 и 04:00 и при смене часового пояса', () => {
    const late = buildBasePrompt(new Date(2026, 10, 22, 23, 59), 'UTC');
    const midnight = buildBasePrompt(new Date(2026, 10, 23, 0, 0), 'UTC');
    const night = buildBasePrompt(new Date(2026, 10, 23, 3, 59), 'UTC');
    const morning = buildBasePrompt(new Date(2026, 10, 23, 4, 0), 'UTC');

    expect(midnight).not.toBe(late);
    expect(morning).not.toBe(night);
    expect(buildBasePrompt(new Date(2026, 10, 22, 12, 0), 'Europe/Moscow')).not.toBe(
      buildBasePrompt(new Date(2026, 10, 22, 12, 0), 'UTC'),
    );
  });
});

describe('buildPressMessage', () => {
  it('время нажатия ЧЧ:ММ и указание на запись', () => {
    expect(buildPressMessage(SATURDAY)).toBe('Сейчас 19:30. Команда пользователя — в аудиозаписи.');
  });

  it('полночь — 00:00, ведущие нули', () => {
    expect(buildPressMessage(new Date(2026, 0, 1, 0, 0))).toBe('Сейчас 00:00. Команда пользователя — в аудиозаписи.');
    expect(buildPressMessage(new Date(2026, 0, 1, 9, 5))).toBe('Сейчас 09:05. Команда пользователя — в аудиозаписи.');
    expect(buildPressMessage(new Date(2026, 0, 1, 23, 59, 59))).toBe('Сейчас 23:59. Команда пользователя — в аудиозаписи.');
  });
});

describe('promptDayKey', () => {
  it('граница 04:00: 03:59 — ночь, 04:00 — день той же даты', () => {
    expect(promptDayKey(new Date(2026, 10, 22, 3, 59, 59, 999))).toBe('2026-11-22 ночь');
    expect(promptDayKey(new Date(2026, 10, 22, 4, 0))).toBe('2026-11-22 день');
  });

  it('граница полуночи: 23:59 — день, 00:00 — ночь следующей даты', () => {
    expect(promptDayKey(new Date(2026, 10, 22, 23, 59, 59, 999))).toBe('2026-11-22 день');
    expect(promptDayKey(new Date(2026, 10, 23, 0, 0))).toBe('2026-11-23 ночь');
  });

  it('переход года', () => {
    expect(promptDayKey(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31 день');
    expect(promptDayKey(new Date(2027, 0, 1, 0, 0))).toBe('2027-01-01 ночь');
  });
});

describe('nextPromptDayChange', () => {
  it('ночью — 04:00 тех же суток', () => {
    expect(nextPromptDayChange(new Date(2026, 10, 22, 0, 0))).toEqual(new Date(2026, 10, 22, 4, 0));
    expect(nextPromptDayChange(new Date(2026, 10, 22, 3, 59, 59, 999))).toEqual(new Date(2026, 10, 22, 4, 0));
  });

  it('днём — следующая полночь, в том числе ровно в 04:00 и в 23:59', () => {
    expect(nextPromptDayChange(new Date(2026, 10, 22, 4, 0))).toEqual(new Date(2026, 10, 23, 0, 0));
    expect(nextPromptDayChange(new Date(2026, 10, 22, 23, 59, 59, 999))).toEqual(new Date(2026, 10, 23, 0, 0));
    expect(nextPromptDayChange(new Date(2026, 11, 31, 12, 0))).toEqual(new Date(2027, 0, 1, 0, 0));
  });

  it('на смене ключ уже другой, за миллисекунду до неё — прежний', () => {
    for (const now of [new Date(2026, 10, 22, 1, 0), new Date(2026, 10, 22, 15, 0)]) {
      const change = nextPromptDayChange(now);

      expect(promptDayKey(change)).not.toBe(promptDayKey(now));
      expect(promptDayKey(new Date(change.getTime() - 1))).toBe(promptDayKey(now));
    }
  });
});

describe('ночное правило', () => {
  /** Воскресенье, 22 ноября 2026, 01:58 — пример владельца. */
  const night = new Date(2026, 10, 22, 1, 58);

  /** Пример владельца: 03:00 22 ноября. */
  const three = new Date(2026, 10, 22, 3, 0);

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

  it('промпт ночью: «сегодня», «завтра» и день без названия — D, «послезавтра» — D+1, календарь с D', () => {
    const prompt = buildBasePrompt(night, 'Asia/Irkutsk');

    expect(prompt).toContain(
      'Сейчас: воскресенье, 22 ноября 2026 (часовой пояс Asia/Irkutsk). Сегодня — 2026-11-22. Сейчас ночь, до 04:00: «завтра» ночью говорят о наступивших сутках, поэтому «завтра» — тоже 2026-11-22, а «послезавтра» — 2026-11-23.',
    );
    expect(prompt).toContain('  - день не назван — сегодня, 2026-11-22;');
    expect(prompt).toContain('«сегодня» — 2026-11-22, «завтра» — 2026-11-22, «послезавтра» — 2026-11-23;');
    expect(prompt).toContain('2026-11-22 — воскресенье (сегодня и завтра)\n2026-11-23 — понедельник (послезавтра)\n2026-11-24 — вторник\n');
    expect(prompt).not.toContain('2026-11-21 —');
    expect(prompt).toContain('2026-12-06 — воскресенье\n');
    expect(prompt).not.toContain('2026-12-07');
  });

  it('промпт ночью: дни недели — не раньше сегодняшнего, «через N дней» — как днём, от сегодняшнего', () => {
    const prompt = buildBasePrompt(night, 'Asia/Irkutsk');

    expect(prompt).toContain(
      '  - день недели («в понедельник», «в пятницу», «в следующий вторник») — ближайший такой день не раньше сегодняшнего: ночью сегодняшний день недели — это сегодня, 2026-11-22;',
    );
    expect(prompt).toContain('  - «через неделю» — через 7 дней, «через N дней» — через N дней.');
    expect(prompt).not.toContain('тот же день следующей недели');
  });

  it('03:59 — ночь, 04:00 — уже день', () => {
    expect(buildBasePrompt(new Date(2026, 10, 22, 3, 59), 'UTC')).toContain('Сейчас ночь, до 04:00');
    const morning = buildBasePrompt(new Date(2026, 10, 22, 4, 0), 'UTC');

    expect(morning).not.toContain('Сейчас ночь');
    expect(morning).toContain('2026 (часовой пояс UTC). Сегодня — 2026-11-22.\n');
    expect(morning).toContain('2026-11-22 — воскресенье (сегодня)\n2026-11-23 — понедельник (завтра)');
    expect(morning).toContain('«сегодня» — 2026-11-22, «завтра» — 2026-11-23, «послезавтра» — 2026-11-24;');
  });

  it('полночь: уже ночь новой даты, «завтра» — она же', () => {
    const prompt = buildBasePrompt(new Date(2026, 10, 22, 0, 0), 'UTC');

    expect(prompt).toContain('Сегодня — 2026-11-22. Сейчас ночь');
    expect(prompt).toContain('2026-11-22 — воскресенье (сегодня и завтра)');
  });

  it('ночь 1 января: «завтра» — 1 января, «послезавтра» — 2 января', () => {
    const prompt = buildBasePrompt(new Date(2027, 0, 1, 1, 0), 'UTC');

    expect(prompt).toContain('Сейчас: пятница, 1 января 2027 (часовой пояс UTC). Сегодня — 2027-01-01.');
    expect(prompt).toContain('«сегодня» — 2027-01-01, «завтра» — 2027-01-01, «послезавтра» — 2027-01-02;');
    expect(prompt).toContain('2027-01-01 — пятница (сегодня и завтра)\n2027-01-02 — суббота (послезавтра)');
  });

  it('chrono в 03:00: «сегодня в 4» и «завтра в 4» — D, без ложного расхождения', () => {
    expect(checkDateWithChrono('сегодня в 4 позвонить маме', '2026-11-22', three)).toMatchObject({
      found: true,
      date: '2026-11-22',
      agrees: true,
    });
    expect(checkDateWithChrono('завтра в 4 позвонить маме', '2026-11-22', three)).toMatchObject({
      found: true,
      date: '2026-11-22',
      agrees: true,
    });
  });

  it('chrono ночью: «послезавтра» — D+1, на границе 03:59 так же, в 04:00 — по дневному правилу', () => {
    expect(checkDateWithChrono('послезавтра хлеб', '2026-11-23', new Date(2026, 10, 22, 3, 59))).toMatchObject({
      date: '2026-11-23',
      agrees: true,
    });
    expect(checkDateWithChrono('сегодня хлеб', '2026-11-22', new Date(2026, 10, 22, 0, 0))).toMatchObject({
      date: '2026-11-22',
      agrees: true,
    });
    expect(checkDateWithChrono('завтра хлеб', '2026-11-23', new Date(2026, 10, 22, 4, 0))).toMatchObject({
      date: '2026-11-23',
      agrees: true,
    });
    expect(checkDateWithChrono('сегодня хлеб', '2026-11-22', new Date(2026, 10, 22, 4, 0))).toMatchObject({
      date: '2026-11-22',
      agrees: true,
    });
  });

  it('chrono ночью: дни недели — от прошлых суток (воскресенье ночью «в воскресенье» — сегодня, «в субботу» — через неделю)', () => {
    expect(checkDateWithChrono('в воскресенье стрижка', '2026-11-22', night)).toMatchObject({ date: '2026-11-22', agrees: true });
    expect(checkDateWithChrono('в субботу стрижка', '2026-11-28', night)).toMatchObject({ date: '2026-11-28', agrees: true });
    expect(checkDateWithChrono('в понедельник стрижка', '2026-11-23', night)).toMatchObject({ date: '2026-11-23', agrees: true });
  });

  it('chrono ночью: названное число прошлых суток приводится к сегодняшнему (прошедшего дня нет)', () => {
    expect(checkDateWithChrono('22 ноября маникюр', '2026-11-22', night)).toMatchObject({ date: '2026-11-22', agrees: true });
    expect(checkDateWithChrono('21 ноября маникюр', '2026-11-22', night)).toMatchObject({ date: '2026-11-22' });
  });

  it('interpretReply ночью: «сегодня в 4» — D, сообщение по календарной дате', () => {
    const result = interpretReply(
      reply([{ name: 'add_task', arguments: { heard: 'сегодня в 4 позвонить маме', date: '2026-11-22', time: '04:00', text: 'Позвонить маме' } }]),
      three,
    );

    expect(result).toMatchObject({
      ok: true,
      accepted: [{ chrono: { date: '2026-11-22', agrees: true }, task: { text: 'Позвонить маме в 4', date: '2026-11-22' } }],
      toast: 'Добавлено: Позвонить маме в 4 — вс, 22 ноября',
    });
  });

  it('новогодняя ночь: «завтра» — 1 января, год в сообщении — по календарной дате', () => {
    const result = interpretReply(
      reply([{ name: 'add_task', arguments: { heard: 'завтра ёлка', date: '2027-01-01', text: 'Ёлка' } }]),
      new Date(2027, 0, 1, 1, 0),
    );

    expect(result).toMatchObject({
      ok: true,
      accepted: [{ chrono: { date: '2027-01-01', agrees: true } }],
      toast: 'Добавлено: Ёлка — пт, 1 января',
    });
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

describe('addedMessage', () => {
  const today = '2026-11-21';

  it('одна задача — как successMessage', () => {
    expect(addedMessage([{ text: 'Маникюр в 12', date: '2026-11-23' }], today, 0)).toBe(
      successMessage('Маникюр в 12', '2026-11-23', today),
    );
  });

  it('одинаковый текст — текст один раз, дни через «; »', () => {
    expect(
      addedMessage(
        [
          { text: 'Заехать в берёзовый', date: '2026-11-24' },
          { text: 'Заехать в берёзовый', date: '2026-11-25' },
        ],
        today,
        0,
      ),
    ).toBe('Добавлено: Заехать в берёзовый — вт, 24 ноября; ср, 25 ноября');
  });

  it('разный текст — «текст — день» через «; », три задачи, год у будущего года', () => {
    expect(
      addedMessage(
        [
          { text: 'Маникюр в 12', date: '2026-11-23' },
          { text: 'Хлеб', date: '2026-11-21' },
          { text: 'Ёлка', date: '2027-01-01' },
        ],
        today,
        0,
      ),
    ).toBe('Добавлено: Маникюр в 12 — пн, 23 ноября; Хлеб — сб, 21 ноября; Ёлка — пт, 1 января 2027');
  });

  it('отклонённые вызовы — в конце «, не понял: N»', () => {
    expect(addedMessage([{ text: 'Хлеб', date: '2026-11-22' }], today, 1)).toBe('Добавлено: Хлеб — вс, 22 ноября, не понял: 1');
    expect(
      addedMessage(
        [
          { text: 'Хлеб', date: '2026-11-22' },
          { text: 'Хлеб', date: '2026-11-23' },
        ],
        today,
        2,
      ),
    ).toBe('Добавлено: Хлеб — вс, 22 ноября; пн, 23 ноября, не понял: 2');
  });
});

describe('interpretReply', () => {
  it('один вызов add_task → задача, сверка и сообщение', () => {
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
      accepted: [
        {
          args: { heard: 'в понедельник маникюр в 12', date: '2026-11-23', time: '12:00', text: 'Маникюр' },
          chrono: { found: true, matched: 'в понедельник', date: '2026-11-23', agrees: true },
          task: { text: 'Маникюр в 12', date: '2026-11-23', priority: 'medium', recurrence: 'none' },
        },
      ],
      rejected: [],
      toast: 'Добавлено: Маникюр в 12 — пн, 23 ноября',
    });
  });

  it('расхождение с chrono не мешает сохранению по дате модели', () => {
    const result = interpretReply(
      reply([{ name: 'add_task', arguments: { heard: 'завтра хлеб', date: '2026-11-21', text: 'Хлеб' } }]),
      SATURDAY,
    );

    expect(result).toMatchObject({
      ok: true,
      accepted: [{ chrono: { agrees: false }, task: { date: '2026-11-21', text: 'Хлеб' } }],
    });
  });

  it('два вызова с одинаковым текстом — две задачи, сверка по каждому, дни в одном сообщении', () => {
    const heard = 'во вторник и в среду надо заехать в берёзовый';
    const result = interpretReply(
      reply([
        { name: 'add_task', arguments: { heard, date: '2026-11-24', text: 'Заехать в берёзовый' } },
        { name: 'add_task', arguments: { heard, date: '2026-11-25', text: 'Заехать в берёзовый' } },
      ]),
      new Date(2026, 10, 22, 14, 4),
    );

    expect(result).toMatchObject({
      ok: true,
      accepted: [
        { task: { text: 'Заехать в берёзовый', date: '2026-11-24' }, chrono: { date: '2026-11-24', agrees: true } },
        // chrono-node берёт из фразы первый день — сверка второго вызова расходится и только пишется в журнал.
        { task: { text: 'Заехать в берёзовый', date: '2026-11-25' }, chrono: { date: '2026-11-24', agrees: false } },
      ],
      rejected: [],
      toast: 'Добавлено: Заехать в берёзовый — вт, 24 ноября; ср, 25 ноября',
    });
  });

  it('три вызова с разным текстом — все задачи по порядку, сообщение перечислением', () => {
    const result = interpretReply(
      reply([
        { name: 'add_task', arguments: { heard: 'х', date: '2026-11-22', text: 'Хлеб' } },
        { name: 'add_task', arguments: { heard: 'х', date: '2026-11-23', time: '12:00', text: 'Маникюр' } },
        { name: 'add_task', arguments: { heard: 'х', date: '2026-11-24', text: 'Бассейн' } },
      ]),
      SATURDAY,
    );

    expect(result.ok && result.accepted.map((item) => item.task.text)).toEqual(['Хлеб', 'Маникюр в 12', 'Бассейн']);
    expect(result).toMatchObject({
      toast: 'Добавлено: Хлеб — вс, 22 ноября; Маникюр в 12 — пн, 23 ноября; Бассейн — вт, 24 ноября',
    });
  });

  it('вызовы из разных сообщений собираются, чужой инструмент пропускается', () => {
    const messages: ModelMessage[] = [
      { role: 'assistant', text: '', toolCalls: [{ name: 'other', arguments: {} }], channels: {} },
      ...reply([
        { name: 'add_task', arguments: { heard: '', date: '2026-11-22', text: 'Первая' } },
        { name: 'add_task', arguments: { heard: '', date: '2026-11-23', text: 'Вторая' } },
      ]),
    ];
    const result = interpretReply(messages, SATURDAY);

    expect(result.ok && result.accepted.map((item) => item.task.text)).toEqual(['Первая', 'Вторая']);
  });

  it('повтор той же задачи (текст и день) пропускается, тот же текст на другой день — нет', () => {
    const result = interpretReply(
      reply([
        { name: 'add_task', arguments: { heard: 'х', date: '2026-11-23', text: 'Хлеб' } },
        { name: 'add_task', arguments: { heard: 'х', date: '2026-11-23', text: 'хлеб.' } },
        { name: 'add_task', arguments: { heard: 'х', date: '2026-11-24', text: 'Хлеб' } },
      ]),
      SATURDAY,
    );

    expect(result).toMatchObject({ ok: true, rejected: [], toast: 'Добавлено: Хлеб — пн, 23 ноября; вт, 24 ноября' });
    expect(result.ok && result.accepted.length).toBe(2);
  });

  it('часть вызовов неверна — верные сохраняются, неверные в rejected, «не понял: N» в сообщении', () => {
    const bad = { heard: 'х', date: 'завтра', text: 'Хлеб' };
    const result = interpretReply(
      reply([
        { name: 'add_task', arguments: bad },
        { name: 'add_task', arguments: { heard: 'х', date: '2026-11-23', text: 'Молоко' } },
        { name: 'add_task', arguments: { heard: 'х', date: '2026-11-24', text: '' } },
      ]),
      SATURDAY,
    );

    expect(result).toEqual({
      ok: true,
      accepted: [expect.objectContaining({ task: expect.objectContaining({ text: 'Молоко', date: '2026-11-23' }) })],
      rejected: [
        { rawArgs: bad, error: 'Модель вернула неверную дату: «завтра»' },
        { rawArgs: { heard: 'х', date: '2026-11-24', text: '' }, error: 'Модель вернула пустой текст задачи' },
      ],
      toast: 'Добавлено: Молоко — пн, 23 ноября, не понял: 2',
    });
  });

  it('нет вызова — «Не понял» с ответом модели, длинный обрезается', () => {
    expect(interpretReply(reply([], ' Я  услышал\nшум '), SATURDAY)).toEqual({
      ok: false,
      error: 'Не понял: «Я услышал шум»',
      rejected: [],
    });

    const long = 'а'.repeat(100);
    const result = interpretReply(reply([], long), SATURDAY);

    expect(result).toEqual({ ok: false, error: `Не понял: «${'а'.repeat(79)}…»`, rejected: [] });
  });

  it('ровно 80 символов не обрезается', () => {
    expect(interpretReply(reply([], 'б'.repeat(80)), SATURDAY)).toMatchObject({ error: `Не понял: «${'б'.repeat(80)}»` });
  });

  it('пустой ответ и чужой инструмент', () => {
    expect(interpretReply([], SATURDAY)).toEqual({
      ok: false,
      error: 'Не понял: модель ничего не ответила',
      rejected: [],
    });
    expect(interpretReply(reply([{ name: 'delete_task', arguments: {} }]), SATURDAY)).toEqual({
      ok: false,
      error: 'Не понял: модель вызвала неизвестный инструмент delete_task',
      rejected: [],
    });
  });

  it('все вызовы неверны — ошибка первого, все в rejected', () => {
    const first = { heard: 'маникюр', date: 'завтра', text: 'Маникюр' };
    const second = { heard: 'маникюр', date: '2026-11-23', time: '25:00', text: 'Маникюр' };

    expect(
      interpretReply(
        reply([
          { name: 'add_task', arguments: first },
          { name: 'add_task', arguments: second },
        ]),
        SATURDAY,
      ),
    ).toEqual({
      ok: false,
      error: 'Модель вернула неверную дату: «завтра»',
      rejected: [
        { rawArgs: first, error: 'Модель вернула неверную дату: «завтра»' },
        { rawArgs: second, error: 'Модель вернула неверное время: «25:00»' },
      ],
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
