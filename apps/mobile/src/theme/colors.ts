// NOTE: This app uses dark-only branding (Amber Horizon design system).
// lightColors is kept structurally for type compatibility but all backgrounds
// are aligned to the dark palette so there is never a white screen.
export const lightColors = {
  background: '#0A0A14',
  surface: '#12121F',
  card: '#1C1C2E',
  primary: '#F59E0B',
  primaryLight: '#FCD34D',
  text: '#F4F4F8',
  textSecondary: '#8B8BA7',
  border: '#2A2A42',
  error: '#F43F5E',
  success: '#10B981',
  warning: '#F59E0B',
};

export const darkColors = {
  background: '#0A0A14',
  surface: '#12121F',
  card: '#1C1C2E',
  primary: '#F59E0B',
  primaryLight: '#FCD34D',
  text: '#F4F4F8',
  textSecondary: '#8B8BA7',
  border: '#2A2A42',
  error: '#F43F5E',
  success: '#10B981',
  warning: '#F59E0B',
};

export type Colors = typeof lightColors;
