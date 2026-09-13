import type { Theme } from './types';

/** 22. Системный iOS — серо-голубой системный стиль, хайрлайны, крупный заголовок. */
const theme: Theme = {
  id: 'v22',
  name: 'Системный iOS',
  layout: 'крупный заголовок',
  dark: false,
  tokens: {
    // Поверхности и текст
    colorBg: '#f2f2f7',
    colorSurface: '#ffffff',
    colorSurfaceMuted: '#e6edf4',
    colorText: '#000000',
    colorTextMuted: '#8e8e93',
    colorBorder: '#c6c6c8',

    // Три ключевых цвета
    colorPrimary: '#5a7fa8',
    colorOnPrimary: '#ffffff',
    colorSecondary: '#e6edf4',
    colorOnSecondary: '#3c5a78',
    colorTertiary: '#c75c5c',
    colorOnTertiary: '#ffffff',

    // Кнопки
    buttonPrimaryBg: '#5a7fa8',
    buttonPrimaryText: '#ffffff',
    buttonPrimaryBorder: 'transparent',
    buttonSecondaryBg: '#ffffff',
    buttonSecondaryText: '#5a7fa8',
    buttonSecondaryBorder: '#c6c6c8',
    buttonRadius: '14px',

    // Состояния календаря
    colorToday: '#5a7fa8',
    colorOnToday: '#ffffff',
    colorSelected: '#e6edf4',
    colorWeekend: '#c75c5c',
    colorTaskA: '#5a7fa8',
    colorTaskB: '#c75c5c',
    colorTaskC: '#8e8e93',
    colorDone: '#c7c7cc',

    // Форма и типографика
    radiusSm: '6px',
    radiusMd: '12px',
    radiusLg: '14px',
    radiusPill: '999px',
    shadowCard: 'none',
    fontFamily: '-apple-system, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontFamilyHeading: '-apple-system, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontWeightHeading: '700',
    letterSpacingHeading: '-0.5px',

    // Нижняя навигация
    navBg: '#ffffff',
    navText: '#8e8e93',
    navTextActive: '#5a7fa8',
    navBorder: '#c6c6c8',
  },
};

export default theme;
