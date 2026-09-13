import type { Theme } from './types';

/** 08. Тихий минимализм — почти монохром, нулевые скругления, только тонкие линии. */
const theme: Theme = {
  id: 'v08',
  name: 'Тихий минимализм',
  layout: 'тонкие линии',
  dark: false,
  tokens: {
    // Поверхности и текст
    colorBg: '#fbfbfa',
    colorSurface: '#fbfbfa',
    colorSurfaceMuted: '#f1f1ee',
    colorText: '#161616',
    colorTextMuted: '#9b9b98',
    colorBorder: '#e8e8e5',

    // Три ключевых цвета
    colorPrimary: '#161616',
    colorOnPrimary: '#fbfbfa',
    colorSecondary: '#e8e8e5',
    colorOnSecondary: '#161616',
    colorTertiary: '#9b9b98',
    colorOnTertiary: '#161616',

    // Кнопки
    buttonPrimaryBg: '#161616',
    buttonPrimaryText: '#fbfbfa',
    buttonPrimaryBorder: 'transparent',
    buttonSecondaryBg: '#fbfbfa',
    buttonSecondaryText: '#161616',
    buttonSecondaryBorder: '#e8e8e5',
    buttonRadius: '0px',

    // Состояния календаря
    colorToday: '#161616',
    colorOnToday: '#fbfbfa',
    colorSelected: '#e8e8e5',
    colorWeekend: '#9b9b98',
    colorTaskA: '#161616',
    colorTaskB: '#5a5a58',
    colorTaskC: '#9b9b98',
    colorDone: '#c9c9c5',

    // Форма и типографика
    radiusSm: '0px',
    radiusMd: '0px',
    radiusLg: '0px',
    radiusPill: '999px',
    shadowCard: 'none',
    fontFamily: '"Helvetica Neue", Helvetica, Arimo, Arial, sans-serif',
    fontFamilyHeading: '"Helvetica Neue", Helvetica, Arimo, Arial, sans-serif',
    fontWeightHeading: '400',
    letterSpacingHeading: '0.4px',

    // Нижняя навигация
    navBg: '#fbfbfa',
    navText: '#9b9b98',
    navTextActive: '#161616',
    navBorder: '#e8e8e5',
  },
};

export default theme;
