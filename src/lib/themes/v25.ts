import type { Theme } from './types';

/** 25. Изумруд — светлый мятный фон, тёмно-зелёная панель и сочный изумрудный акцент. */
const theme: Theme = {
  id: 'v25',
  name: 'Изумруд',
  layout: 'месяц вертикально сбоку',
  dark: false,
  tokens: {
    // Поверхности и текст
    colorBg: '#f2f7f4',
    colorSurface: '#ffffff',
    colorSurfaceMuted: '#d7f0e4',
    colorText: '#0d211c',
    colorTextMuted: '#6d8a80',
    colorBorder: '#e2ece8',

    // Три ключевых цвета
    colorPrimary: '#12a06f',
    colorOnPrimary: '#ffffff',
    colorSecondary: '#0f3d31',
    colorOnSecondary: '#eafaf2',
    colorTertiary: '#d7f0e4',
    colorOnTertiary: '#0a6b48',

    // Кнопки
    buttonPrimaryBg: '#12a06f',
    buttonPrimaryText: '#ffffff',
    buttonPrimaryBorder: 'transparent',
    buttonSecondaryBg: '#d7f0e4',
    buttonSecondaryText: '#0a6b48',
    buttonSecondaryBorder: 'transparent',
    buttonRadius: '999px',

    // Состояния календаря
    colorToday: '#12a06f',
    colorOnToday: '#ffffff',
    colorSelected: '#d7f0e4',
    colorWeekend: '#6d8a80',
    colorTaskA: '#9fe0c4',
    colorTaskB: '#35bd8a',
    colorTaskC: '#0a6b48',
    colorDone: '#bcccc6',

    // Форма и типографика
    radiusSm: '9px',
    radiusMd: '14px',
    radiusLg: '18px',
    radiusPill: '999px',
    shadowCard: '0 1px 1px rgba(15, 61, 49, 0.06)',
    fontFamily: '-apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    fontFamilyHeading: '-apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    fontWeightHeading: '600',
    letterSpacingHeading: '0.04em',

    // Нижняя навигация
    navBg: '#ffffff',
    navText: '#6d8a80',
    navTextActive: '#12a06f',
    navBorder: '#e2ece8',
  },
};

export default theme;
