import type { Theme } from './types';

/** 23. Material 3 — сиреневые surface-контейнеры, крупные скругления, таблетки. */
const theme: Theme = {
  id: 'v23',
  name: 'Material 3',
  layout: 'скруглённые плашки',
  dark: false,
  tokens: {
    // Поверхности и текст
    colorBg: '#fef7ff',
    colorSurface: '#f3edf7',
    colorSurfaceMuted: '#ece6f0',
    colorText: '#1d1b20',
    colorTextMuted: '#49454f',
    colorBorder: '#cac4d0',

    // Три ключевых цвета
    colorPrimary: '#6750a4',
    colorOnPrimary: '#ffffff',
    colorSecondary: '#eaddff',
    colorOnSecondary: '#21005d',
    colorTertiary: '#2e6b4f',
    colorOnTertiary: '#ffffff',

    // Кнопки
    buttonPrimaryBg: '#6750a4',
    buttonPrimaryText: '#ffffff',
    buttonPrimaryBorder: 'transparent',
    buttonSecondaryBg: '#eaddff',
    buttonSecondaryText: '#21005d',
    buttonSecondaryBorder: 'transparent',
    buttonRadius: '999px',

    // Состояния календаря
    colorToday: '#6750a4',
    colorOnToday: '#ffffff',
    colorSelected: '#eaddff',
    colorWeekend: '#7d5260',
    colorTaskA: '#2e6b4f',
    colorTaskB: '#6750a4',
    colorTaskC: '#7d5260',
    colorDone: '#cac4d0',

    // Форма и типографика
    radiusSm: '8px',
    radiusMd: '16px',
    radiusLg: '28px',
    radiusPill: '999px',
    shadowCard: '0 1px 2px rgba(0, 0, 0, 0.08)',
    fontFamily: 'Roboto, -apple-system, "Segoe UI", Arial, sans-serif',
    fontFamilyHeading: 'Roboto, -apple-system, "Segoe UI", Arial, sans-serif',
    fontWeightHeading: '500',
    letterSpacingHeading: '0',

    // Нижняя навигация
    navBg: '#f3edf7',
    navText: '#49454f',
    navTextActive: '#6750a4',
    navBorder: '#cac4d0',
  },
};

export default theme;
