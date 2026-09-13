import type { Theme } from './types';

/** 21. Полночь — глубокая тёмно-синяя палитра, крупный тонкий заголовок месяца. */
const theme: Theme = {
  id: 'v21',
  name: 'Полночь',
  layout: 'крупный тонкий месяц',
  dark: true,
  tokens: {
    // Поверхности и текст
    colorBg: 'radial-gradient(120% 60% at 50% 0%, #101a36 0%, #070b18 60%)',
    colorSurface: '#0d1428',
    colorSurfaceMuted: '#121a33',
    colorText: '#e8ecf8',
    colorTextMuted: '#5a678c',
    colorBorder: '#1b2542',

    // Три ключевых цвета
    colorPrimary: '#6f8dff',
    colorOnPrimary: '#070b18',
    colorSecondary: '#3a4d94',
    colorOnSecondary: '#e8ecf8',
    colorTertiary: '#9db2ff',
    colorOnTertiary: '#070b18',

    // Кнопки
    buttonPrimaryBg: '#6f8dff',
    buttonPrimaryText: '#070b18',
    buttonPrimaryBorder: 'transparent',
    buttonSecondaryBg: 'transparent',
    buttonSecondaryText: '#e8ecf8',
    buttonSecondaryBorder: '#1b2542',
    buttonRadius: '999px',

    // Состояния календаря
    colorToday: '#1d2a52',
    colorOnToday: '#9db2ff',
    colorSelected: '#3a4d94',
    colorWeekend: '#8296cc',
    colorTaskA: '#6f8dff',
    colorTaskB: '#9db2ff',
    colorTaskC: '#3a4d94',
    colorDone: '#2c3559',

    // Форма и типографика
    radiusSm: '8px',
    radiusMd: '12px',
    radiusLg: '22px',
    radiusPill: '999px',
    shadowCard: 'none',
    fontFamily: '-apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    fontFamilyHeading: '-apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    fontWeightHeading: '200',
    letterSpacingHeading: '-0.02em',

    // Нижняя навигация
    navBg: '#0d1428',
    navText: '#5a678c',
    navTextActive: '#9db2ff',
    navBorder: '#1b2542',
  },
};

export default theme;
