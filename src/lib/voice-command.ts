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

/**
 * Текст, который идёт в сообщении пользователя вместе с записью. Времени нажатия в нём нет: ни одно
 * правило промпта от времени суток не зависит, а время рядом с фразой модель брала в `time`
 * (ревью У-2).
 */
export const USER_TEXT = 'Команда пользователя — в аудиозаписи.';

/**
 * Час, до которого ночь ещё относится к прошлому дню (решение Р-38): в 01:58 22 ноября «завтра» —
 * 22 ноября, «послезавтра» — 23-е, дни недели — от 21-го; «сегодня» — тоже 22-е: прошедший день
 * не получается никогда.
 */
export const NIGHT_END_HOUR = 4;

/**
 * Момент, от которого ночью считаются «завтра» и дни недели: до `NIGHT_END_HOUR` — то же время
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
 * Ключ «дня промпта»: календарная дата и признак ночи. Базовый промпт (`buildBasePrompt`) зависит
 * только от него и часового пояса, поэтому читается моделью один раз и меняется на границах
 * 00:00 и `NIGHT_END_HOUR`:00 — «2026-11-22 ночь» до 04:00, «2026-11-22 день» после.
 */
export function promptDayKey(now: Date): string {
  return `${toIsoDate(now)} ${now.getHours() < NIGHT_END_HOUR ? 'ночь' : 'день'}`;
}

/** Ближайшая смена ключа дня промпта после `now`: 04:00 этих суток ночью, иначе полночь. */
export function nextPromptDayChange(now: Date): Date {
  return now.getHours() < NIGHT_END_HOUR
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), NIGHT_END_HOUR)
    : addDays(now, 1);
}

/**
 * Базовый (постоянный в пределах дня промпта) системный промпт: дата, день недели, часовой пояс
 * телефона, календарь на две недели (снимает с модели арифметику дней) и правила разбора.
 * Времени суток в нём нет (сообщение нажатия — только `USER_TEXT` и запись), поэтому промпт
 * с описанием инструмента модель читает один раз и на нажатие копирует готовый разговор.
 *
 * Ночное правило (решение Р-38): до `NIGHT_END_HOUR` календарного дня D «сегодня», «завтра» и день
 * без названия — D, «послезавтра» — D+1, дни недели — от D−1 (ближайший такой день не раньше D),
 * «через N дней» — от D; прошедший день не получается никогда. Календарь — с D. Промпт говорит
 * это модели явно.
 *
 * Правило дня недели: «в понедельник» — ближайший понедельник после сегодняшнего; если сегодня
 * понедельник — через неделю (решение по плану этапа 5, «следующий ближайший»). Сверка
 * `checkDateWithChrono` приводит `chrono-node` к тому же правилу.
 */
export function buildBasePrompt(now: Date, timeZone: string): string {
  const night = now.getHours() < NIGHT_END_HOUR;
  const today = toIsoDate(now);
  // Ночью «завтра» — наступившие сутки, то есть сегодня.
  const tomorrow = toIsoDate(addDays(now, night ? 0 : 1));
  const afterTomorrow = toIsoDate(addDays(now, night ? 1 : 2));
  const labels = night ? ['сегодня и завтра', 'послезавтра'] : ['сегодня', 'завтра', 'послезавтра'];
  const calendar: string[] = [];

  for (let offset = 0; offset <= CALENDAR_DAYS; offset += 1) {
    const day = addDays(now, offset);
    const label = offset < labels.length ? ` (${labels[offset]})` : '';

    calendar.push(`${toIsoDate(day)} — ${WEEKDAYS[day.getDay()]}${label}`);
  }

  const spoken = `${WEEKDAYS[now.getDay()]}, ${formatLongDate(today)}`;
  const todayLine = night
    ? `Сегодня — ${today}. Сейчас ночь, до ${pad(NIGHT_END_HOUR)}:00: «завтра» ночью говорят о наступивших сутках, поэтому «завтра» — тоже ${today}, а «послезавтра» — ${afterTomorrow}.`
    : `Сегодня — ${today}.`;

  return [
    'Ты разбираешь голосовые команды для задачника «Секретарь». В аудиозаписи пользователь по-русски говорит одну фразу — какое дело добавить в список задач и на какой день.',
    '',
    `Сейчас: ${spoken} (часовой пояс ${timeZone}). ${todayLine}`,
    '',
    'Календарь на две недели вперёд:',
    ...calendar,
    '',
    `Если в фразе есть дело, вызови инструмент ${ADD_TASK} один раз. Аргументы:`,
    '- heard — фраза дословно, как ты её услышал, без исправлений и пересказа.',
    '- date — день задачи в формате ГГГГ-ММ-ДД:',
    `  - день не назван — сегодня, ${today};`,
    `  - «сегодня» — ${today}, «завтра» — ${tomorrow}, «послезавтра» — ${afterTomorrow};`,
    night
      ? `  - день недели («в понедельник», «в пятницу», «в следующий вторник») — ближайший такой день не раньше сегодняшнего: ночью сегодняшний день недели — это сегодня, ${today};`
      : '  - день недели («в понедельник», «в пятницу», «в следующий вторник») — ближайший такой день после сегодняшнего; если сегодня тот же день недели — тот же день следующей недели, через 7 дней;',
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
 * Сверяет дату модели с `chrono-node` по услышанной фразе (выбор 5.2), сказанной в момент `now`.
 * Сверяется только дата и только когда в фразе назван день: время «в 12» без дня `chrono-node`
 * относит к ближайшим 12:00 — это может быть и завтра, и сравнение было бы ложным. Будущее
 * направление (`forwardDate`) — как правило промпта: «в понедельник» не бывает в прошлом.
 *
 * Сегодняшний день недели `chrono-node` считает по времени суток: в понедельник в 9:05
 * «в понедельник» — сегодня, а в 19:30 — через неделю (проверено на 2.10.3). Правило промпта —
 * всегда через неделю, поэтому день недели, выпавший на сегодня, сдвигается на 7 дней.
 *
 * Ночью (до `NIGHT_END_HOUR`) разбор идёт от прошлых суток (`dayReference`) — так «завтра» и дни
 * недели совпадают с промптом, — а дата прошлых суток («сегодня») приводится к календарной:
 * прошедшего дня промпт не даёт.
 */
export function checkDateWithChrono(heard: string, modelDate: string, now: Date): ChronoCheck {
  const reference = dayReference(now);
  const result = heard === '' ? undefined : parseRussianDate(heard, reference, { forwardDate: true })[0];

  if (result === undefined) {
    return { found: false, matched: null, date: null, agrees: null };
  }

  const found = result.start.isCertain('day') || result.start.isCertain('weekday');

  if (!found) {
    return { found: false, matched: result.text, date: null, agrees: null };
  }

  const referenceDay = toIsoDate(reference);
  const weekdayOnly = !result.start.isCertain('day');
  let date = toIsoDate(result.start.date());

  if (weekdayOnly && date === referenceDay) {
    date = toIsoDate(addDays(reference, 7));
  }

  if (reference !== now && date === referenceDay) {
    date = toIsoDate(now);
  }

  return { found: true, matched: result.text, date, agrees: date === modelDate };
}

/**
 * «Сегодня», «завтра» или «послезавтра» отдельным словом в любом регистре (решение Р-39). Границы
 * слова — вручную: `\b` в JS кириллицу не понимает. «Завтрашний» и «сегодняшний» не подходят.
 */
const RELATIVE_DAY = /(?<![а-яё])(?:сегодня|завтра|послезавтра)(?![а-яё])/iu;

/** Выбор даты задачи: дата модели, дата `chrono-node`, сохранённая дата и откуда она взята. */
export interface DateChoice {
  model: string;
  /** null — `chrono-node` дня в фразе не нашёл. */
  chrono: string | null;
  saved: string;
  source: 'model' | 'chrono';
}

/**
 * Дата задачи (решение Р-39): если `chrono-node` распознал «сегодня», «завтра» или «послезавтра»
 * и его дата (с ночным правилом) расходится с датой модели — дата `chrono-node`: модель на слух
 * путает «в пять» с «в пятницу». Иначе — дата модели, расхождение остаётся только в журнале.
 */
function chooseDate(modelDate: string, chrono: ChronoCheck): DateChoice {
  const override =
    chrono.agrees === false && chrono.matched !== null && RELATIVE_DAY.test(chrono.matched) ? chrono.date : null;

  return override === null
    ? { model: modelDate, chrono: chrono.date, saved: modelDate, source: 'model' }
    : { model: modelDate, chrono: override, saved: override, source: 'chrono' };
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
      dateChoice: DateChoice;
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
 * → сверка `chrono-node` → задача и текст сообщения. Одна фраза — одна задача (решение владельца
 * 2026-11-22): если модель всё же вызвала инструмент несколько раз, сохраняется первый вызов,
 * остальные остаются только в журнале (`reply.messages`). Дата задачи — `chooseDate`: модели,
 * а при «сегодня/завтра/послезавтра», расходящихся с моделью, — `chrono-node`. Без вызова —
 * «Не понял» с ответом модели.
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
  const chrono = checkDateWithChrono(args.heard, args.date, now);
  const dateChoice = chooseDate(args.date, chrono);

  return {
    ok: true,
    args,
    chrono,
    dateChoice,
    task: { text, date: dateChoice.saved, priority: 'medium', recurrence: 'none' },
    toast: successMessage(text, dateChoice.saved, toIsoDate(now)),
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
