import type { Theme } from './types';

/** 27. Высокий контраст — чёрное на белом, жирные рамки, один жёлтый акцент, прямые углы. */
const theme: Theme = {
  id: 'v27',
  name: 'Высокий контраст',
  layout: 'крупная доступная сетка',
  dark: false,
  tokens: {
    // Поверхности и текст
    colorBg: '#ffffff',
    colorSurface: '#ffffff',
    colorSurfaceMuted: '#f0f0f0',
    colorText: '#000000',
    colorTextMuted: '#666666',
    colorBorder: '#000000',

    // Три ключевых цвета
    colorPrimary: '#ffd400',
    colorOnPrimary: '#000000',
    colorSecondary: '#000000',
    colorOnSecondary: '#ffffff',
    colorTertiary: '#f0f0f0',
    colorOnTertiary: '#000000',

    // Кнопки
    buttonPrimaryBg: '#000000',
    buttonPrimaryText: '#ffffff',
    buttonPrimaryBorder: '#000000',
    buttonSecondaryBg: '#ffd400',
    buttonSecondaryText: '#000000',
    buttonSecondaryBorder: '#000000',
    buttonRadius: '0',

    // Состояния календаря
    colorToday: '#ffd400',
    colorOnToday: '#000000',
    colorSelected: '#ffd400',
    colorWeekend: '#666666',
    colorTaskA: '#000000',
    colorTaskB: '#8a6d00',
    colorTaskC: '#666666',
    colorDone: '#9a9a9a',

    // Форма и типографика
    radiusSm: '0',
    radiusMd: '0',
    radiusLg: '0',
    radiusPill: '0',
    shadowCard: 'none',
    fontFamily: '-apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    fontFamilyHeading: '-apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    fontWeightHeading: '900',
    letterSpacingHeading: '-0.5px',

    // Нижняя навигация
    navBg: '#ffffff',
    navText: '#666666',
    navTextActive: '#000000',
    navBorder: '#000000',
  },
};

export default theme;
