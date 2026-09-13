import type { Theme } from './types';

/** 26. Сине-серый — спокойный стальной фон, карточки-строки и глубокий синий акцент. */
const theme: Theme = {
  id: 'v26',
  name: 'Сине-серый',
  layout: 'лента дней вместо сетки',
  dark: false,
  tokens: {
    // Поверхности и текст
    colorBg: '#eef1f6',
    colorSurface: '#ffffff',
    colorSurfaceMuted: '#e0e8f3',
    colorText: '#1b2432',
    colorTextMuted: '#7b8798',
    colorBorder: '#dde3ec',

    // Три ключевых цвета
    colorPrimary: '#3d5a80',
    colorOnPrimary: '#ffffff',
    colorSecondary: '#e0e8f3',
    colorOnSecondary: '#3d5a80',
    colorTertiary: '#243b57',
    colorOnTertiary: '#e8f0fb',

    // Кнопки
    buttonPrimaryBg: '#3d5a80',
    buttonPrimaryText: '#ffffff',
    buttonPrimaryBorder: 'transparent',
    buttonSecondaryBg: '#e0e8f3',
    buttonSecondaryText: '#3d5a80',
    buttonSecondaryBorder: '#dde3ec',
    buttonRadius: '8px',

    // Состояния календаря
    colorToday: '#243b57',
    colorOnToday: '#ffffff',
    colorSelected: '#e0e8f3',
    colorWeekend: '#98a4b6',
    colorTaskA: '#3d5a80',
    colorTaskB: '#c77b45',
    colorTaskC: '#5c8a5c',
    colorDone: '#b3bdcb',

    // Форма и типографика
    radiusSm: '8px',
    radiusMd: '12px',
    radiusLg: '16px',
    radiusPill: '999px',
    shadowCard: 'none',
    fontFamily: '-apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    fontFamilyHeading: '-apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    fontWeightHeading: '700',
    letterSpacingHeading: '-0.3px',

    // Нижняя навигация
    navBg: '#ffffff',
    navText: '#7b8798',
    navTextActive: '#3d5a80',
    navBorder: '#dde3ec',
  },
};

export default theme;
