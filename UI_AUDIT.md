# UI Audit — TravelAI vs Брендбук v1.0

> Дата: 2026-05-17  
> Скриншоты: `workspace/travel-ai/screenshots/`  
> Метод: статический анализ кода (`constants/`, компоненты, экраны) + Playwright-скриншоты всех 5 экранов

---

## Итог

| Приоритет | Количество |
|-----------|-----------|
| P0 (сломан, нельзя релизить) | 4 |
| P1 (важно, чинить до релиза) | 9 |
| P2 (желательно) | 6 |
| **Итого** | **19** |

---

## Экран: Онбординг (`app/onboarding.tsx`)

### P2-01 — Кнопка "Далее": borderRadius не соответствует брендбуку
- Файл: `app/onboarding.tsx:217`
- Код: `borderRadius: Radius.button` → `Radius.button = 12`
- Брендбук: кнопки Primary — `radius-2xl = 32px` (pill-форма)
- Визуально: кнопка слегка скруглённая, не pill
- На скриншоте (`00-initial.png`) кнопка "Далее" визуально выглядит как pill — это происходит потому, что кнопка имеет высоту ~52px и `borderRadius: 12` на экране выглядит достаточно скруглённой, но это несоответствие в коде. Кнопка "Начать" (последний слайд) уже корректна только потому что иконка-wrap круглая.
- Как чинить: `borderRadius: Radius.full` (9999) или добавить в `Radius` токен `buttonPrimary: 32` и использовать его.

---

## Экран: Логин (`app/(auth)/login.tsx`)

### P1-02 — Заголовок: неверный шрифт (Plus Jakarta Sans вместо Sora)
- Файл: `constants/typography.ts:9`
- Код: `heading: 'PlusJakartaSans'`
- Брендбук: заголовки — шрифт **Sora** (`@expo-google-fonts/sora`)
- Влияние: все H1/H2/H3 во всём приложении используют Plus Jakarta Sans
- Как чинить: заменить `fonts.heading` на `'Sora'` и установить пакет `@expo-google-fonts/sora`

### P0-03 — Цвета токенов: primary — синий вместо янтарного
- Файл: `constants/colors.ts:8`
- Код: `primary: '#0EA5E9'` (sky-500, синий)
- Брендбук: `primary: '#F59E0B'` (amber-500, янтарный)
- Влияние: все элементы, использующие `Colors.primary` через токен, получают синий цвет. Это затрагивает: активные табы навигации, FAB-кнопку в чате, ссылки "Забыли пароль?", "Зарегистрироваться", кнопку "Редактировать профиль", индикаторы переключателей, кнопку "Улучшить до Premium" и другие
- Примечание: визуально на скриншотах янтарный цвет отображается правильно — это происходит потому, что часть кода использует хардкод `'#F59E0B'` напрямую (onboarding.tsx, Button.tsx через `Colors.primary`). Но в `src/theme/colors.ts` есть отдельные `darkColors.primary: '#3B82F6'` и `lightColors.primary: '#1E40AF'` — ещё два несоответствующих набора.
- Как чинить: изменить `primary` в `constants/colors.ts` на `'#F59E0B'`

### P0-04 — Цвета фонов: background/surface/card — неверные значения
- Файл: `constants/colors.ts:20-24`
- Код: `background: '#060B18'`, `surface: '#0D1526'`, `card: '#152033'`, `elevated: '#1C2D45'`
- Брендбук: `background: '#0A0A14'`, `surface: '#12121F'`, `card: '#1C1C2E'`, `elevated: '#252538'`
- Влияние: вместо тёплого тёмно-фиолетового космического фона — холодный синий морской. Полностью меняется характер палитры.
- Как чинить: исправить все 4 значения в `constants/colors.ts`

### P1-05 — Дублирующая система тем `src/theme/colors.ts` с третьими значениями
- Файл: `apps/mobile/src/theme/colors.ts`
- Проблема: параллельный файл цветов с `darkColors.background: '#0F172A'`, `darkColors.primary: '#3B82F6'`, `darkColors.card: '#1E293B'` — все три значения отличаются и от брендбука, и от основного `constants/colors.ts`
- Часть экранов (Profile, Chat) через `useTheme()` получают цвета из этого файла вместо `constants/colors.ts`
- На скриншоте профиля (`tab-3-профиль.png`) видно белый фон в секции "Подписка" — это `lightColors.card: '#FFFFFF'` когда тема определилась как `light`
- Как чинить: удалить `src/theme/colors.ts` или привести его к тем же значениям, что и брендбук; использовать единый источник токенов

### P0-06 — Профиль: белый фон карточки в светлой теме
- Файл: `apps/mobile/src/theme/colors.ts:3`
- Код: `lightColors.card: '#FFFFFF'`, `lightColors.background: '#FFFFFF'`
- На скриншоте (`tab-3-профиль.png`): секция "Подписка" — карточка с белым фоном, весь scroll-контент — белый фон
- Брендбук: приложение использует исключительно тёмную тему; светлой темы нет
- Как чинить: убрать поддержку светлой темы или заблокировать тему на dark в `ThemeProvider`

### P1-07 — Кнопка "Войти": форма не pill
- Файл: `components/ui/Button.tsx:104`
- Код: `borderRadius: Radius.button` → `Radius.button = 12`
- Брендбук: кнопки Primary — pill, `borderRadius: 32`
- На скриншоте логина (`01-after-onboarding.png`): кнопка "Войти" визуально корректна (высота 52px + radius 12 выглядит скруглённой), но формально не соответствует pill (`borderRadius: 32`)
- Как чинить: `Radius.button = 32` или создать отдельный токен `Radius.buttonPrimary = 32`

### P2-08 — Кнопка "Try Demo": тип Secondary вместо Ghost/Outline
- Файл: `app/(auth)/login.tsx:176-186`
- Код: кастомная кнопка вне компонента Button, с `borderColor: '#F59E0B'`, текст `#F59E0B`
- Брендбук: Secondary — рамка `secondary (#14B8A6)`, текст `secondary`. Этот стиль янтарной рамки соответствует скорее кастомному outline-primary, которого нет в брендбуке
- Как чинить: уточнить у дизайна, какой вариант кнопки это должен быть; возможно добавить вариант `outline-primary` в компонент Button

### P2-09 — Кнопка "Войти через Google": borderRadius 12 вместо `radius-md (12)` — совпадает, но без токена
- Файл: `components/auth/SocialAuthButtons.tsx:228`
- Код: `borderRadius: 12` (хардкод, не токен)
- Брендбук: Secondary кнопки — `radius-md = 12`. Значение правильное, но использован хардкод
- Как чинить: заменить на `Radius.md` или `Radius.input`

---

## Экран: Чат (`app/(tabs)/index.tsx`)

### P1-10 — Навигация: 8 табов вместо 4
- Файл: `app/(tabs)/_layout.tsx:171-248`
- Код: табы — Чат, Поиск, Брони, Кошелёк, Уведомления, История, Избранное, Профиль (8 штук)
- Брендбук: ровно 4 таба — Чат, Брони, Кошелёк, Профиль
- На скриншоте чата (`02-login.png`, нижняя навигация): видны Чат, Поиск, Брони, Кошел..., Уведо..., Исто..., Избр..., Про... — 8 иконок, названия усечены
- Влияние: bottom nav переполнен, лейблы обрезаны (видно "Кош...", "Уведо..."), нарушена информационная архитектура брендбука
- Как чинить: убрать табы Поиск, Уведомления, История, Избранное из bottom nav (перенести в другие паттерны навигации — drawer, кнопка профиля, etc.)

### P2-11 — Chat List: фон строк — белый вместо тёмного
- Файл: `app/(tabs)/index.tsx:344`
- Код: `backgroundColor: colors.background` из `useTheme()` → при светлой теме = `#FFFFFF`
- На скриншоте чата (`02-login.png`): основная область списка — белая, только нижний navbar тёмный
- Как чинить: связано с проблемой P0-06 — исправить тему

### P1-12 — FAB кнопка: цвет текста `Colors.textInverse` вместо `#0A0A14`
- Файл: `app/(tabs)/index.tsx:444`
- Код: `color: Colors.textInverse` → `Colors.textInverse: '#060B18'`
- Брендбук: текст на primary кнопках — `#0A0A14`
- Разница: `#060B18` (очень тёмный синий) vs `#0A0A14` (тёмный фиолетово-чёрный) — визуально малозаметно, но технически несоответствие
- Как чинить: исправить `Colors.textInverse` в `constants/colors.ts` на `'#0A0A14'`

---

## Экран: Брони (`app/(tabs)/bookings.tsx`)

### P2-13 — Активный фильтр-чип: текст `Colors.textInverse` вместо `#0A0A14`
- Файл: `app/(tabs)/bookings.tsx:313`
- Код: `color: Colors.textInverse`
- Брендбук: активный Filter Chip — текст `#0A0A14`, не через токен textInverse
- Как чинить: см. P1-12, исправить `Colors.textInverse`

### P1-14 — Статус-беджи: missing height/uppercase constraint
- Файл: `app/(tabs)/bookings.tsx:61-81`
- Код: `StatusBadge` — нет явного `height: 22`, нет `textTransform: 'uppercase'` на тексте
- Брендбук: Status Badge — height 22px, текст Label 11px Medium **uppercase**
- Как чинить: добавить `height: 22`, `textTransform: 'uppercase'`, `fontSize: 11` в `badgeStyles`

---

## Экран: Кошелёк (`app/(tabs)/wallet.tsx`, `components/wallet/BalanceDisplay.tsx`)

### P2-15 — BalanceDisplay: шрифт баланса не использует Display-пресет
- Файл: `components/wallet/BalanceDisplay.tsx:50`
- Код: `fontSize: 48`, `fontWeight: Typography.weights.bold`, без `fontFamily: Typography.fonts.heading`
- Брендбук: Display — 40px Bold 700, fontFamily Sora — "Баланс кошелька, крупные цифры"
- Проблема: не применяется heading-шрифт (Sora), размер 48px вместо 40px
- Как чинить: использовать `...TextPresets.displayHero` или создать пресет `TextPresets.display` с fontFamily heading

### P1-16 — Кнопка "Пополнить кошелёк": borderRadius `Radius.input (12)` вместо pill (32)
- Файл: `app/(tabs)/wallet.tsx:112`
- Код: `borderRadius: Radius.input` → `12`
- Брендбук: Primary-кнопки — pill, `borderRadius: 32`
- На скриншоте (`tab-2-кошелёк.png`): кнопка "Пополнить кошелёк" имеет заметное, но не pill скругление
- Как чинить: изменить на `Radius.full` или `32`

---

## Экран: Профиль (`app/(tabs)/profile.tsx`)

### P0-17 — Фон экрана: белый из светлой темы
- Файл: `app/(tabs)/profile.tsx:452`
- Код: `backgroundColor: colors.background` из `useTheme()` → `lightColors.background: '#FFFFFF'`
- На скриншоте (`tab-3-профиль.png`): scroll-area полностью белая, карточки светлые
- Брендбук: background `#0A0A14` всегда
- Как чинить: связано с P0-06; заблокировать тему на dark или исправить `ThemeProvider`

### P1-18 — Кнопка "Улучшить до Premium": borderRadius `Radius.md (10)` вместо pill
- Файл: `app/(tabs)/profile.tsx:929`
- Код: `borderRadius: Radius.md` → `10`
- Брендбук: Primary-кнопки — pill, `borderRadius: 32`
- Как чинить: изменить на `32` или `Radius.full`

### P2-19 — Кнопка "Сохранить данные" в профиле: borderRadius `Radius.card (16)` вместо pill
- Файл: `app/(tabs)/profile.tsx` → `bookingStyles.saveBtn:1053`
- Код: `borderRadius: Radius.card` → `16`
- Брендбук: Primary-кнопки — pill, `borderRadius: 32`
- Как чинить: заменить на `Radius.full` (32)

---

## Системные проблемы (касаются всех экранов)

### P0-S1 — `constants/colors.ts`: primary — синий `#0EA5E9` вместо янтарного `#F59E0B`
(см. P0-03 выше — задублировано для акцента, это blocker)

### P0-S2 — `constants/colors.ts`: фоновые цвета — синий спектр вместо тёмно-фиолетового
(см. P0-04 выше)

### P1-S3 — `constants/typography.ts`: шрифт заголовков Plus Jakarta Sans вместо Sora
(см. P1-02 выше)

### P1-S4 — `constants/shadows.ts`: `SHADOW_PRIMARY = '#0EA5E9'` (sky-blue)
- Файл: `constants/shadows.ts:14`
- Код: `SHADOW_PRIMARY = '#0EA5E9'`
- Брендбук: `glow-primary: shadowColor '#F59E0B'`
- Как чинить: заменить на `'#F59E0B'`

### P1-S5 — `constants/radius.ts`: `button: 12` — не соответствует pill-форме Primary
- Файл: `constants/radius.ts:17`
- Код: `button: 12`
- Брендбук: `radius-2xl = 32` для primary кнопок
- Как чинить: `button: 32` или добавить `buttonPrimary: 32`

### P1-S6 — `src/theme/colors.ts`: параллельная система цветов с неверными значениями
(см. P1-05 выше)

---

## Сводная таблица

| # | Приоритет | Файл | Проблема |
|---|-----------|------|---------|
| P0-03 | P0 | `constants/colors.ts:8` | primary = синий #0EA5E9 вместо янтарного #F59E0B |
| P0-04 | P0 | `constants/colors.ts:20-24` | background/surface/card — синий спектр вместо тёмно-фиолетового |
| P0-06 | P0 | `src/theme/colors.ts` | lightColors показывает белый фон; нет единственной тёмной темы |
| P0-17 | P0 | `app/(tabs)/profile.tsx` | Профиль рендерится на белом фоне |
| P1-02 | P1 | `constants/typography.ts:9` | Шрифт заголовков Plus Jakarta Sans вместо Sora |
| P1-05 | P1 | `src/theme/colors.ts` | Параллельный набор цветов с неверными значениями |
| P1-07 | P1 | `components/ui/Button.tsx:104` | Primary кнопка: borderRadius 12 вместо 32 (pill) |
| P1-10 | P1 | `app/(tabs)/_layout.tsx` | 8 табов вместо 4; лейблы усечены |
| P1-12 | P1 | `constants/colors.ts:31` | textInverse = #060B18 вместо #0A0A14 |
| P1-14 | P1 | `app/(tabs)/bookings.tsx:61-81` | Status Badge: нет uppercase, нет height 22 |
| P1-16 | P1 | `app/(tabs)/wallet.tsx:112` | Кнопка "Пополнить": borderRadius 12 вместо 32 |
| P1-18 | P1 | `app/(tabs)/profile.tsx:929` | Кнопка "Улучшить до Premium": borderRadius 10 вместо 32 |
| P1-S4 | P1 | `constants/shadows.ts:14` | SHADOW_PRIMARY синий вместо янтарного |
| P1-S5 | P1 | `constants/radius.ts:17` | Radius.button = 12 вместо 32 |
| P2-01 | P2 | `app/onboarding.tsx:217` | Кнопка "Далее": borderRadius из Radius.button (12) |
| P2-08 | P2 | `app/(auth)/login.tsx:176` | Try Demo — нестандартный стиль кнопки |
| P2-09 | P2 | `components/auth/SocialAuthButtons.tsx:228` | borderRadius 12 — хардкод вместо токена |
| P2-13 | P2 | `app/(tabs)/bookings.tsx:313` | Чип текст через textInverse |
| P2-15 | P2 | `components/wallet/BalanceDisplay.tsx:50` | Баланс: fontSize 48, нет Sora |
| P2-19 | P2 | `app/(tabs)/profile.tsx:1053` | Кнопка "Сохранить данные": borderRadius 16 |

---

*QA-аудит выполнен на основе статического анализа кода и Playwright-скриншотов. Скриншоты сохранены в `workspace/travel-ai/screenshots/`.*
