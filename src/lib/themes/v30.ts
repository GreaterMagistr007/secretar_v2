import type { Theme } from './types';

/** 30. Королевский — тёмно-синий с золотом, засечки в заголовке, почти прямые углы. */
const theme: Theme = {
  id: 'v30',
  name: 'Королевский',
  layout: 'тёмно-синий с золотом',
  dark: true,
  tokens: {
    // Поверхности и текст
    colorBg: 'radial-gradient(90% 45% at 50% 0%, #16274f 0%, #0b1530 70%)',
    colorSurface: '#122043',
    colorSurfaceMuted: '#16274f',
    colorText: '#eef2fb',
    colorTextMuted: '#8a9bc4',
    colorBorder: '#2a3d6b',

    // Три ключевых цвета
    colorPrimary: '#d5b168',
    colorOnPrimary: '#1a1405',
    colorSecondary: '#16274f',
    colorOnSecondary: '#f0dca8',
    colorTertiary: '#f0dca8',
    colorOnTertiary: '#1a1405',

    // Кнопки
    buttonPrimaryBg: '#d5b168',
    buttonPrimaryText: '#1a1405',
    buttonPrimaryBorder: 'transparent',
    buttonSecondaryBg: 'transparent',
    buttonSecondaryText: '#8a9bc4',
    buttonSecondaryBorder: '#2a3d6b',
    buttonRadius: '3px',

    // Состояния календаря
    colorToday: '#25386c',
    colorOnToday: '#f0dca8',
    colorSelected: '#25386c',
    colorWeekend: '#d5b168',
    colorTaskA: '#d5b168',
    colorTaskB: '#f0dca8',
    colorTaskC: '#8a9bc4',
    colorDone: '#3c4c76',

    // Форма и типографика
    radiusSm: '2px',
    radiusMd: '3px',
    radiusLg: '4px',
    radiusPill: '999px',
    shadowCard: '0 0 12px rgba(213, 177, 104, 0.3)',
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontFamilyHeading: 'Georgia, "Times New Roman", serif',
    fontWeightHeading: '400',
    letterSpacingHeading: '0.02em',

    // Нижняя навигация
    navBg: '#122043',
    navText: '#8a9bc4',
    navTextActive: '#d5b168',
    navBorder: '#2a3d6b',
  },
};

export default theme;
