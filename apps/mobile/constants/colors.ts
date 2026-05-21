// TravelAI Design System — Color Tokens
// BRANDBOOK v1.2 — единственный источник правды
// Theme: Dark / SVIT

export const Colors = {
  // Primary — SVIT Gold
  primary:      '#E8A020',
  primaryLight: '#F2B84B',
  primaryDark:  '#B87518',
  primaryMuted: 'rgba(232,160,32,0.15)',

  // Secondary — Void Plum
  secondary:      '#7C5CFC',
  secondaryLight: '#A98EFD',
  secondaryDark:  '#5A3DD4',

  // Backgrounds
  background: '#0E0C1C',
  surface:    '#14121E',
  card:       '#1E1C2C',
  elevated:   '#28263A',
  overlay:    'rgba(14,12,28,0.75)',

  // Text — BRANDBOOK: primary #F4F2FF
  text:         '#F4F2FF',
  textMuted:    '#8888A8',
  textDisabled: '#4E4E68',
  textInverse:  '#0E0C1C',

  // Borders
  border:  '#2E2B42',
  divider: '#1E1C2C',

  // Semantic
  success:      '#10B981',
  successLight: 'rgba(16,185,129,0.15)',
  warning:      '#E8A020',
  warningLight: 'rgba(232,160,32,0.15)',
  error:        '#F43F5E',
  errorLight:   'rgba(244,63,94,0.15)',
  info:         '#38BDF8',
  infoLight:    'rgba(56,189,248,0.15)',

  // Gradients
  gradientStart: '#0E0C1C',
  gradientEnd:   '#1E1428',
} as const;

export type ColorKey = keyof typeof Colors;
