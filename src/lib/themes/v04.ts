import type { Theme } from './types';

/** 04. Мятный сад — зелёная палитра, компактная шапка и сегменты. */
const theme: Theme = {
  id: 'v04',
  name: 'Мятный сад',
  layout: 'сегментированный переключатель',
  dark: false,
  tokens: {
    // Поверхности и текст
    colorBg: '#f2f8f3',
    colorSurface: '#ffffff',
    colorSurfaceMuted: '#dcefe3',
    colorText: '#1e3326',
    colorTextMuted: '#7d9a86',
    colorBorder: '#dbe9de',

    // Три ключевых цвета
    colorPrimary: '#2e8b57',
    colorOnPrimary: '#ffffff',
    colorSecondary: '#dcefe3',
    colorOnSecondary: '#1e3326',
    colorTertiary: '#d8a33c',
    colorOnTertiary: '#1e3326',

    // Кнопки
    buttonPrimaryBg: '#2e8b57',
    buttonPrimaryText: '#ffffff',
    buttonPrimaryBorder: 'transparent',
    buttonSecondaryBg: '#dcefe3',
    buttonSecondaryText: '#1e3326',
    buttonSecondaryBorder: '#2e8b57',
    buttonRadius: '9px',

    // Состояния календаря
    colorToday: '#2e8b57',
    colorOnToday: '#ffffff',
    colorSelected: '#dcefe3',
    colorWeekend: '#8fae99',
    colorTaskA: '#2e8b57',
    colorTaskB: '#8fbf6e',
    colorTaskC: '#d8a33c',
    colorDone: '#7d9a86',

    // Форма и типографика
    radiusSm: '9px',
    radiusMd: '11px',
    radiusLg: '14px',
    radiusPill: '999px',
    shadowCard: 'none',
    fontFamily: '-apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    fontFamilyHeading: '-apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    fontWeightHeading: '700',
    letterSpacingHeading: '-0.3px',

    // Нижняя навигация
    navBg: '#ffffff',
    navText: '#7d9a86',
    navTextActive: '#2e8b57',
    navBorder: '#dbe9de',
  },
};

export default theme;
