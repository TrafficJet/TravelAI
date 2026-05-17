// TravelAI Design System — Color Tokens
// Theme: Dark / Amber Horizon
// Target audience: urban professionals 25-40

export const Colors = {
  // Primary — Amber Horizon (янтарный горизонт)
  primary:      '#F59E0B',
  primaryLight: '#FCD34D',
  primaryDark:  '#B45309',
  primaryMuted: 'rgba(245,158,11,0.15)',

  // Secondary — Aurora Teal
  secondary:      '#14B8A6',
  secondaryLight: '#5EEAD4',
  secondaryDark:  '#0F766E',

  // Backgrounds
  background: '#0A0A14',
  surface:    '#12121F',
  card:       '#1C1C2E',
  elevated:   '#252538',
  overlay:    'rgba(10,10,20,0.75)',

  // Text
  text:         '#F4F4F8',
  textMuted:    '#8B8BA7',
  textDisabled: '#4A4A62',
  textInverse:  '#0A0A14',

  // Borders
  border:  '#2A2A42',
  divider: '#1E1E30',

  // Semantic
  success:      '#10B981',
  successLight: 'rgba(16,185,129,0.15)',
  warning:      '#F59E0B',
  warningLight: 'rgba(245,158,11,0.15)',
  error:        '#F43F5E',
  errorLight:   'rgba(244,63,94,0.15)',
  info:         '#38BDF8',
  infoLight:    'rgba(56,189,248,0.15)',

  // Gradients
  gradientStart: '#0A0A14',
  gradientEnd:   '#2D1A0A',
} as const;

export type ColorKey = keyof typeof Colors;
