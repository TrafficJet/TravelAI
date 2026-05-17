// TravelAI Design System — Typography Tokens
// Fonts: Plus Jakarta Sans (headings) + Inter (body)
// Install: npx expo install @expo-google-fonts/plus-jakarta-sans @expo-google-fonts/inter

export const Typography = {
  // ─── Font Families ────────────────────────────────────────────────────────
  // Загрузка через useFonts() в _layout.tsx
  fonts: {
    heading: 'PlusJakartaSans',   // выразительный, современный — идеально для заголовков
    body:    'Inter',             // максимальная читаемость на экране
    mono:    'monospace',         // для кодов бронирования, номеров рейсов
  },

  // ─── Font Sizes (px / dp) ────────────────────────────────────────────────
  // Шкала строится на базе 15dp (читаемость на мобильном)
  sizes: {
    xs:   11, // лейблы статусов, бейджи, timestamp в списках
    sm:   13, // подписи, captions, вторичный текст
    base: 15, // основной body текст
    md:   17, // чуть крупнее body, важные абзацы
    lg:   20, // подзаголовки секций, card titles
    xl:   24, // screen subtitles, крупные карточки
    '2xl': 28, // screen titles (h2)
    '3xl': 34, // главные заголовки экранов (h1)
    '4xl': 40, // hero / onboarding display text
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
  displayHero: {
    fontFamily:    Typography.fonts.heading,
    fontSize:      Typography.sizes['4xl'],
    fontWeight:    Typography.weights.extrabold,
    lineHeight:    Typography.sizes['4xl'] * Typography.lineHeights.tight,
    letterSpacing: Typography.letterSpacing.tight,
  },
  h1: {
    fontFamily:    Typography.fonts.heading,
    fontSize:      Typography.sizes['3xl'],
    fontWeight:    Typography.weights.bold,
    lineHeight:    Typography.sizes['3xl'] * Typography.lineHeights.tight,
    letterSpacing: Typography.letterSpacing.tight,
  },
  h2: {
    fontFamily:    Typography.fonts.heading,
    fontSize:      Typography.sizes['2xl'],
    fontWeight:    Typography.weights.bold,
    lineHeight:    Typography.sizes['2xl'] * Typography.lineHeights.tight,
    letterSpacing: Typography.letterSpacing.tight,
  },
  h3: {
    fontFamily:    Typography.fonts.heading,
    fontSize:      Typography.sizes.xl,
    fontWeight:    Typography.weights.semibold,
    lineHeight:    Typography.sizes.xl * Typography.lineHeights.normal,
    letterSpacing: Typography.letterSpacing.normal,
  },
  cardTitle: {
    fontFamily:    Typography.fonts.heading,
    fontSize:      Typography.sizes.lg,
    fontWeight:    Typography.weights.semibold,
    lineHeight:    Typography.sizes.lg * Typography.lineHeights.normal,
    letterSpacing: Typography.letterSpacing.normal,
  },
  body: {
    fontFamily:    Typography.fonts.body,
    fontSize:      Typography.sizes.base,
    fontWeight:    Typography.weights.regular,
    lineHeight:    Typography.sizes.base * Typography.lineHeights.normal,
    letterSpacing: Typography.letterSpacing.normal,
  },
  bodyMedium: {
    fontFamily:    Typography.fonts.body,
    fontSize:      Typography.sizes.base,
    fontWeight:    Typography.weights.medium,
    lineHeight:    Typography.sizes.base * Typography.lineHeights.normal,
    letterSpacing: Typography.letterSpacing.normal,
  },
  caption: {
    fontFamily:    Typography.fonts.body,
    fontSize:      Typography.sizes.sm,
    fontWeight:    Typography.weights.regular,
    lineHeight:    Typography.sizes.sm * Typography.lineHeights.normal,
    letterSpacing: Typography.letterSpacing.normal,
  },
  label: {
    fontFamily:    Typography.fonts.body,
    fontSize:      Typography.sizes.xs,
    fontWeight:    Typography.weights.semibold,
    lineHeight:    Typography.sizes.xs * Typography.lineHeights.tight,
    letterSpacing: Typography.letterSpacing.wider,
  },
  button: {
    fontFamily:    Typography.fonts.body,
    fontSize:      Typography.sizes.base,
    fontWeight:    Typography.weights.semibold,
    lineHeight:    Typography.sizes.base * Typography.lineHeights.tight,
    letterSpacing: Typography.letterSpacing.wide,
  },
  buttonSm: {
    fontFamily:    Typography.fonts.body,
    fontSize:      Typography.sizes.sm,
    fontWeight:    Typography.weights.semibold,
    lineHeight:    Typography.sizes.sm * Typography.lineHeights.tight,
    letterSpacing: Typography.letterSpacing.wide,
  },
  mono: {
    fontFamily:    Typography.fonts.mono,
    fontSize:      Typography.sizes.sm,
    fontWeight:    Typography.weights.medium,
    lineHeight:    Typography.sizes.sm * Typography.lineHeights.normal,
    letterSpacing: Typography.letterSpacing.wide,
  },
} as const;

export type TypographyKey = keyof typeof Typography;
export type TextPresetKey = keyof typeof TextPresets;
