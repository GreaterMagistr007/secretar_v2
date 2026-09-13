import type { Theme } from './types';

/** 18. Стекло — полупрозрачные панели на фиолетовом градиенте, размытая шапка. */
const theme: Theme = {
  id: 'v18',
  name: 'Стекло',
  layout: 'размытая шапка на градиенте',
  dark: true,
  tokens: {
    // Поверхности и текст
    colorBg: 'linear-gradient(160deg, #3b2a8c 0%, #5b31a8 42%, #2a2a78 100%)',
    colorSurface: 'rgba(255, 255, 255, 0.13)',
    colorSurfaceMuted: 'rgba(255, 255, 255, 0.08)',
    colorText: '#f2f0ff',
    colorTextMuted: 'rgba(242, 240, 255, 0.62)',
    colorBorder: 'rgba(255, 255, 255, 0.24)',

    // Три ключевых цвета
    colorPrimary: '#8ef0d8',
    colorOnPrimary: '#173a35',
    colorSecondary: '#ffb3e6',
    colorOnSecondary: '#3d1030',
    colorTertiary: '#9ecdff',
    colorOnTertiary: '#12305a',

    // Кнопки
    buttonPrimaryBg: '#8ef0d8',
    buttonPrimaryText: '#173a35',
    buttonPrimaryBorder: 'transparent',
    buttonSecondaryBg: 'rgba(255, 255, 255, 0.13)',
    buttonSecondaryText: '#f2f0ff',
    buttonSecondaryBorder: 'rgba(255, 255, 255, 0.24)',
    buttonRadius: '999px',

    // Состояния календаря
    colorToday: '#8ef0d8',
    colorOnToday: '#173a35',
    colorSelected: '#ffb3e6',
    colorWeekend: '#ffb3e6',
    colorTaskA: '#8ef0d8',
    colorTaskB: '#ffb3e6',
    colorTaskC: '#9ecdff',
    colorDone: 'rgba(242, 240, 255, 0.3)',

    // Форма и типографика
    radiusSm: '10px',
    radiusMd: '14px',
    radiusLg: '22px',
    radiusPill: '999px',
    shadowCard: '0 16px 40px rgba(20, 10, 60, 0.35)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    fontFamilyHeading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    fontWeightHeading: '700',
    letterSpacingHeading: '-0.3px',

    // Нижняя навигация
    navBg: 'rgba(255, 255, 255, 0.11)',
    navText: 'rgba(242, 240, 255, 0.62)',
    navTextActive: '#8ef0d8',
    navBorder: 'rgba(255, 255, 255, 0.24)',
  },
};

export default theme;
