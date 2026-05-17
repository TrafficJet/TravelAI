// TravelAI Design System — Color Tokens
// Theme: Dark / Sky & Ocean
// Target audience: urban professionals 25-40

export const Colors = {
  // ─── Primary — Sky Blue ───────────────────────────────────────────────────
  // Ассоциация с открытым небом, полётом, свободой маршрута
  primary:      '#0EA5E9', // sky-500
  primaryLight: '#38BDF8', // sky-400 — hover, highlights
  primaryDark:  '#0284C7', // sky-600 — pressed, active
  primaryMuted: '#0EA5E933', // sky-500 @ 20% — subtle fills

  // ─── Secondary — Cyan / Aqua ──────────────────────────────────────────────
  // Морская глубина, вода, приключение
  secondary:      '#06B6D4', // cyan-500
  secondaryLight: '#22D3EE', // cyan-400
  secondaryDark:  '#0891B2', // cyan-600

  // ─── Backgrounds ─────────────────────────────────────────────────────────
  // Глубокий ночной синий — не чёрный, но очень тёмный
  background: '#060B18', // самый нижний слой, status bar area
  surface:    '#0D1526', // основные экраны
  card:       '#152033', // карточки, листы
  elevated:   '#1C2D45', // модалки, дропдауны поверх карточек
  overlay:    'rgba(6, 11, 24, 0.75)', // скримы, backdrop

  // ─── Text ────────────────────────────────────────────────────────────────
  text:         '#F0F6FF', // тёплый белый с лёгким голубым оттенком
  textMuted:    '#7E95B0', // вторичный текст, подписи
  textDisabled: '#3D5269', // неактивные элементы
  textInverse:  '#060B18', // текст на светлом фоне (кнопка primary fill)

  // ─── Borders & Dividers ───────────────────────────────────────────────────
  border:      '#1E3350', // основной бордер
  borderLight: '#2A4568', // светлее — для hover/focus состояний
  divider:     '#0F2038', // разделители в списках, тоньше чем бордер

  // ─── Status: Success ─────────────────────────────────────────────────────
  success:      '#10B981', // emerald-500
  successLight: '#10B98120', // emerald @ 12% fill

  // ─── Status: Warning ─────────────────────────────────────────────────────
  warning:      '#F59E0B', // amber-500
  warningLight: '#F59E0B20', // amber @ 12% fill

  // ─── Status: Error ───────────────────────────────────────────────────────
  error:      '#F43F5E', // rose-500 (мягче чем pure red)
  errorLight: '#F43F5E20', // rose @ 12% fill

  // ─── Status: Info ────────────────────────────────────────────────────────
  info:      '#818CF8', // indigo-400 — нейтральная инфо, отличается от primary
  infoLight: '#818CF820', // indigo @ 12% fill

  // ─── Gradients ───────────────────────────────────────────────────────────
  // Используются в LinearGradient от expo-linear-gradient
  gradientStart: '#0EA5E9', // sky-500 — верх
  gradientMid:   '#0369A1', // sky-700 — середина
  gradientEnd:   '#06B6D4', // cyan-500 — низ / анимированный переход

  // ─── Travel Decorative ───────────────────────────────────────────────────
  // Для иллюстраций, иконок-акцентов, тематических карточек
  sky:    '#BAE6FD', // sky-200 — лёгкое небо на картах и обложках
  ocean:  '#164E63', // cyan-900 — глубокий океан для фонов Hero
  sunset: '#FB923C', // orange-400 — закат, специальные акценты и CTA-иконки
} as const;

export type ColorKey = keyof typeof Colors;
