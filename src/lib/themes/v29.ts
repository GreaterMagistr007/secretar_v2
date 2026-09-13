import type { Theme } from './types';

/** 29. Сталь — плотная деловая таблица: холодный серый фон, узкие скругления, пастельные метки. */
const theme: Theme = {
  id: 'v29',
  name: 'Сталь',
  layout: 'плотная сетка с номерами недель',
  dark: false,
  tokens: {
    // Поверхности и текст
    colorBg: '#e9edf1',
    colorSurface: '#fbfcfd',
    colorSurfaceMuted: '#eff3f7',
    colorText: '#212a33',
    colorTextMuted: '#78848f',
    colorBorder: '#cdd6de',

    // Три ключевых цвета
    colorPrimary: '#4a6274',
    colorOnPrimary: '#eef4f8',
    colorSecondary: '#dde5ec',
    colorOnSecondary: '#3b4b57',
    colorTertiary: '#7a93a6',
    colorOnTertiary: '#212a33',

    // Кнопки
    buttonPrimaryBg: '#4a6274',
    buttonPrimaryText: '#eef4f8',
    buttonPrimaryBorder: 'transparent',
    buttonSecondaryBg: '#eff3f7',
    buttonSecondaryText: '#4a6274',
    buttonSecondaryBorder: '#cdd6de',
    buttonRadius: '7px',

    // Состояния календаря
    colorToday: '#dceaf4',
    colorOnToday: '#4a6274',
    colorSelected: '#dceaf4',
    colorWeekend: '#78848f',
    colorTaskA: '#cfe0ec',
    colorTaskB: '#e0d9cd',
    colorTaskC: '#d3e3d6',
    colorDone: '#b3bfc9',

    // Форма и типографика
    radiusSm: '3px',
    radiusMd: '7px',
    radiusLg: '10px',
    radiusPill: '999px',
    shadowCard: 'none',
    fontFamily: '-apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    fontFamilyHeading: '-apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    fontWeightHeading: '700',
    letterSpacingHeading: '-0.2px',

    // Нижняя навигация
    navBg: '#fbfcfd',
    navText: '#78848f',
    navTextActive: '#4a6274',
    navBorder: '#cdd6de',
  },
};

export default theme;
