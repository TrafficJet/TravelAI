export const lightColors = {
  // Backgrounds
  background: '#F5F5FA',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  elevated: '#F0F0F8',
  overlay: 'rgba(0,0,0,0.5)',

  // Primary — Amber, dark enough for white backgrounds
  primary: '#D97706',
  primaryLight: '#E8A020',
  primaryDark: '#B45309',
  primaryMuted: 'rgba(217,119,6,0.12)',

  // Secondary — Void Plum
  secondary: '#7C5CFC',
  secondaryLight: '#7C5CFC',
  secondaryDark: '#5A3DD4',

  // Text
  text: '#0F0F1A',
  textSecondary: '#4A4A62',
  textMuted: '#6B6B82',
  textDisabled: '#A0A0B8',
  textInverse: '#F4F4F8',

  // Borders
  border: '#E2E2F0',
  divider: '#EEEEF8',

  // Semantic
  success: '#059669',
  successLight: 'rgba(5,150,105,0.1)',
  warning: '#D97706',
  warningLight: 'rgba(217,119,6,0.1)',
  error: '#DC2626',
  errorLight: 'rgba(220,38,38,0.1)',
  info: '#0284C7',
  infoLight: 'rgba(2,132,199,0.1)',

  // Gradients
  gradientStart: '#F5F5FA',
  gradientEnd: '#EEF2FF',
};

export const darkColors = {
  // Backgrounds — BRANDBOOK v1.2
  background: '#0E0C1C',
  surface: '#14121E',
  card: '#1E1C2C',
  elevated: '#28263A',
  overlay: 'rgba(14,12,28,0.75)',

  // Primary — SVIT Gold
  primary: '#E8A020',
  primaryLight: '#F2B84B',
  primaryDark: '#B87518',
  primaryMuted: 'rgba(232,160,32,0.15)',

  // Secondary — Void Plum
  secondary: '#7C5CFC',
  secondaryLight: '#A98EFD',
  secondaryDark: '#5A3DD4',

  // Text
  text: '#EEEEF4',
  textSecondary: '#C4C4D8',
  textMuted: '#8888A8',
  textDisabled: '#4E4E68',
  textInverse: '#0E0C1C',

  // Borders
  border: '#2E2B42',
  divider: '#1E1C2C',

  // Semantic
  success: '#10B981',
  successLight: 'rgba(16,185,129,0.15)',
  warning: '#E8A020',
  warningLight: 'rgba(232,160,32,0.15)',
  error: '#F43F5E',
  errorLight: 'rgba(244,63,94,0.15)',
  info: '#38BDF8',
  infoLight: 'rgba(56,189,248,0.15)',

  // Gradients
  gradientStart: '#0E0C1C',
  gradientEnd: '#1E1428',
};

export type Colors = typeof darkColors;
