import type { Theme } from './types';

/** 03. Северный лёд — холодная сине-серая палитра, тёмный заголовок-герой. */
const theme: Theme = {
  id: 'v03',
  name: 'Северный лёд',
  layout: 'заголовок-герой',
  dark: false,
  tokens: {
    // Поверхности и текст
    colorBg: '#eef2f7',
    colorSurface: '#ffffff',
    colorSurfaceMuted: '#f7f9fc',
    colorText: '#25313f',
    colorTextMuted: '#7e8ea1',
    colorBorder: '#d6dee8',

    // Три ключевых цвета
    colorPrimary: '#4a7fb5',
    colorOnPrimary: '#ffffff',
    colorSecondary: '#31465e',
    colorOnSecondary: '#ffffff',
    colorTertiary: '#dde8f4',
    colorOnTertiary: '#25313f',

    // Кнопки
    buttonPrimaryBg: '#4a7fb5',
    buttonPrimaryText: '#ffffff',
    buttonPrimaryBorder: 'transparent',
    buttonSecondaryBg: '#ffffff',
    buttonSecondaryText: '#31465e',
    buttonSecondaryBorder: '#d6dee8',
    buttonRadius: '999px',

    // Состояния календаря
    colorToday: '#4a7fb5',
    colorOnToday: '#ffffff',
    colorSelected: '#dde8f4',
    colorWeekend: '#8895a8',
    colorTaskA: '#4a7fb5',
    colorTaskB: '#31465e',
    colorTaskC: '#8fb4d6',
    colorDone: '#7e8ea1',

    // Форма и типографика
    radiusSm: '8px',
    radiusMd: '10px',
    radiusLg: '16px',
    radiusPill: '999px',
    shadowCard: '0 6px 18px rgba(37, 49, 63, 0.08)',
    fontFamily: 'Inter, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    fontFamilyHeading: 'Inter, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    fontWeightHeading: '700',
    letterSpacingHeading: '-0.8px',

    // Нижняя навигация
    navBg: '#ffffff',
    navText: '#7e8ea1',
    navTextActive: '#4a7fb5',
    navBorder: '#d6dee8',
  },
};

export default theme;
