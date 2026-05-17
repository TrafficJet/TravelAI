// TravelAI Design System — Typography Tokens
// Fonts: Sora (headings) + Inter (body)
// Install: npx expo install @expo-google-fonts/sora @expo-google-fonts/inter

export const Typography = {
  // ─── Font Families ────────────────────────────────────────────────────────────
  // Загрузка через useFonts() в _layout.tsx
  fonts: {
    heading: 'Sora',     // выразительный, современный — идеально для заголовков
    body:    'Inter',    // максимальная читаемость на экране
    mono:    'monospace', // для кодов бронирования, номеров рейсов
  },

  // ─── Font Sizes (px / dp) ────────────────────────────────────────────────
  sizes: {
    xs:    11,  // Label/Overline
    sm:    12,  // Caption
    base:  14,  // Small
    md:    16,  // Body
    lg:    20,  // H3
    xl:    24,  // H2
    '2xl': 32,  // H1
    '3xl': 40,  // Display
    '4xl': 48,  // Hero / logo icon
  },

  // ─── Font Weights ─────────────────────────────────────────────────────────
  // React Native принимает строки — важно не передавать числа
  weights: {
    regular:   '400' as const,
    medium:    '500' as const,
    semibold:  '600' as const,
    bold:      '700' as const,
    extrabold: '800' as const,
  },

  // ─── Line Heights (множитель) ─────────────────────────────────────────────
  // Использовать как: lineHeight = size * lineHeights.normal
  lineHeights: {
    tight:   1.2,  // заголовки, короткие строки
    normal:  1.5,  // основной body текст
    relaxed: 1.75, // описания, длинные абзацы
  },

  // ─── Letter Spacing (dp) ──────────────────────────────────────────────────
  letterSpacing: {
    tight:  -0.5, // крупные заголовки — чуть сжать
    normal:  0,   // стандарт
    wide:    0.5, // кнопки, лейблы — чуть раздвинуть
    wider:   1,   // ALL CAPS капсовые надписи, секционные метки
  },
} as const;

// ─── Вспомогательные пресеты ──────────────────────────────────────────────────
// Готовые комбинации для частых паттернов — импортируй и применяй напрямую

export const TextPresets = {
  display:      { fontFamily: 'Sora', fontSize: 40, fontWeight: '700' as const, lineHeight: 48, letterSpacing: 0 },
  h1:           { fontFamily: 'Sora', fontSize: 32, fontWeight: '600' as const, lineHeight: 40, letterSpacing: 0 },
  h2:           { fontFamily: 'Sora', fontSize: 24, fontWeight: '600' as const, lineHeight: 32, letterSpacing: 0 },
  h3:           { fontFamily: 'Sora', fontSize: 20, fontWeight: '500' as const, lineHeight: 28, letterSpacing: 0 },
  body:         { fontFamily: 'Inter', fontSize: 16, fontWeight: '400' as const, lineHeight: 24, letterSpacing: 0 },
  bodyMedium:   { fontFamily: 'Inter', fontSize: 16, fontWeight: '500' as const, lineHeight: 24, letterSpacing: 0 },
  small:        { fontFamily: 'Inter', fontSize: 14, fontWeight: '400' as const, lineHeight: 20, letterSpacing: 0 },
  caption:      { fontFamily: 'Inter', fontSize: 12, fontWeight: '400' as const, lineHeight: 16, letterSpacing: 0 },
  label:        { fontFamily: 'Inter', fontSize: 11, fontWeight: '500' as const, lineHeight: 16, letterSpacing: 1.5 },
  overline:     { fontFamily: 'Inter', fontSize: 10, fontWeight: '600' as const, lineHeight: 14, letterSpacing: 1.5 },
  button:       { fontFamily: 'Inter', fontSize: 16, fontWeight: '500' as const, lineHeight: 20, letterSpacing: 0 },
  buttonSm:     { fontFamily: 'Inter', fontSize: 14, fontWeight: '500' as const, lineHeight: 18, letterSpacing: 0 },
  mono:         { fontFamily: 'monospace', fontSize: 13, fontWeight: '500' as const, lineHeight: 20, letterSpacing: 0.5 },
} as const;

export type TypographyKey = keyof typeof Typography;
export type TextPresetKey = keyof typeof TextPresets;
