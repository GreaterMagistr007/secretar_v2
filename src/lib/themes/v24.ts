import type { Theme } from './types';

/** 24. Бумага — бежевая газетная вёрстка: засечки, тонкие линейки, кирпичный акцент. */
const theme: Theme = {
  id: 'v24',
  name: 'Бумага',
  layout: 'газетная типографика',
  dark: false,
  tokens: {
    // Поверхности и текст
    colorBg: '#f4efe4',
    colorSurface: '#faf6ec',
    colorSurfaceMuted: '#ebe3d3',
    colorText: '#1f1b16',
    colorTextMuted: '#8a7f6d',
    colorBorder: '#c9bda6',

    // Три ключевых цвета
    colorPrimary: '#1f1b16',
    colorOnPrimary: '#f4efe4',
    colorSecondary: '#8c2f22',
    colorOnSecondary: '#f4efe4',
    colorTertiary: '#c9bda6',
    colorOnTertiary: '#1f1b16',

    // Кнопки
    buttonPrimaryBg: '#1f1b16',
    buttonPrimaryText: '#f4efe4',
    buttonPrimaryBorder: '#1f1b16',
    buttonSecondaryBg: 'transparent',
    buttonSecondaryText: '#1f1b16',
    buttonSecondaryBorder: '#1f1b16',
    buttonRadius: '0',

    // Состояния календаря
    colorToday: '#ebe3d3',
    colorOnToday: '#8c2f22',
    colorSelected: '#ebe3d3',
    colorWeekend: '#8c2f22',
    colorTaskA: '#8c2f22',
    colorTaskB: '#1f1b16',
    colorTaskC: '#8a7f6d',
    colorDone: '#c4b9a4',

    // Форма и типографика
    radiusSm: '0',
    radiusMd: '0',
    radiusLg: '0',
    radiusPill: '0',
    shadowCard: '6px 6px 0 rgba(31, 27, 22, 0.25)',
    fontFamily: 'Georgia, Literata, "Times New Roman", serif',
    fontFamilyHeading: 'Georgia, Literata, "Times New Roman", serif',
    fontWeightHeading: '400',
    letterSpacingHeading: '-0.01em',

    // Нижняя навигация
    navBg: '#f4efe4',
    navText: '#8a7f6d',
    navTextActive: '#8c2f22',
    navBorder: '#1f1b16',
  },
};

export default theme;
