import type { Theme } from './types';

/** 01. Ясный день — светлый нейтрал, синий акцент, панель сверху. */
const theme: Theme = {
  id: 'v01',
  name: 'Ясный день',
  layout: 'панель сверху',
  dark: false,
  tokens: {
    // Поверхности и текст
    colorBg: '#f5f6f8',
    colorSurface: '#ffffff',
    colorSurfaceMuted: '#eceef2',
    colorText: '#1f2430',
    colorTextMuted: '#9aa2b1',
    colorBorder: '#e3e6ea',

    // Три ключевых цвета
    colorPrimary: '#3b6ef0',
    colorOnPrimary: '#ffffff',
    colorSecondary: '#e8eefe',
    colorOnSecondary: '#1f2430',
    colorTertiary: '#c0483f',
    colorOnTertiary: '#ffffff',

    // Кнопки
    buttonPrimaryBg: '#3b6ef0',
    buttonPrimaryText: '#ffffff',
    buttonPrimaryBorder: 'transparent',
    buttonSecondaryBg: '#ffffff',
    buttonSecondaryText: '#3b6ef0',
    buttonSecondaryBorder: '#e3e6ea',
    buttonRadius: '999px',

    // Состояния календаря
    colorToday: '#3b6ef0',
    colorOnToday: '#ffffff',
    colorSelected: '#e8eefe',
    colorWeekend: '#c0483f',
    colorTaskA: '#3b6ef0',
    colorTaskB: '#c0483f',
    colorTaskC: '#8aa6f6',
    colorDone: '#9aa2b1',

    // Форма и типографика
    radiusSm: '10px',
    radiusMd: '12px',
    radiusLg: '16px',
    radiusPill: '999px',
    shadowCard: 'none',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontFamilyHeading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontWeightHeading: '650',
    letterSpacingHeading: '-0.2px',

    // Нижняя навигация
    navBg: '#ffffff',
    navText: '#9aa2b1',
    navTextActive: '#3b6ef0',
    navBorder: '#e3e6ea',
  },
};

export default theme;
