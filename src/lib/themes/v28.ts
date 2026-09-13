import type { Theme } from './types';

/** 28. Закат — градиент от оранжевого к пурпурному, белые карточки с мягкими тенями. */
const theme: Theme = {
  id: 'v28',
  name: 'Закат',
  layout: 'градиентная шапка и карточка-сетка',
  dark: false,
  tokens: {
    // Поверхности и текст
    // В макете градиент — только шапка (.hero), фон страницы светлый (--bg: #fff6f1).
    // Градиент в фоне экрана делал тёмный основной текст нечитаемым (контраст 3.4:1).
    colorBg: '#fff6f1',
    colorSurface: '#ffffff',
    colorSurfaceMuted: '#fff1ec',
    colorText: '#3a2230',
    colorTextMuted: '#a2818f',
    colorBorder: '#f6e2e0',

    // Три ключевых цвета
    colorPrimary: '#ef5f7a',
    colorOnPrimary: '#ffffff',
    colorSecondary: '#ff8a4c',
    colorOnSecondary: '#3a2230',
    colorTertiary: '#c74ba6',
    colorOnTertiary: '#ffffff',

    // Кнопки
    buttonPrimaryBg: '#ef5f7a',
    buttonPrimaryText: '#ffffff',
    buttonPrimaryBorder: 'transparent',
    buttonSecondaryBg: '#fff1ec',
    buttonSecondaryText: '#ef5f7a',
    buttonSecondaryBorder: 'transparent',
    buttonRadius: '16px',

    // Состояния календаря
    colorToday: '#ff5f8d',
    colorOnToday: '#ffffff',
    colorSelected: '#fff1ec',
    colorWeekend: '#c74ba6',
    colorTaskA: '#ef5f7a',
    colorTaskB: '#ff8a4c',
    colorTaskC: '#c74ba6',
    colorDone: '#e0cbd3',

    // Форма и типографика
    radiusSm: '13px',
    radiusMd: '18px',
    radiusLg: '24px',
    radiusPill: '999px',
    shadowCard: '0 12px 30px rgba(199, 75, 166, 0.16)',
    fontFamily: '-apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    fontFamilyHeading: '-apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    fontWeightHeading: '700',
    letterSpacingHeading: '-0.5px',

    // Нижняя навигация
    navBg: '#ffffff',
    navText: '#a2818f',
    navTextActive: '#ef5f7a',
    navBorder: '#f6e2e0',
  },
};

export default theme;
