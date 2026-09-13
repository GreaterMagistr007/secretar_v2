/**
 * Типы системы тем. Состав токенов зафиксирован в docs/design_tokens.md —
 * добавление или переименование ключа правится там же и сразу во всех темах.
 */

/** Набор токенов темы. Все ключи обязательны: пропущенный ломает экран, который на него рассчитывает. */
export interface ThemeTokens {
  // Поверхности и текст
  colorBg: string;
  colorSurface: string;
  colorSurfaceMuted: string;
  colorText: string;
  colorTextMuted: string;
  colorBorder: string;

  // Три ключевых цвета и текст поверх них
  colorPrimary: string;
  colorOnPrimary: string;
  colorSecondary: string;
  colorOnSecondary: string;
  colorTertiary: string;
  colorOnTertiary: string;

  // Кнопки
  buttonPrimaryBg: string;
  buttonPrimaryText: string;
  buttonPrimaryBorder: string;
  buttonSecondaryBg: string;
  buttonSecondaryText: string;
  buttonSecondaryBorder: string;
  buttonRadius: string;

  // Состояния календаря
  colorToday: string;
  colorOnToday: string;
  colorSelected: string;
  colorWeekend: string;
  colorTaskA: string;
  colorTaskB: string;
  colorTaskC: string;
  colorDone: string;

  // Форма и типографика
  radiusSm: string;
  radiusMd: string;
  radiusLg: string;
  radiusPill: string;
  shadowCard: string;
  fontFamily: string;
  fontFamilyHeading: string;
  fontWeightHeading: string;
  letterSpacingHeading: string;

  // Нижняя навигация
  navBg: string;
  navText: string;
  navTextActive: string;
  navBorder: string;
}

/** Тема целиком: описание варианта плюс его токены. */
export interface Theme {
  /** Совпадает с именем макета в галерее: 'v01'…'v30'. */
  id: string;
  /** Название варианта, как в галерее: «Ясный день». */
  name: string;
  /** Описание раскладки исходного макета — справочно, на оформление не влияет. */
  layout: string;
  /** Тёмная тема: влияет на color-scheme и meta theme-color. */
  dark: boolean;
  tokens: ThemeTokens;
}

/** Имена CSS-переменных для каждого токена. Единственное место, где задаётся это соответствие. */
export const CSS_VARIABLES: Record<keyof ThemeTokens, string> = {
  colorBg: '--color-bg',
  colorSurface: '--color-surface',
  colorSurfaceMuted: '--color-surface-muted',
  colorText: '--color-text',
  colorTextMuted: '--color-text-muted',
  colorBorder: '--color-border',
  colorPrimary: '--color-primary',
  colorOnPrimary: '--color-on-primary',
  colorSecondary: '--color-secondary',
  colorOnSecondary: '--color-on-secondary',
  colorTertiary: '--color-tertiary',
  colorOnTertiary: '--color-on-tertiary',
  buttonPrimaryBg: '--button-primary-bg',
  buttonPrimaryText: '--button-primary-text',
  buttonPrimaryBorder: '--button-primary-border',
  buttonSecondaryBg: '--button-secondary-bg',
  buttonSecondaryText: '--button-secondary-text',
  buttonSecondaryBorder: '--button-secondary-border',
  buttonRadius: '--button-radius',
  colorToday: '--color-today',
  colorOnToday: '--color-on-today',
  colorSelected: '--color-selected',
  colorWeekend: '--color-weekend',
  colorTaskA: '--color-task-a',
  colorTaskB: '--color-task-b',
  colorTaskC: '--color-task-c',
  colorDone: '--color-done',
  radiusSm: '--radius-sm',
  radiusMd: '--radius-md',
  radiusLg: '--radius-lg',
  radiusPill: '--radius-pill',
  shadowCard: '--shadow-card',
  fontFamily: '--font-family',
  fontFamilyHeading: '--font-family-heading',
  fontWeightHeading: '--font-weight-heading',
  letterSpacingHeading: '--letter-spacing-heading',
  navBg: '--nav-bg',
  navText: '--nav-text',
  navTextActive: '--nav-text-active',
  navBorder: '--nav-border',
};
