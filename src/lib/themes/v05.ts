import type { Theme } from './types';

/** 05. Полночь — тёмная палитра, синий и мятный акценты, нижняя панель навигации. */
const theme: Theme = {
  id: 'v05',
  name: 'Полночь',
  layout: 'нижняя панель навигации',
  dark: true,
  tokens: {
    // Поверхности и текст
    colorBg: '#12141a',
    colorSurface: '#1b1e26',
    colorSurfaceMuted: '#242833',
    colorText: '#e8ebf2',
    colorTextMuted: '#79808f',
    colorBorder: '#2e333f',

    // Три ключевых цвета
    colorPrimary: '#6f8cff',
    colorOnPrimary: '#0d1020',
    colorSecondary: '#39d3a0',
    colorOnSecondary: '#0d1020',
    colorTertiary: '#ff7b72',
    colorOnTertiary: '#12141a',

    // Кнопки
    buttonPrimaryBg: '#6f8cff',
    buttonPrimaryText: '#0d1020',
    buttonPrimaryBorder: 'transparent',
    buttonSecondaryBg: '#242833',
    buttonSecondaryText: '#e8ebf2',
    buttonSecondaryBorder: '#2e333f',
    buttonRadius: '11px',

    // Состояния календаря
    colorToday: '#6f8cff',
    colorOnToday: '#ffffff',
    colorSelected: '#242833',
    colorWeekend: '#ff7b72',
    colorTaskA: '#6f8cff',
    colorTaskB: '#39d3a0',
    colorTaskC: '#ff7b72',
    colorDone: '#79808f',

    // Форма и типографика
    radiusSm: '11px',
    radiusMd: '12px',
    radiusLg: '18px',
    radiusPill: '999px',
    shadowCard: 'none',
    fontFamily: '-apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    fontFamilyHeading: '-apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    fontWeightHeading: '700',
    letterSpacingHeading: '-0.4px',

    // Нижняя навигация
    navBg: 'rgba(27, 30, 38, 0.96)',
    navText: '#79808f',
    navTextActive: '#6f8cff',
    navBorder: '#2e333f',
  },
};

export default theme;
