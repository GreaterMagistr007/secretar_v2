/**
 * Применение темы к документу и запоминание выбора.
 *
 * Токены раскладываются в CSS-переменные перебором карты CSS_VARIABLES — ручного
 * перечисления ключей нет, новый токен подхватывается автоматически.
 */

import { CSS_VARIABLES } from './types';
import type { Theme, ThemeTokens } from './types';

/** Ключ хранения выбранной темы (требование Т-21: выбор переживает закрытие приложения). */
const STORAGE_KEY = 'secretar.theme';

/** Все ключи токенов: берутся из карты переменных, второго списка ключей в проекте нет. */
const TOKEN_KEYS = Object.keys(CSS_VARIABLES) as (keyof ThemeTokens)[];

/** Проставляет токены темы, схему цвета и цвет системной панели браузера. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;

  for (const key of TOKEN_KEYS) {
    root.style.setProperty(CSS_VARIABLES[key], theme.tokens[key]);
  }

  root.style.colorScheme = theme.dark ? 'dark' : 'light';
  setThemeColor(theme.tokens.colorPrimary);
}

/**
 * Обновляет <meta name="theme-color">.
 * Заготовки из index.html привязаны к prefers-color-scheme через media — они
 * перебили бы выбранную тему, поэтому при первом применении удаляются.
 */
function setThemeColor(color: string): void {
  const metas = Array.from(
    document.head.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'),
  );

  let target: HTMLMetaElement | null = null;

  for (const meta of metas) {
    if (meta.hasAttribute('media')) {
      meta.remove();
      continue;
    }

    target = meta;
  }

  if (target === null) {
    target = document.createElement('meta');
    target.name = 'theme-color';
    document.head.appendChild(target);
  }

  target.content = color;
}

/**
 * Сохраняет выбор темы.
 * localStorage бросает исключение в приватном режиме и при запрете хранилища —
 * приложение в этом случае продолжает работать, теряя только память о выборе.
 */
export function saveThemeId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Хранилище недоступно: тема применена к текущему сеансу, но не запомнена.
  }
}

/** Читает сохранённый выбор темы; null, если его нет или хранилище недоступно. */
export function loadThemeId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
