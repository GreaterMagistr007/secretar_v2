import type { Theme } from './types';

/** 11. Хвоя — тёмно-зелёная палитра, тёмная шапка, список задач под календарём. */
const theme: Theme = {
  id: 'v11',
  name: 'Хвоя',
  layout: 'список задач под календарём',
  dark: false,
  tokens: {
    // Поверхности и текст
    colorBg: '#f1f6f2',
    colorSurface: '#ffffff',
    colorSurfaceMuted: '#e6eee8',
    colorText: '#0f2318',
    colorTextMuted: '#6f8778',
    colorBorder: '#dfe9e1',

    // Три ключевых цвета
    colorPrimary: '#14432c',
    colorOnPrimary: '#eaf3ec',
    colorSecondary: '#2f7d53',
    colorOnSecondary: '#ffffff',
    colorTertiary: '#c2703d',
    colorOnTertiary: '#2a1206',

    // Кнопки
    buttonPrimaryBg: '#14432c',
    buttonPrimaryText: '#eaf3ec',
    buttonPrimaryBorder: 'transparent',
    buttonSecondaryBg: '#dbeade',
    buttonSecondaryText: '#14432c',
    buttonSecondaryBorder: '#dfe9e1',
    buttonRadius: '14px',

    // Состояния календаря
    colorToday: '#2f7d53',
    colorOnToday: '#ffffff',
    colorSelected: '#dbeade',
    colorWeekend: '#9d6a52',
    colorTaskA: '#2f7d53',
    colorTaskB: '#c2703d',
    colorTaskC: '#c2a23d',
    colorDone: '#b9c9be',

    // Форма и типографика
    radiusSm: '8px',
    radiusMd: '13px',
    radiusLg: '20px',
    radiusPill: '999px',
    shadowCard: '0 6px 20px rgba(20, 67, 44, 0.08)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontFamilyHeading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontWeightHeading: '700',
    letterSpacingHeading: '-0.2px',

    // Нижняя навигация
    navBg: '#ffffff',
    navText: '#6f8778',
    navTextActive: '#14432c',
    navBorder: '#dfe9e1',
  },
};

export default theme;
