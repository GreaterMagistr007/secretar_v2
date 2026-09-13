import type { Theme } from './types';

/** 17. Брутализм — чёрно-жёлтая моноширинная вёрстка, толстые границы и жёсткие тени без скруглений. */
const theme: Theme = {
  id: 'v17',
  name: 'Брутализм',
  layout: 'чёрно-жёлтый моноширинный',
  dark: false,
  tokens: {
    // Поверхности и текст
    colorBg: '#f4f2e9',
    colorSurface: '#ffffff',
    colorSurfaceMuted: '#dedbd1',
    colorText: '#0a0a0a',
    colorTextMuted: '#8d8a80',
    colorBorder: '#0a0a0a',

    // Три ключевых цвета
    colorPrimary: '#ffe000',
    colorOnPrimary: '#0a0a0a',
    colorSecondary: '#0a0a0a',
    colorOnSecondary: '#ffe000',
    colorTertiary: '#e03c00',
    colorOnTertiary: '#ffffff',

    // Кнопки
    buttonPrimaryBg: '#ffe000',
    buttonPrimaryText: '#0a0a0a',
    buttonPrimaryBorder: '#0a0a0a',
    buttonSecondaryBg: '#ffffff',
    buttonSecondaryText: '#0a0a0a',
    buttonSecondaryBorder: '#0a0a0a',
    buttonRadius: '0',

    // Состояния календаря
    colorToday: '#ffe000',
    colorOnToday: '#0a0a0a',
    colorSelected: '#e03c00',
    colorWeekend: '#e03c00',
    colorTaskA: '#0a0a0a',
    colorTaskB: '#e03c00',
    colorTaskC: '#e0c300',
    colorDone: '#8d8a80',

    // Форма и типографика
    radiusSm: '0',
    radiusMd: '0',
    radiusLg: '0',
    radiusPill: '0',
    shadowCard: '6px 6px 0 #0a0a0a',
    fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, "Liberation Mono", "Courier New", monospace',
    fontFamilyHeading: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, "Liberation Mono", "Courier New", monospace',
    fontWeightHeading: '800',
    letterSpacingHeading: '-1px',

    // Нижняя навигация
    navBg: '#0a0a0a',
    navText: '#8d8a80',
    navTextActive: '#ffe000',
    navBorder: '#0a0a0a',
  },
};

export default theme;
