import type { Theme } from './types';

/** 07. Графит — монохромная графитовая палитра, двухстрочная шапка, тонкие линии. */
const theme: Theme = {
  id: 'v07',
  name: 'Графит',
  layout: 'двухстрочная шапка',
  dark: false,
  tokens: {
    // Поверхности и текст
    colorBg: '#ffffff',
    colorSurface: '#ffffff',
    colorSurfaceMuted: '#f4f4f5',
    colorText: '#26272b',
    colorTextMuted: '#8b8d94',
    colorBorder: '#e2e2e5',

    // Три ключевых цвета
    colorPrimary: '#3f4045',
    colorOnPrimary: '#ffffff',
    colorSecondary: '#f4f4f5',
    colorOnSecondary: '#26272b',
    colorTertiary: '#5c5d63',
    colorOnTertiary: '#ffffff',

    // Кнопки
    buttonPrimaryBg: '#3f4045',
    buttonPrimaryText: '#ffffff',
    buttonPrimaryBorder: 'transparent',
    buttonSecondaryBg: '#ffffff',
    buttonSecondaryText: '#26272b',
    buttonSecondaryBorder: '#e2e2e5',
    buttonRadius: '8px',

    // Состояния календаря
    colorToday: '#3f4045',
    colorOnToday: '#ffffff',
    colorSelected: '#f4f4f5',
    colorWeekend: '#a5a7ad',
    colorTaskA: '#3f4045',
    colorTaskB: '#5c5d63',
    colorTaskC: '#bfc0c5',
    colorDone: '#a5a7ad',

    // Форма и типографика
    radiusSm: '6px',
    radiusMd: '8px',
    radiusLg: '12px',
    radiusPill: '999px',
    shadowCard: 'none',
    fontFamily: '"SF Pro Text", -apple-system, Inter, "Segoe UI", Roboto, Arial, sans-serif',
    fontFamilyHeading: '"SF Pro Text", -apple-system, Inter, "Segoe UI", Roboto, Arial, sans-serif',
    fontWeightHeading: '800',
    letterSpacingHeading: '-1px',

    // Нижняя навигация
    navBg: '#ffffff',
    navText: '#8b8d94',
    navTextActive: '#26272b',
    navBorder: '#e2e2e5',
  },
};

export default theme;
