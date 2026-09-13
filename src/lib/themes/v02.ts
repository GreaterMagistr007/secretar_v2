import type { Theme } from './types';

/** 02. Тёплый песок — бежевая палитра, серифный шрифт, крупный заголовок слева. */
const theme: Theme = {
  id: 'v02',
  name: 'Тёплый песок',
  layout: 'заголовок слева',
  dark: false,
  tokens: {
    // Поверхности и текст
    colorBg: '#f7f1e6',
    colorSurface: '#fffdf8',
    colorSurfaceMuted: '#f2e1cd',
    colorText: '#3a3027',
    colorTextMuted: '#a3927c',
    colorBorder: '#e6dbc7',

    // Три ключевых цвета
    colorPrimary: '#b4713a',
    colorOnPrimary: '#fffdf8',
    colorSecondary: '#f2e1cd',
    colorOnSecondary: '#3a3027',
    colorTertiary: '#a8572f',
    colorOnTertiary: '#fffdf8',

    // Кнопки
    buttonPrimaryBg: '#b4713a',
    buttonPrimaryText: '#fffdf8',
    buttonPrimaryBorder: 'transparent',
    buttonSecondaryBg: '#fffdf8',
    buttonSecondaryText: '#3a3027',
    buttonSecondaryBorder: '#e6dbc7',
    buttonRadius: '4px',

    // Состояния календаря
    colorToday: '#b4713a',
    colorOnToday: '#fffdf8',
    colorSelected: '#f2e1cd',
    colorWeekend: '#a8572f',
    colorTaskA: '#b4713a',
    colorTaskB: '#a8572f',
    colorTaskC: '#8c7a55',
    colorDone: '#a3927c',

    // Форма и типографика
    radiusSm: '3px',
    radiusMd: '4px',
    radiusLg: '6px',
    radiusPill: '999px',
    shadowCard: 'none',
    fontFamily: 'Georgia, Literata, "Times New Roman", serif',
    fontFamilyHeading: 'Georgia, Literata, "Times New Roman", serif',
    fontWeightHeading: '700',
    letterSpacingHeading: '-0.6px',

    // Нижняя навигация
    navBg: '#fffdf8',
    navText: '#a3927c',
    navTextActive: '#b4713a',
    navBorder: '#e6dbc7',
  },
};

export default theme;
