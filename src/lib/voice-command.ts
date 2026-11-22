/**
 * Голосовая команда «добавить задачу» (решения Р-34, Р-37): что видит модель и как разбирается
 * её ответ. Чистая логика без моста к нативной части — всё, что модель получает (системный
 * промпт, описание инструмента, текст к записи), собирается здесь, в одном месте, и покрыто
 * тестами. Нативная часть (VoicePlugin) только передаёт это модели.
 *
 * Описание — docs/mechanic_voice.md, раздел «Голосовая кнопка».
 */

import { parse as parseRussianDate } from 'chrono-node/ru';
import { formatLongDate, formatWeekdayDate, isIsoDate, toIsoDate } from './date';
import type { NewTask } from './tasks/types';

/** Нажатие короче этого в модель не отправляется: за полсекунды фразу не сказать. */
export const MIN_PRESS_MS = 500;

/**
 * Запись с пиковым уровнем ниже этого (из 32767, около −40 дБFS) в модель не отправляется:
 * на тишине модель выдумывает задачу (эмулятор: пик 8 → «Купить молоко»). Речь у телефона
 * даёт пик в тысячи. Порог уточняется по журналу владельца (`recording.peak`).
 */
export const MIN_PEAK = 300;

/** Запись обрезается на этой длительности — предел звука у модели. */
export const MAX_RECORD_MS = 30_000;

/** Тексты ошибок для всплывающего сообщения. */
export const VOICE_MESSAGES = {
  modelMissing: 'Модель не скачана: Настройки → Голос',
  microphoneDenied: 'Нет доступа к микрофону: разрешите его в настройках телефона',
  microphoneGranted: 'Микрофон разрешён. Удерживайте кнопку и говорите',
  tooShort: 'Слишком короткое нажатие: удерживайте кнопку, пока говорите',
  silence: 'Не слышно речи: говорите ближе к телефону',
} as const;

/**
 * Годится ли запись для модели: текст ошибки или null. Сначала длительность, затем уровень —
 * у короткого нажатия причина в нажатии, а не в тишине.
 */
export function recordingProblem(durationMs: number, peak: number): string | null {
  if (durationMs < MIN_PRESS_MS) {
    return VOICE_MESSAGES.tooShort;
  }

  return peak < MIN_PEAK ? VOICE_MESSAGES.silence : null;
}

/** Имя инструмента — его же ищет разбор ответа. */
export const ADD_TASK = 'add_task';

/**
 * Описание инструмента в формате OpenAPI, как его принимает LiteRT-LM (`OpenApiTool`).
 * `heard` стоит первым: модель сначала выписывает услышанное, потом выводит из него дату.
 */
export const ADD_TASK_TOOL = {
  name: ADD_TASK,
  description: 'Добавить задачу в список задач пользователя на указанный день.',
  parameters: {
    type: 'object',
    properties: {
      heard: {
        type: 'string',
        description: 'Фраза пользователя дословно, как она услышана, без исправлений.',
      },
      date: {
        type: 'string',
        description: 'День задачи в формате ГГГГ-ММ-ДД.',
      },
      time: {
        type: 'string',
        description: 'Время в формате ЧЧ:ММ; передаётся, только если время названо.',
      },
      text: {
        type: 'string',
        description: 'Суть задачи без даты и времени, с заглавной буквы.',
      },
    },
    required: ['heard', 'date', 'text'],
  },
} as const;

/** Текст, который идёт в сообщении пользователя вместе с записью. */
export const USER_TEXT = 'Команда пользователя — в аудиозаписи.';

/**
 * Час, до которого ночь ещё относится к прошлому дню (решение Р-38): в 01:58 22 ноября «сегодня» —
 * 21 ноября, «завтра» — 22 ноября.
 */
export const NIGHT_END_HOUR = 4;

/**
 * Момент, от которого считаются «сегодня», «завтра» и дни недели: до `NIGHT_END_HOUR` — то же время
 * прошлых суток, иначе сам `now`.
 */
export function dayReference(now: Date): Date {
  if (now.getHours() >= NIGHT_END_HOUR) {
    return now;
  }

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  );
}

/** Сколько дней вперёд, кроме сегодняшнего, показать модели в календаре промпта. */
const CALENDAR_DAYS = 14;

/** Дни недели по номеру `Date.getDay()`: воскресенье — 0. */
const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

/** Сколько символов ответа модели показывать в сообщении «Не понял». */
const REPLY_PREVIEW = 80;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Время ЧЧ:ММ по локальным полям. */
function clock(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Дата через `days` суток от `date` по локальному календарю. */
function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/**
 * Системный промпт на момент нажатия `now`: дата, время, день недели, часовой пояс телефона,
 * календарь на две недели (снимает с модели арифметику дней) и правила разбора.
 *
 * Ночное правило (решение Р-38): до `NIGHT_END_HOUR` «сегодня» — прошлый календарный день,
 * календарь, метки и дни недели — от него (`dayReference`); день не назван — ближайший календарный
 * день, то есть текущая календарная дата, а не прошедшая. Промпт говорит это модели явно.
 *
 * Правило дня недели: «в понедельник» — ближайший понедельник после сегодняшнего; если сегодня
 * понедельник — через неделю (решение по плану этапа 5, «следующий ближайший»). Сверка
 * `checkDateWithChrono` приводит `chrono-node` к тому же правилу.
 */
export function buildSystemPrompt(now: Date, timeZone: string): string {
  const reference = dayReference(now);
  const night = reference !== now;
  const today = toIsoDate(reference);
  const calendarToday = toIsoDate(now);
  const tomorrow = toIsoDate(addDays(reference, 1));
  const afterTomorrow = toIsoDate(addDays(reference, 2));
  const labels = ['сегодня', 'завтра', 'послезавтра'];
  const calendar: string[] = [];

  for (let offset = 0; offset <= CALENDAR_DAYS; offset += 1) {
    const day = addDays(reference, offset);
    const label = offset < labels.length ? ` (${labels[offset]})` : '';

    calendar.push(`${toIsoDate(day)} — ${WEEKDAYS[day.getDay()]}${label}`);
  }

  const spoken = `${WEEKDAYS[now.getDay()]}, ${formatLongDate(calendarToday)}`;
  const todayLine = night
    ? `Сейчас ночь: до ${pad(NIGHT_END_HOUR)}:00 «сегодня» — это ещё вчерашний день, ${WEEKDAYS[reference.getDay()]}, ${formatLongDate(today)} (${today}); «завтра», «послезавтра» и дни недели считай от него.`
    : `Сегодня — ${today}.`;

  return [
    'Ты разбираешь голосовые команды для задачника «Секретарь». В аудиозаписи пользователь по-русски говорит одну фразу — какое дело добавить в список задач и на какой день.',
    '',
    `Сейчас: ${spoken}, ${clock(now)} (часовой пояс ${timeZone}). ${todayLine}`,
    '',
    'Календарь на две недели вперёд:',
    ...calendar,
    '',
    `Если в фразе есть дело, вызови инструмент ${ADD_TASK} один раз. Аргументы:`,
    '- heard — фраза дословно, как ты её услышал, без исправлений и пересказа.',
    '- date — день задачи в формате ГГГГ-ММ-ДД:',
    night ? `  - день не назван — ${calendarToday} (ночь: ближайший календарный день);` : `  - день не назван — сегодня, ${today};`,
    `  - «сегодня» — ${today}, «завтра» — ${tomorrow}, «послезавтра» — ${afterTomorrow};`,
    '  - день недели («в понедельник», «в пятницу», «в следующий вторник») — ближайший такой день после сегодняшнего; если сегодня тот же день недели — тот же день следующей недели, через 7 дней;',
    '  - число месяца («25 ноября», «25-го») — ближайшая такая дата не раньше сегодняшней; если месяц не назван и это число в текущем месяце уже прошло — то же число следующего месяца;',
    '  - «через неделю» — через 7 дней, «через N дней» — через N дней.',
    '- time — время в формате ЧЧ:ММ, только если оно названо: «в 12» — 12:00, «в полдень» — 12:00, «в 7 вечера» — 19:00, «в 9 утра» — 09:00, «в 3 часа дня» — 15:00, «в половине восьмого» — 07:30, «в 18:30» — 18:30; без «утра», «дня» и «вечера» — как сказано: «в 7» — 07:00. Время не названо — аргумент time не передавай.',
    '- text — суть задачи без даты и времени, с заглавной буквы, словами пользователя: «в понедельник маникюр в 12» → «Маникюр».',
    '',
    `Если фраза пустая, неразборчивая или в ней нет дела, инструмент не вызывай, а ответь одной строкой, что ты услышал.`,
  ].join('\n');
}

/** Аргументы вызова `add_task` после проверки. */
export interface AddTaskArgs {
  heard: string;
  date: string;
  /** ЧЧ:ММ; null — время не названо. */
  time: string | null;
  text: string;
}

export type ArgsResult = { ok: true; value: AddTaskArgs } | { ok: false; error: string };

/** Время Ч:ММ или ЧЧ:ММ в пределах суток, приводится к ЧЧ:ММ; иначе null. */
function normalizeTime(value: string): string | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());

  if (match === null) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  return hours <= 23 && minutes <= 59 ? `${pad(hours)}:${match[2]}` : null;
}

/**
 * Проверяет аргументы вызова от модели. Текст обрезается по краям, с конца убирается точка,
 * первая буква делается заглавной. `heard` необязателен для сохранения (пустой — сверка дат
 * пропускается), но если передан — должен быть строкой.
 */
export function parseAddTaskArgs(raw: unknown): ArgsResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: 'Модель вернула аргументы не объектом' };
  }

  const data = raw as Record<string, unknown>;
  const heard = data.heard ?? '';

  if (typeof heard !== 'string') {
    return { ok: false, error: 'Модель вернула услышанную фразу не строкой' };
  }

  if (typeof data.date !== 'string' || !isIsoDate(data.date.trim())) {
    return { ok: false, error: `Модель вернула неверную дату: «${String(data.date)}»` };
  }

  let time: string | null = null;

  if (data.time !== undefined && data.time !== null && data.time !== '') {
    time = typeof data.time === 'string' ? normalizeTime(data.time) : null;

    if (time === null) {
      return { ok: false, error: `Модель вернула неверное время: «${String(data.time)}»` };
    }
  }

  const text = typeof data.text === 'string' ? data.text.trim().replace(/\.+$/, '').trim() : '';

  if (text === '') {
    return { ok: false, error: 'Модель вернула пустой текст задачи' };
  }

  return {
    ok: true,
    value: {
      heard: heard.trim(),
      date: data.date.trim(),
      time,
      text: text.charAt(0).toLocaleUpperCase('ru-RU') + text.slice(1),
    },
  };
}

/**
 * Текст задачи: суть и время (выбор 6.1 плана — время в тексте). «Маникюр в 12»;
 * при ненулевых минутах — «Маникюр в 12:30»; часы без ведущего нуля — «в 9:05».
 */
export function taskText(text: string, time: string | null): string {
  if (time === null) {
    return text;
  }

  const [hours, minutes] = time.split(':');
  const spoken = minutes === '00' ? String(Number(hours)) : `${Number(hours)}:${minutes}`;

  return `${text} в ${spoken}`;
}

/** Сообщение об успехе (выбор 7.1): «Добавлено: Маникюр в 12 — пн, 23 ноября». */
export function successMessage(text: string, date: string, today: string): string {
  return `Добавлено: ${text} — ${formatWeekdayDate(date, today)}`;
}

/** Итог сверки даты модели с `chrono-node`. */
export interface ChronoCheck {
  /** Нашёл ли `chrono-node` в фразе день (число, день недели, «завтра»). */
  found: boolean;
  /** Кусок фразы, который `chrono-node` распознал; null — ничего. */
  matched: string | null;
  /** День по `chrono-node`; null — день в фразе не назван. */
  date: string | null;
  /** Совпала ли дата с датой модели; null — сверять было не с чем. */
  agrees: boolean | null;
}

/**
 * Сверяет дату модели с `chrono-node` по услышанной фразе (выбор 5.2). Сверяется только дата
 * и только когда в фразе назван день: время «в 12» без дня `chrono-node` относит к ближайшим
 * 12:00 — это может быть и завтра, и сравнение было бы ложным. Будущее направление
 * (`forwardDate`) — как правило промпта: «в понедельник» не бывает в прошлом.
 *
 * Сегодняшний день недели `chrono-node` считает по времени суток: в понедельник в 9:05
 * «в понедельник» — сегодня, а в 19:30 — через неделю (проверено на 2.10.3). Правило промпта —
 * всегда через неделю, поэтому день недели, выпавший на сегодня, сдвигается на 7 дней.
 */
export function checkDateWithChrono(heard: string, modelDate: string, now: Date): ChronoCheck {
  const result = heard === '' ? undefined : parseRussianDate(heard, now, { forwardDate: true })[0];

  if (result === undefined) {
    return { found: false, matched: null, date: null, agrees: null };
  }

  const found = result.start.isCertain('day') || result.start.isCertain('weekday');

  if (!found) {
    return { found: false, matched: result.text, date: null, agrees: null };
  }

  const today = toIsoDate(now);
  const weekdayOnly = !result.start.isCertain('day');
  let date = toIsoDate(result.start.date());

  if (weekdayOnly && date === today) {
    date = toIsoDate(addDays(now, 7));
  }

  return { found: true, matched: result.text, date, agrees: date === modelDate };
}

/** Вызов инструмента в ответе модели. */
export interface ModelToolCall {
  name: string;
  arguments: unknown;
}

/** Сообщение модели, как его отдаёт нативная часть. */
export interface ModelMessage {
  role: string;
  text: string;
  toolCalls: ModelToolCall[];
  channels: Record<string, unknown>;
}

/** Итог разбора ответа модели. */
export type ReplyResult =
  | {
      ok: true;
      args: AddTaskArgs;
      chrono: ChronoCheck;
      task: NewTask;
      toast: string;
    }
  | {
      ok: false;
      error: string;
      /** Сырые аргументы вызова, если вызов был. */
      rawArgs: unknown;
    };

/** Строка для сообщения: первые символы, длинное обрезается многоточием. */
function preview(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();

  return flat.length > REPLY_PREVIEW ? `${flat.slice(0, REPLY_PREVIEW - 1)}…` : flat;
}

/**
 * Разбирает ответ модели на нажатие в момент `now`: первый вызов `add_task` → проверка аргументов
 * → сверка `chrono-node` → задача и текст сообщения. Задача сохраняется по дате модели,
 * расхождение с `chrono-node` только отмечается — его видно в журнале. Без вызова — «Не понял»
 * с ответом модели.
 */
export function interpretReply(messages: ModelMessage[], now: Date): ReplyResult {
  const call = messages.flatMap((message) => message.toolCalls).find((item) => item.name === ADD_TASK);

  if (call === undefined) {
    const others = messages.flatMap((message) => message.toolCalls).map((item) => item.name);
    const reply = preview(messages.map((message) => message.text).join(' '));

    if (reply !== '') {
      return { ok: false, error: `Не понял: «${reply}»`, rawArgs: null };
    }

    return {
      ok: false,
      error:
        others.length > 0
          ? `Не понял: модель вызвала неизвестный инструмент ${others.join(', ')}`
          : 'Не понял: модель ничего не ответила',
      rawArgs: null,
    };
  }

  const parsed = parseAddTaskArgs(call.arguments);

  if (!parsed.ok) {
    return { ok: false, error: parsed.error, rawArgs: call.arguments };
  }

  const args = parsed.value;
  const text = taskText(args.text, args.time);

  return {
    ok: true,
    args,
    // Сверка — от того же сдвинутого ночью момента, что и промпт.
    chrono: checkDateWithChrono(args.heard, args.date, dayReference(now)),
    task: { text, date: args.date, priority: 'medium', recurrence: 'none' },
    toast: successMessage(text, args.date, toIsoDate(now)),
  };
}

/** Метка времени для журнала: локальное время телефона со смещением, «2026-11-21T19:30:05.123+03:00». */
export function formatTimestamp(date: Date): string {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const absolute = Math.abs(offset);
  const millis = String(date.getMilliseconds()).padStart(3, '0');

  return (
    `${toIsoDate(date)}T${clock(date)}:${pad(date.getSeconds())}.${millis}` +
    `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`
  );
}
