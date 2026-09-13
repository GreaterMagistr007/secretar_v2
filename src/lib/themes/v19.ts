import type { Theme } from './types';

/** 19. Терракота — тёплая глиняная палитра, каждая неделя отдельной карточкой. */
const theme: Theme = {
  id: 'v19',
  name: 'Терракота',
  layout: 'недели-карточки',
  dark: false,
  tokens: {
    // Поверхности и текст
    colorBg: '#fbf4ee',
    colorSurface: '#ffffff',
    colorSurfaceMuted: '#f4eae1',
    colorText: '#3a2018',
    colorTextMuted: '#a1796a',
    colorBorder: '#efdccf',

    // Три ключевых цвета
    colorPrimary: '#c0562f',
    colorOnPrimary: '#ffffff',
    colorSecondary: '#8c3a1c',
    colorOnSecondary: '#ffffff',
    colorTertiary: '#7e8a4b',
    colorOnTertiary: '#1b2109',

    // Кнопки
    buttonPrimaryBg: '#c0562f',
    buttonPrimaryText: '#ffffff',
    buttonPrimaryBorder: '#c0562f',
    buttonSecondaryBg: '#f6e0d4',
    buttonSecondaryText: '#8c3a1c',
    buttonSecondaryBorder: 'transparent',
    buttonRadius: '15px',

    // Состояния календаря
    colorToday: '#c0562f',
    colorOnToday: '#ffffff',
    colorSelected: '#f6e0d4',
    colorWeekend: '#c0562f',
    colorTaskA: '#c0562f',
    colorTaskB: '#7e8a4b',
    colorTaskC: '#c9922f',
    colorDone: '#d8c0b4',

    // Форма и типографика
    radiusSm: '8px',
    radiusMd: '14px',
    radiusLg: '18px',
    radiusPill: '999px',
    shadowCard: '0 6px 16px rgba(140, 58, 28, 0.06)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    fontFamilyHeading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    fontWeightHeading: '800',
    letterSpacingHeading: '-0.6px',

    // Нижняя навигация
    navBg: '#ffffff',
    navText: '#a1796a',
    navTextActive: '#c0562f',
    navBorder: '#efdccf',
  },
};

export default theme;
