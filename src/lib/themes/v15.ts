import type { Theme } from './types';

/** 15. Океан — шкала бирюзовых заливок, квадраты-ячейки по загруженности дня. */
const theme: Theme = {
  id: 'v15',
  name: 'Океан',
  layout: 'квадраты-заливка по загруженности',
  dark: false,
  tokens: {
    // Поверхности и текст
    colorBg: '#eef6f7',
    colorSurface: '#ffffff',
    colorSurfaceMuted: '#e7f1f2',
    colorText: '#04262e',
    colorTextMuted: '#5f8791',
    colorBorder: '#d8e9eb',

    // Три ключевых цвета
    colorPrimary: '#0f7a86',
    colorOnPrimary: '#eaf7f7',
    colorSecondary: '#063a45',
    colorOnSecondary: '#dff0f1',
    colorTertiary: '#7ec6c3',
    colorOnTertiary: '#04262e',

    // Кнопки
    buttonPrimaryBg: '#063a45',
    buttonPrimaryText: '#dff0f1',
    buttonPrimaryBorder: 'transparent',
    buttonSecondaryBg: '#bfe0de',
    buttonSecondaryText: '#063a45',
    buttonSecondaryBorder: 'transparent',
    buttonRadius: '11px',

    // Состояния календаря
    colorToday: '#063a45',
    colorOnToday: '#eaf7f7',
    colorSelected: '#bfe0de',
    colorWeekend: '#39a3a6',
    colorTaskA: '#0f7a86',
    colorTaskB: '#39a3a6',
    colorTaskC: '#7ec6c3',
    colorDone: '#bfe0de',

    // Форма и типографика
    radiusSm: '6px',
    radiusMd: '10px',
    radiusLg: '16px',
    radiusPill: '999px',
    shadowCard: 'none',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    fontFamilyHeading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    fontWeightHeading: '800',
    letterSpacingHeading: '-0.5px',

    // Нижняя навигация
    navBg: '#ffffff',
    navText: '#5f8791',
    navTextActive: '#0f7a86',
    navBorder: '#d8e9eb',
  },
};

export default theme;
