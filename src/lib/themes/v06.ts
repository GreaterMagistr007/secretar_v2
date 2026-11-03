import type { Theme } from './types';

/** 06. Коралловый риф — тёплая коралловая палитра, заголовок-«таблетка», крупные ячейки. */
const theme: Theme = {
  id: 'v06',
  name: 'Коралловый риф',
  layout: 'месяц-таблетка',
  dark: false,
  tokens: {
    // Поверхности и текст
    colorBg: '#fff6f3',
    colorSurface: '#ffffff',
    colorSurfaceMuted: '#ffe4de',
    colorText: '#3d2320',
    colorTextMuted: '#b58278',
    colorBorder: '#ffe0d8',

    // Три ключевых цвета
    colorPrimary: '#ff5c48',
    colorOnPrimary: '#ffffff',
    colorSecondary: '#ffe4de',
    colorOnSecondary: '#3d2320',
    colorTertiary: '#ff8a72',
    colorOnTertiary: '#3d2320',

    // Кнопки
    buttonPrimaryBg: '#ff5c48',
    buttonPrimaryText: '#ffffff',
    buttonPrimaryBorder: 'transparent',
    buttonSecondaryBg: '#ffffff',
    buttonSecondaryText: '#ff5c48',
    buttonSecondaryBorder: 'transparent',
    buttonRadius: '999px',

    // Состояния календаря
    colorToday: '#ff5c48',
    colorOnToday: '#ffffff',
    colorSelected: '#ffe4de',
    colorWeekend: '#ff503c',
    colorTaskA: '#ff6f5e',
    colorTaskB: '#ff8a72',
    colorTaskC: '#d6503f',
    colorDone: '#b9887f',

    // Форма и типографика
    radiusSm: '12px',
    radiusMd: '16px',
    radiusLg: '26px',
    radiusPill: '999px',
    shadowCard: '0 6px 16px rgba(214, 80, 63, 0.28)',
    fontFamily: '-apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    fontFamilyHeading: '-apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    fontWeightHeading: '700',
    letterSpacingHeading: 'normal',

    // Нижняя навигация
    navBg: '#ffffff',
    navText: '#b9887f',
    navTextActive: '#ff5c48',
    navBorder: '#ffe0d8',
  },
};

export default theme;
