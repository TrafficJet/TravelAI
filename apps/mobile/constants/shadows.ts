// TravelAI Design System — Shadow Tokens
//
// React Native shadow model:
//   iOS  — shadowColor, shadowOffset, shadowOpacity, shadowRadius
//   Android — elevation (игнорирует shadow* свойства)
//
// Используй StyleSheet.create для мемоизации объектов.
// Объединяй через: StyleSheet.flatten([styles.card, Shadows.md])

import { Platform, ViewStyle } from 'react-native';

// Цвета теней
const SHADOW_BLACK  = '#000000';
const SHADOW_PRIMARY = '#E8A020'; // SVIT Gold — основной акцент
const SHADOW_CYAN    = '#14B8A6'; // teal-500 — вторичный акцент
const SHADOW_ERROR   = '#F43F5E'; // rose-500 — для destructive actions

// ─── Тип токена ───────────────────────────────────────────────────────────────
type ShadowToken = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

// ─── Фабрика токена (нормализует платформы) ───────────────────────────────────
// На iOS elevation игнорируется, на Android — shadow* игнорируются.
// Оба поля присутствуют в каждом токене для портативности.
function shadow(
  color: string,
  offsetY: number,
  opacity: number,
  radius: number,
  elevation: number,
): ShadowToken {
  return {
    shadowColor:   color,
    shadowOffset:  { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius:  radius,
    elevation,
  };
}

// ─── Shadow Tokens ────────────────────────────────────────────────────────────
export const Shadows = {
  // Нет тени — явный сброс
  none: {
    shadowColor:   SHADOW_BLACK,
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius:  0,
    elevation:     0,
  } satisfies ShadowToken,

  // Едва заметная — для тонких разделений (chips, badges)
  xs: shadow(SHADOW_BLACK, 1, 0.08, 2, 1),

  // Лёгкая — карточки в списках, input focus ring
  sm: shadow(SHADOW_BLACK, 2, 0.12, 4, 3),

  // Стандартная — карточки, панели
  md: shadow(SHADOW_BLACK, 4, 0.16, 8, 6),

  // Средне-крупная — floating элементы, нижние листы
  lg: shadow(SHADOW_BLACK, 8, 0.20, 16, 12),

  // Крупная — модалки, dropdown, overlay
  xl: shadow(SHADOW_BLACK, 16, 0.24, 24, 20),

  // ─── Акцентные цветные тени ────────────────────────────────────────────────
  // Применяй к активным / selected / CTA элементам

  // Свечение primary (sky blue) — активная кнопка, selected card
  primary: {
    shadowColor:   SHADOW_PRIMARY,
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius:  12,
    elevation:     8,
  } satisfies ShadowToken,

  // Усиленное свечение — pressed state, CTA hero-кнопка
  primaryStrong: {
    shadowColor:   SHADOW_PRIMARY,
    shadowOffset:  { width: 0, height: 6 },
    shadowOpacity: 0.50,
    shadowRadius:  20,
    elevation:     12,
  } satisfies ShadowToken,

  // Свечение cyan — secondary акценты, иконки океана
  cyan: {
    shadowColor:   SHADOW_CYAN,
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius:  12,
    elevation:     8,
  } satisfies ShadowToken,

  // Рассеянное свечение — ambient glow, аватары с бейджем, онбординг иллюстрации
  // Заменяет box-shadow: 0 0 20px — офсет нулевой, радиус большой
  glow: {
    shadowColor:   SHADOW_PRIMARY,
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0.40,
    shadowRadius:  20,
    elevation:     10,
  } satisfies ShadowToken,

  // Тревожная тень — destructive действия, error state
  danger: {
    shadowColor:   SHADOW_ERROR,
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius:  12,
    elevation:     8,
  } satisfies ShadowToken,
} as const;

// ─── Утилита для платформенного разветвления ─────────────────────────────────
// Если нужно гарантированно не передавать shadow* на Android:
//   const cardShadow = platformShadow(Shadows.md);
export function platformShadow(token: ShadowToken): Partial<ShadowToken> {
  if (Platform.OS === 'android') {
    return { elevation: token.elevation };
  }
  const { elevation: _elevation, ...iosShadow } = token;
  return iosShadow;
}

export type ShadowKey = keyof typeof Shadows;
