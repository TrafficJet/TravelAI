// TravelAI Design System — Border Radius Tokens
// Стиль: мягкий и современный — скруглённые, но не bubble-UI

export const Radius = {
  // ─── Числовая шкала ───────────────────────────────────────────────────────
  none: 0,
  xs:   4,    // мелкие иконки, теги
  sm:   6,    // мелкие батжи, tooltip
  md:   10,   // средние элементы, secondary кнопки
  lg:   14,   // большинство интерактивных блоков
  xl:   20,   // крупные карточки, нижние листы
  '2xl': 28,  // hero-секции, onboarding слайды
  full: 9999, // pill-форма, круги

  // ─── Именованные компонентные токены ─────────────────────────────────────
  // Привязаны к конкретным UI-компонентам — менять только здесь
  button:     12,   // основная кнопка — скруглённая, но не pill
  buttonSm:   8,    // компактная кнопка
  card:       16,   // стандартная карточка
  cardLg:     20,   // hero / feature карточка
  input:      12,   // TextInput, Picker
  chip:       20,   // filter chip — почти pill
  tag:        6,    // маленький тег / badge с текстом
  avatar:     9999, // аватар — всегда круг
  modal:      24,   // bottom sheet, alert modal (верхние углы)
  tooltip:    8,    // подсказки
  badge:      9999, // нотификационный badge (число)
  image:      12,   // скруглённые изображения в карточках
  imageLg:    16,   // hero-изображения
  fab:        9999, // Floating Action Button — круг
  mapPin:     10,   // маркеры на карте
} as const;

export type RadiusKey = keyof typeof Radius;
