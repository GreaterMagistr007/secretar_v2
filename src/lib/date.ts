/**
 * Работа с плавающими датами вида YYYY-MM-DD — в таком виде задача хранит день
 * (см. поле `date` в src/lib/tasks/types.ts): без времени и часового пояса.
 *
 * Все преобразования идут через локальные поля Date (getFullYear и соседние),
 * а не через toISOString: последний переводит дату в UTC и в восточных поясах
 * сдвигает день на сутки назад.
 */

/** Месяцы в родительном падеже: «15 сентября 2026». */
const MONTHS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

/** Строгая проверка формата: четыре цифры года, месяц и день через дефис. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Дополняет число до двух знаков: 7 → «07». */
function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Дата в виде YYYY-MM-DD по локальному календарю. */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Сегодняшний день в виде YYYY-MM-DD. */
export function todayIso(): string {
  return toIsoDate(new Date());
}

/**
 * Проверяет, что строка — существующая дата в формате YYYY-MM-DD.
 * Отсекает и мусор («31-12-2026»), и несуществующие дни («2026-02-30»).
 */
export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  );
}

/**
 * Читаемая запись даты для интерфейса: «15 сентября 2026».
 * Непонятную строку возвращает как есть — интерфейс не должен падать из-за данных.
 */
export function formatLongDate(iso: string): string {
  if (!isIsoDate(iso)) {
    return iso;
  }

  const [year, month, day] = iso.split('-').map(Number);

  return `${day} ${MONTHS_GENITIVE[month - 1]} ${year}`;
}
