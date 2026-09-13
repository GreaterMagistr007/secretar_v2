import type { Theme } from './types';

/** 14. Светлый графит — монохромная светлая палитра, воздушная компактная сетка без карточек. */
const theme: Theme = {
  id: 'v14',
  name: 'Светлый графит',
  layout: 'воздушная компактная сетка',
  dark: false,
  tokens: {
    // Поверхности и текст
    colorBg: '#f7f7f8',
    colorSurface: '#ffffff',
    colorSurfaceMuted: '#f0f0f2',
    colorText: '#1c1d20',
    colorTextMuted: '#9a9da3',
    colorBorder: '#e6e7ea',

    // Три ключевых цвета
    colorPrimary: '#2b2d31',
    colorOnPrimary: '#ffffff',
    colorSecondary: '#8d9096',
    colorOnSecondary: '#16171a',
    colorTertiary: '#c3c6cb',
    colorOnTertiary: '#1c1d20',

    // Кнопки
    buttonPrimaryBg: '#2b2d31',
    buttonPrimaryText: '#ffffff',
    buttonPrimaryBorder: 'transparent',
    buttonSecondaryBg: '#ffffff',
    buttonSecondaryText: '#1c1d20',
    buttonSecondaryBorder: '#e6e7ea',
    buttonRadius: '999px',

    // Состояния календаря
    colorToday: '#2b2d31',
    colorOnToday: '#ffffff',
    colorSelected: '#eceef0',
    colorWeekend: '#9a9da3',
    colorTaskA: '#2b2d31',
    colorTaskB: '#8d9096',
    colorTaskC: '#c3c6cb',
    colorDone: '#cfd1d5',

    // Форма и типографика
    radiusSm: '9px',
    radiusMd: '11px',
    radiusLg: '18px',
    radiusPill: '999px',
    shadowCard: 'none',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    fontFamilyHeading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    fontWeightHeading: '600',
    letterSpacingHeading: '-0.2px',

    // Нижняя навигация
    navBg: '#ffffff',
    navText: '#9a9da3',
    navTextActive: '#1c1d20',
    navBorder: '#e6e7ea',
  },
};

export default theme;
