import type { Theme } from './types';

/** 10. Фиолетовый блок — контрастная фиолетовая шапка, белая сетка под ней. */
const theme: Theme = {
  id: 'v10',
  name: 'Фиолетовый блок',
  layout: 'акцентная шапка',
  dark: false,
  tokens: {
    // Поверхности и текст
    colorBg: '#ffffff',
    colorSurface: '#ffffff',
    colorSurfaceMuted: '#f1ebfe',
    colorText: '#241543',
    colorTextMuted: '#8f85a8',
    colorBorder: '#ece8f6',

    // Три ключевых цвета
    colorPrimary: '#7c3aed',
    colorOnPrimary: '#ffffff',
    colorSecondary: '#5b21b6',
    colorOnSecondary: '#ffffff',
    colorTertiary: '#b09bd8',
    colorOnTertiary: '#241543',

    // Кнопки
    buttonPrimaryBg: '#7c3aed',
    buttonPrimaryText: '#ffffff',
    buttonPrimaryBorder: 'transparent',
    buttonSecondaryBg: '#f1ebfe',
    buttonSecondaryText: '#5b21b6',
    buttonSecondaryBorder: 'transparent',
    buttonRadius: '9px',

    // Состояния календаря
    colorToday: '#7c3aed',
    colorOnToday: '#ffffff',
    colorSelected: '#f1ebfe',
    colorWeekend: '#b09bd8',
    colorTaskA: '#7c3aed',
    colorTaskB: '#5b21b6',
    colorTaskC: '#b09bd8',
    colorDone: '#8f85a8',

    // Форма и типографика
    radiusSm: '9px',
    radiusMd: '10px',
    radiusLg: '16px',
    radiusPill: '999px',
    shadowCard: 'none',
    fontFamily: '-apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    fontFamilyHeading: '-apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    fontWeightHeading: '700',
    letterSpacingHeading: '-0.2px',

    // Нижняя навигация
    navBg: '#ffffff',
    navText: '#8f85a8',
    navTextActive: '#7c3aed',
    navBorder: '#ece8f6',
  },
};

export default theme;
