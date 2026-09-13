import type { Theme } from './types';

/** 16. Сакура — розовая палитра, лепестковые ячейки; кнопка «Сегодня» слева, месяц справа. */
const theme: Theme = {
  id: 'v16',
  name: 'Сакура',
  layout: '«Сегодня» слева, месяц справа',
  dark: false,
  tokens: {
    // Поверхности и текст
    colorBg: '#fff6f8',
    colorSurface: '#ffffff',
    colorSurfaceMuted: '#fdeaef',
    colorText: '#3d1f2b',
    colorTextMuted: '#a8798a',
    colorBorder: '#f6dde5',

    // Три ключевых цвета
    colorPrimary: '#e2688f',
    colorOnPrimary: '#3d1f2b',
    colorSecondary: '#b8375f',
    colorOnSecondary: '#ffffff',
    colorTertiary: '#8a5a7a',
    colorOnTertiary: '#ffffff',

    // Кнопки
    buttonPrimaryBg: '#e2688f',
    buttonPrimaryText: '#3d1f2b',
    buttonPrimaryBorder: 'transparent',
    buttonSecondaryBg: '#fde3ea',
    buttonSecondaryText: '#b8375f',
    buttonSecondaryBorder: 'transparent',
    buttonRadius: '16px',

    // Состояния календаря
    colorToday: '#e2688f',
    colorOnToday: '#3d1f2b',
    colorSelected: '#fde3ea',
    colorWeekend: '#b8375f',
    colorTaskA: '#e2688f',
    colorTaskB: '#8a5a7a',
    colorTaskC: '#b8375f',
    colorDone: '#e0c3cd',

    // Форма и типографика
    radiusSm: '10px',
    radiusMd: '16px',
    radiusLg: '24px',
    radiusPill: '999px',
    shadowCard: '0 10px 30px rgba(184, 55, 95, 0.08)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    fontFamilyHeading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    fontWeightHeading: '800',
    letterSpacingHeading: '-0.4px',

    // Нижняя навигация
    navBg: '#ffffff',
    navText: '#a8798a',
    navTextActive: '#b8375f',
    navBorder: '#f6dde5',
  },
};

export default theme;
