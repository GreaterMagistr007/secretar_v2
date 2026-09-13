import type { Theme } from './types';

/** 13. Янтарь — тёплая медовая палитра, круглая кнопка добавления в углу. */
const theme: Theme = {
  id: 'v13',
  name: 'Янтарь',
  layout: 'кнопка добавления в углу',
  dark: false,
  tokens: {
    // Поверхности и текст
    colorBg: '#fffaf0',
    colorSurface: '#ffffff',
    colorSurfaceMuted: '#fdf6e8',
    colorText: '#3a2a10',
    colorTextMuted: '#9a8464',
    colorBorder: '#f0e2c9',

    // Три ключевых цвета
    colorPrimary: '#e0930c',
    colorOnPrimary: '#3a2a10',
    colorSecondary: '#a86505',
    colorOnSecondary: '#fff6e4',
    colorTertiary: '#fde8c2',
    colorOnTertiary: '#3a2a10',

    // Кнопки
    buttonPrimaryBg: '#e0930c',
    buttonPrimaryText: '#3a2a10',
    buttonPrimaryBorder: 'transparent',
    buttonSecondaryBg: '#fde8c2',
    buttonSecondaryText: '#a86505',
    buttonSecondaryBorder: '#f0e2c9',
    buttonRadius: '14px',

    // Состояния календаря
    colorToday: '#e0930c',
    colorOnToday: '#3a2a10',
    colorSelected: '#fde8c2',
    colorWeekend: '#bf5b2a',
    colorTaskA: '#e0930c',
    colorTaskB: '#c2562f',
    colorTaskC: '#a86505',
    colorDone: '#5f8f4e',

    // Форма и типографика
    radiusSm: '10px',
    radiusMd: '14px',
    radiusLg: '22px',
    radiusPill: '999px',
    shadowCard: '0 10px 26px rgba(168, 101, 5, 0.09)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    fontFamilyHeading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    fontWeightHeading: '800',
    letterSpacingHeading: '-0.3px',

    // Нижняя навигация
    navBg: '#ffffff',
    navText: '#9a8464',
    navTextActive: '#a86505',
    navBorder: '#f0e2c9',
  },
};

export default theme;
