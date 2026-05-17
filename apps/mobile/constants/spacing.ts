// TravelAI Design System — Spacing Tokens
// Шаг сетки: 4dp (стандарт Material + iOS HIG)
// Все значения кратны 4 для точного попиксельного рендеринга

export const Spacing = {
  // ─── Числовая шкала (ключ = шаг, значение = dp) ──────────────────────────
  0:  0,   // нет отступа
  1:  4,   // микро — разделители иконок, внутренние gap
  2:  8,   // мало — padding внутри chips, badges
  3:  12,  // умеренно — gap между inline элементами
  4:  16,  // стандарт — внутренний padding карточек
  5:  20,  // screen horizontal padding
  6:  24,  // gap между секциями внутри карточки
  7:  28,  // gap между карточками
  8:  32,  // крупные внутренние отступы
  10: 40,  // section gap в списке
  12: 48,  // крупные секции
  16: 64,  // tab bar, крупные hero-блоки
  20: 80,  // bottom safe area + nav

  // ─── Именованные алиасы ───────────────────────────────────────────────────
  xs:   4,
  sm:   8,
  md:   16,
  lg:   24,
  xl:   32,
  '2xl': 48,

  // ─── Layout: Структурные константы ───────────────────────────────────────
  // Используй для StyleSheet.create в layout-компонентах
  screenPaddingH:    20,  // горизонтальный padding экрана (ScrollView, FlatList)
  screenPaddingV:    24,  // вертикальный padding первого/последнего блока
  cardPadding:       16,  // внутренний padding карточки (все стороны)
  cardPaddingLg:     20,  // расширенный padding для feature-карточек
  sectionGap:        24,  // вертикальный gap между секциями экрана
  itemGap:           12,  // gap между элементами списка / grid

  // ─── Layout: Высоты компонентов ───────────────────────────────────────────
  tabBarHeight:     64,  // нижняя навигация (включая safe area padding)
  headerHeight:     56,  // топ-бар / nav header
  inputHeight:      52,  // TextInput, Picker
  buttonHeight:     52,  // основная кнопка (thumb-friendly)
  buttonHeightSm:   40,  // компактная кнопка / outline secondary
  chipHeight:       32,  // filter chips, tags
  avatarSm:         32,  // маленький аватар (в списках, комментариях)
  avatarMd:         44,  // стандартный аватар
  avatarLg:         64,  // профиль, детальный экран
  iconTouchTarget:  44,  // минимальный touch target (Apple HIG)
} as const;

export type SpacingKey = keyof typeof Spacing;
