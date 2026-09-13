import type { Theme } from './types';

/** 09. Пастельные карточки — сиренево-пастельная палитра, карточки с мягкой тенью. */
const theme: Theme = {
  id: 'v09',
  name: 'Пастельные карточки',
  layout: 'шапка с тенью',
  dark: false,
  tokens: {
    // Поверхности и текст
    colorBg: '#f4f2fb',
    colorSurface: '#ffffff',
    colorSurfaceMuted: '#ece7fc',
    colorText: '#3b3550',
    colorTextMuted: '#9a94b4',
    colorBorder: '#eae6f6',

    // Три ключевых цвета
    colorPrimary: '#8f7ee0',
    colorOnPrimary: '#ffffff',
    colorSecondary: '#f4a6c0',
    colorOnSecondary: '#3b3550',
    colorTertiary: '#8fd8c4',
    colorOnTertiary: '#3b3550',

    // Кнопки
    buttonPrimaryBg: '#8f7ee0',
    buttonPrimaryText: '#ffffff',
    buttonPrimaryBorder: 'transparent',
    buttonSecondaryBg: '#ece7fc',
    buttonSecondaryText: '#3b3550',
    buttonSecondaryBorder: 'transparent',
    buttonRadius: '14px',

    // Состояния календаря
    colorToday: '#8f7ee0',
    colorOnToday: '#ffffff',
    colorSelected: '#ece7fc',
    colorWeekend: '#f4a6c0',
    colorTaskA: '#8f7ee0',
    colorTaskB: '#f4a6c0',
    colorTaskC: '#f6c96b',
    colorDone: '#8fd8c4',

    // Форма и типографика
    radiusSm: '12px',
    radiusMd: '14px',
    radiusLg: '22px',
    radiusPill: '999px',
    shadowCard: '0 10px 26px rgba(59, 53, 80, 0.1)',
    fontFamily: 'Nunito, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    fontFamilyHeading: 'Nunito, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    fontWeightHeading: '800',
    letterSpacingHeading: 'normal',

    // Нижняя навигация
    navBg: '#ffffff',
    navText: '#9a94b4',
    navTextActive: '#8f7ee0',
    navBorder: '#eae6f6',
  },
};

export default theme;
