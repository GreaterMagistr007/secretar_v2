import type { Theme } from './types';

/** 12. Бирюза — тёплый бирюзовый на почти белом, колонка номеров недель слева. */
const theme: Theme = {
  id: 'v12',
  name: 'Бирюза',
  layout: 'колонка номеров недель',
  dark: false,
  tokens: {
    // Поверхности и текст
    colorBg: '#f3fbfb',
    colorSurface: '#ffffff',
    colorSurfaceMuted: '#eef7f6',
    colorText: '#06322f',
    colorTextMuted: '#5d8b88',
    colorBorder: '#dcefee',

    // Три ключевых цвета
    colorPrimary: '#0d8b86',
    colorOnPrimary: '#ffffff',
    colorSecondary: '#075c59',
    colorOnSecondary: '#d6f1ef',
    colorTertiary: '#e0755a',
    colorOnTertiary: '#3d1408',

    // Кнопки
    buttonPrimaryBg: '#0d8b86',
    buttonPrimaryText: '#ffffff',
    buttonPrimaryBorder: '#0d8b86',
    buttonSecondaryBg: '#ffffff',
    buttonSecondaryText: '#075c59',
    buttonSecondaryBorder: '#dcefee',
    buttonRadius: '13px',

    // Состояния календаря
    colorToday: '#0d8b86',
    colorOnToday: '#ffffff',
    colorSelected: '#d6f1ef',
    colorWeekend: '#e0755a',
    colorTaskA: '#0d8b86',
    colorTaskB: '#e0755a',
    colorTaskC: '#e0b45a',
    colorDone: '#b7d3d1',

    // Форма и типографика
    radiusSm: '7px',
    radiusMd: '13px',
    radiusLg: '20px',
    radiusPill: '999px',
    shadowCard: '0 8px 22px rgba(13, 139, 134, 0.07)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    fontFamilyHeading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    fontWeightHeading: '800',
    letterSpacingHeading: '-0.6px',

    // Нижняя навигация
    navBg: '#ffffff',
    navText: '#5d8b88',
    navTextActive: '#0d8b86',
    navBorder: '#dcefee',
  },
};

export default theme;
