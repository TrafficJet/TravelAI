// TravelAI Design System — Border Radius Tokens
// Стиль: мягкий и современный — pill-кнопки, скруглённые карточки

export const Radius = {
  // ─── Числовая шкала ───────────────────────────────────────────────────────────
  none:  0,
  xs:    4,
  sm:    6,    // chip, badge
  md:    12,   // input, secondary button
  lg:    16,   // cards
  xl:    24,   // bottom sheet, modal
  '2xl': 32,   // primary button (pill-like)
  full:  9999,

  // ─── Именованные компонентные токены ─────────────────────────────────────
  // Привязаны к конкретным UI-компонентам — менять только здесь
  button:    32,   // основная кнопка — pill
  buttonSm:  24,   // компактная кнопка
  card:      16,   // стандартная карточка
  cardLg:    24,   // hero / feature карточка
  input:     12,   // TextInput, Picker
  chip:      9999, // filter chip — full pill
  tag:       6,    // маленький тег / badge с текстом
  avatar:    9999, // аватар — всегда круг
  modal:     24,   // bottom sheet, alert modal (верхние углы)
  tooltip:   8,    // подсказки
  badge:     9999, // нотификационный badge (число)
  image:     12,   // скруглённые изображения в карточках
  imageLg:   16,   // hero-изображения
  fab:       9999, // Floating Action Button — круг
  mapPin:    10,   // маркеры на карте
} as const;

export type RadiusKey = keyof typeof Radius;
