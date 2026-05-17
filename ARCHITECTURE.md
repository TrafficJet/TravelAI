# Travel AI — Архитектура приложения

## 1. Стек

| Технология | Обоснование |
|---|---|
| React Native + Expo SDK 51 | потому что даёт единую кодовую базу для iOS/Android с минимальным порогом входа и богатой экосистемой |
| TypeScript | потому что строгая типизация критична при работе с внешними API (Duffel, Booking, Anthropic) |
| Expo Router v3 | потому что файловая маршрутизация снижает boilerplate и нативно поддерживает deep links |
| Zustand | потому что минималистичен, не требует boilerplate Redux и достаточен для стейта MVP |
| NativeWind v4 | потому что Tailwind-классы ускоряют UI-разработку и консистентны с web-экосистемой |
| Node.js + Fastify | потому что Fastify быстрее Express, имеет встроенную схему валидации и хорошо поддерживает SSE |
| Prisma + PostgreSQL | потому что типобезопасный ORM + надёжная реляционная БД, стандарт для финансовых данных (кошелёк) |
| JWT (access 15m + refresh 30d) | потому что stateless-аутентификация хорошо масштабируется и стандартна для мобильных клиентов |
| Expo SecureStore | потому что нативное зашифрованное хранилище токенов на устройстве |
| Claude claude-opus-4-5 + @anthropic-ai/sdk | потому что tool use + SSE streaming — ключевые возможности для AI-чата с бронированием |
| SSE (Server-Sent Events) | потому что проще WebSocket для однонаправленного стриминга ответов Claude |
| Duffel API | потому что REST-first авиа-API с тестовым режимом, подходит для MVP |
| Aviasales API | потому что покрывает СНГ-направления, которые Duffel может пропускать |
| Booking.com Partner API | потому что крупнейшая база отелей с локализацией под СНГ |

---

## 2. Структура папок

```
travel-ai/
├── apps/
│   ├── mobile/                        # Expo приложение
│   │   ├── app/                       # Expo Router — файловая маршрутизация
│   │   │   ├── (auth)/                # Группа неавторизованных экранов
│   │   │   │   ├── login.tsx
│   │   │   │   ├── register.tsx
│   │   │   │   └── _layout.tsx
│   │   │   ├── (tabs)/                # Основная навигация (tab bar)
│   │   │   │   ├── index.tsx          # Чат (главный экран)
│   │   │   │   ├── bookings.tsx       # Мои брони
│   │   │   │   ├── wallet.tsx         # Кошелёк
│   │   │   │   ├── profile.tsx        # Профиль / подписка
│   │   │   │   └── _layout.tsx
│   │   │   ├── chat/
│   │   │   │   └── [sessionId].tsx    # Экран конкретного чата
│   │   │   ├── bookings/
│   │   │   │   └── [bookingId].tsx    # Детали брони
│   │   │   ├── subscription/
│   │   │   │   └── plans.tsx          # Экран выбора плана
│   │   │   ├── wallet/
│   │   │   │   └── topup.tsx          # Пополнение кошелька
│   │   │   ├── _layout.tsx            # Root layout (auth guard)
│   │   │   └── +not-found.tsx
│   │   ├── components/
│   │   │   ├── chat/
│   │   │   │   ├── MessageBubble.tsx
│   │   │   │   ├── ToolResultCard.tsx  # Карточка результата поиска рейса/отеля
│   │   │   │   ├── BookingConfirmModal.tsx
│   │   │   │   └── ChatInput.tsx
│   │   │   ├── booking/
│   │   │   │   ├── FlightCard.tsx
│   │   │   │   ├── HotelCard.tsx
│   │   │   │   └── BookingStatusBadge.tsx
│   │   │   ├── wallet/
│   │   │   │   ├── BalanceDisplay.tsx
│   │   │   │   └── TransactionItem.tsx
│   │   │   └── ui/                    # Переиспользуемые базовые компоненты
│   │   │       ├── Button.tsx
│   │   │       ├── Input.tsx
│   │   │       ├── Card.tsx
│   │   │       └── LoadingSpinner.tsx
│   │   ├── stores/                    # Zustand stores
│   │   │   ├── authStore.ts
│   │   │   ├── chatStore.ts
│   │   │   ├── walletStore.ts
│   │   │   └── bookingStore.ts
│   │   ├── services/                  # HTTP-клиенты и SSE
│   │   │   ├── api.ts                 # Базовый axios-инстанс с interceptors
│   │   │   ├── authService.ts
│   │   │   ├── chatService.ts         # SSE streaming
│   │   │   ├── walletService.ts
│   │   │   └── bookingService.ts
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useChat.ts
│   │   │   └── useSSE.ts
│   │   ├── constants/
│   │   │   ├── colors.ts
│   │   │   └── config.ts              # API_BASE_URL и прочие константы
│   │   ├── assets/
│   │   │   ├── fonts/
│   │   │   └── images/
│   │   ├── app.json
│   │   ├── babel.config.js
│   │   ├── tailwind.config.js
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── backend/                       # Fastify API
│       ├── src/
│       │   ├── routes/
│       │   │   ├── auth.routes.ts
│       │   │   ├── users.routes.ts
│       │   │   ├── wallet.routes.ts
│       │   │   ├── subscriptions.routes.ts
│       │   │   ├── chat.routes.ts     # включая SSE endpoint
│       │   │   ├── bookings.routes.ts
│       │   │   └── search.routes.ts
│       │   ├── handlers/              # Бизнес-логика роутов
│       │   │   ├── auth.handler.ts
│       │   │   ├── users.handler.ts
│       │   │   ├── wallet.handler.ts
│       │   │   ├── subscriptions.handler.ts
│       │   │   ├── chat.handler.ts
│       │   │   ├── bookings.handler.ts
│       │   │   └── search.handler.ts
│       │   ├── services/              # Внешние интеграции
│       │   │   ├── claude.service.ts  # Anthropic SDK, tool use, streaming
│       │   │   ├── duffel.service.ts
│       │   │   ├── aviasales.service.ts
│       │   │   ├── booking.service.ts
│       │   │   └── payment.service.ts # Заглушка эквайринга
│       │   ├── tools/                 # Claude tool definitions
│       │   │   ├── index.ts           # Экспорт всех tools
│       │   │   ├── searchFlights.tool.ts
│       │   │   ├── searchHotels.tool.ts
│       │   │   ├── createBooking.tool.ts
│       │   │   ├── getWalletBalance.tool.ts
│       │   │   └── getBookingStatus.tool.ts
│       │   ├── middleware/
│       │   │   ├── auth.middleware.ts  # JWT верификация
│       │   │   └── rateLimiter.ts      # Лимиты для free tier
│       │   ├── plugins/
│       │   │   ├── prisma.plugin.ts
│       │   │   ├── cors.plugin.ts
│       │   │   └── jwt.plugin.ts
│       │   ├── lib/
│       │   │   ├── prisma.ts          # Prisma client singleton
│       │   │   ├── jwt.ts             # Хелперы токенов
│       │   │   └── errors.ts          # Кастомные классы ошибок
│       │   ├── types/
│       │   │   └── fastify.d.ts       # Augmentation типов Fastify
│       │   └── server.ts              # Entry point
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       ├── .env.example
│       ├── tsconfig.json
│       └── package.json
│
└── packages/
    └── shared/                        # Общие TypeScript типы
        ├── src/
        │   ├── types/
        │   │   ├── auth.types.ts
        │   │   ├── user.types.ts
        │   │   ├── chat.types.ts
        │   │   ├── booking.types.ts
        │   │   ├── wallet.types.ts
        │   │   └── search.types.ts
        │   └── index.ts
        ├── tsconfig.json
        └── package.json
```

---

## 5. Экраны и навигация

### Неавторизованная зона `(auth)/`

```
login.tsx
  → (успешный вход) → (tabs)/index
  → "Нет аккаунта?" → register.tsx

register.tsx
  → (успешная регистрация) → (tabs)/index
  → "Уже есть аккаунт?" → login.tsx
```

### Авторизованная зона `(tabs)/`

#### Tab 1: Чат `index.tsx`
- Список сессий чата (последние 20)
- Кнопка "Новый чат" → создаёт сессию → chat/[sessionId].tsx
- Тап на сессию → chat/[sessionId].tsx

#### `chat/[sessionId].tsx`
- История сообщений с SSE-стримингом нового ответа
- Карточки `ToolResultCard` для рейсов/отелей (результаты tool use)
- Кнопка "Забронировать" в карточке → `BookingConfirmModal`
- `BookingConfirmModal`: показывает цену, баланс кошелька, кнопки "Оплатить" / "Отмена"
- После подтверждения → bookings/[bookingId].tsx

#### Tab 2: Брони `bookings.tsx`
- Список броней пользователя (FLIGHT / HOTEL), сгруппированные по статусу
- Тап → bookings/[bookingId].tsx

#### `bookings/[bookingId].tsx`
- Детали брони: статус, маршрут/отель, пассажиры, цена
- Кнопка "Отменить" (если статус CONFIRMED)

#### Tab 3: Кошелёк `wallet.tsx`
- Текущий баланс (RUB)
- Кнопка "Пополнить" → wallet/topup.tsx
- Список последних транзакций

#### `wallet/topup.tsx`
- Поле суммы
- Выбор способа (заглушка: "Банковская карта")
- Кнопка "Пополнить" → POST /api/wallet/topup → обновление баланса

#### Tab 4: Профиль `profile.tsx`
- Имя, email, телефон (редактирование inline)
- Блок "Подписка": текущий план, дата окончания, кнопка "Улучшить"
- "Улучшить" → subscription/plans.tsx
- Кнопка "Выйти"

#### `subscription/plans.tsx`
- Карточки планов: FREE vs PREMIUM (цена, лимиты)
- Кнопка "Оформить" → POST /api/subscriptions/subscribe

### Переходы и guards

```
Root _layout.tsx:
  - Читает authStore.isAuthenticated
  - false → redirect (auth)/login
  - true  → (tabs)
```

### Лимиты free tier (применяются на бэкенде через rateLimiter)

| Параметр | FREE | PREMIUM |
|---|---|---|
| Сообщений в день | 10 | безлимит |
| Активных сессий | 3 | 50 |
| Бронирований в месяц | 2 | безлимит |
