/**
 * Нормализация текста задачи и разбор поискового запроса (требование Т-6).
 *
 * IndexedDB не умеет `LIKE '%…%'`, поэтому текст раскладывается на токены; они
 * лежат в multiEntry-индексе `searchTokens` и дают индексный отбор по префиксу.
 * Отобранные кандидаты дополнительно проверяются вхождением запроса подстрокой —
 * так выдача соответствует именно «вхождению», а не совпадению токена
 * (docs/architecture_storage.md, раздел «Поиск по описанию»).
 */

/** Ограничение выдачи поиска по умолчанию. */
export const DEFAULT_SEARCH_LIMIT = 20;

/** Любой символ, не являющийся буквой или цифрой, — разделитель токенов. */
const SEPARATOR = /[^\p{L}\p{N}]+/u;

/** Разделители по краям строки — обрезаются у поискового запроса. */
const EDGE_SEPARATORS = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;

/**
 * Приводит текст к виду, в котором тексты сравниваются: нижний регистр,
 * `ё` → `е`, пробельные последовательности схлопнуты, края обрезаны.
 */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Раскладывает текст на уникальные токены в порядке первого появления.
 * Пустые токены отбрасываются, повторы убираются.
 */
export function tokenize(value: string): string[] {
  const tokens: string[] = [];
  const seen = new Set<string>();

  for (const part of normalizeText(value).split(SEPARATOR)) {
    if (part.length === 0 || seen.has(part)) {
      continue;
    }

    seen.add(part);
    tokens.push(part);
  }

  return tokens;
}

/** Разобранный поисковый запрос. */
export interface SearchQuery {
  /** Нормализованный запрос целиком — проверяется вхождением подстрокой. */
  needle: string;
  /** Токены запроса — по ним идёт префиксный отбор по индексу. */
  tokens: string[];
}

/** Разбирает поисковый запрос так же, как разбирался текст задачи при сохранении. */
export function parseSearchQuery(raw: string): SearchQuery {
  return {
    needle: normalizeText(raw).replace(EDGE_SEPARATORS, ''),
    tokens: tokenize(raw),
  };
}

/**
 * Подходит ли задача под запрос.
 *
 * Оба условия обязательны: каждый токен запроса — префикс какого-нибудь токена
 * текста (это то, что отбирает индекс), и весь запрос входит в текст подстрокой.
 * Второе условие отсекает случаи, когда слова запроса нашлись по отдельности,
 * а искомого сочетания в тексте нет. Пустой запрос не подходит ни под что.
 */
export function matchesSearchQuery(
  text: string,
  searchTokens: readonly string[],
  query: SearchQuery,
): boolean {
  if (query.tokens.length === 0) {
    return false;
  }

  const everyTokenIndexed = query.tokens.every((token) =>
    searchTokens.some((indexed) => indexed.startsWith(token)),
  );

  if (!everyTokenIndexed) {
    return false;
  }

  return normalizeText(text).includes(query.needle);
}
