import type { Theme } from './types';

/** 20. Неон — тёмная тема со свечением: мятный, фиолетовый и розовый акценты на почти чёрном. */
const theme: Theme = {
  id: 'v20',
  name: 'Неон',
  layout: 'тёмная тема со свечением',
  dark: true,
  tokens: {
    // Поверхности и текст
    colorBg: '#0a0c14',
    colorSurface: '#12151f',
    colorSurfaceMuted: '#161a26',
    colorText: '#e8ecf8',
    colorTextMuted: '#6f7893',
    colorBorder: '#222838',

    // Три ключевых цвета
    colorPrimary: '#37f5c5',
    colorOnPrimary: '#06241d',
    colorSecondary: '#b46cff',
    colorOnSecondary: '#1b0a33',
    colorTertiary: '#ff4f9a',
    colorOnTertiary: '#3d0620',

    // Кнопки
    buttonPrimaryBg: 'rgba(55, 245, 197, 0.12)',
    buttonPrimaryText: '#37f5c5',
    buttonPrimaryBorder: '#37f5c5',
    buttonSecondaryBg: '#161a26',
    buttonSecondaryText: '#e8ecf8',
    buttonSecondaryBorder: '#222838',
    buttonRadius: '12px',

    // Состояния календаря
    colorToday: '#37f5c5',
    colorOnToday: '#06241d',
    colorSelected: '#b46cff',
    colorWeekend: '#ff4f9a',
    colorTaskA: '#37f5c5',
    colorTaskB: '#b46cff',
    colorTaskC: '#ff4f9a',
    colorDone: '#39405a',

    // Форма и типографика
    radiusSm: '8px',
    radiusMd: '12px',
    radiusLg: '20px',
    radiusPill: '999px',
    shadowCard: '0 0 24px rgba(55, 245, 197, 0.12), 0 16px 40px rgba(0, 0, 0, 0.5)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    fontFamilyHeading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    fontWeightHeading: '800',
    letterSpacingHeading: '-0.4px',

    // Нижняя навигация
    navBg: '#12151f',
    navText: '#6f7893',
    navTextActive: '#37f5c5',
    navBorder: '#222838',
  },
};

export default theme;
