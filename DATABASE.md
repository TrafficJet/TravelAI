# Travel AI — Схема базы данных

## Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Пользователи ────────────────────────────────────────────────────────────

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  phone     String?
  name      String
  password  String   // bcrypt hash
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  wallet        Wallet?
  subscription  Subscription?
  chatSessions  ChatSession[]
  bookings      Booking[]
  refreshTokens RefreshToken[]

  @@map("users")
}

// ─── Refresh-токены ───────────────────────────────────────────────────────────
// Хранятся для возможности инвалидации (logout / rotate)

model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String   @map("user_id")
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")
  revoked   Boolean  @default(false)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("refresh_tokens")
}

// ─── Кошелёк ─────────────────────────────────────────────────────────────────

model Wallet {
  id        String   @id @default(uuid())
  userId    String   @unique @map("user_id")
  balance   Decimal  @default(0) @db.Decimal(12, 2)
  currency  String   @default("RUB")
  updatedAt DateTime @updatedAt @map("updated_at")

  user         User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions WalletTransaction[]

  @@map("wallets")
}

model WalletTransaction {
  id          String              @id @default(uuid())
  walletId    String              @map("wallet_id")
  amount      Decimal             @db.Decimal(12, 2)  // всегда положительное число
  type        WalletTransactionType
  description String
  bookingId   String?             @map("booking_id")  // ссылка при списании за бронь
  createdAt   DateTime            @default(now()) @map("created_at")

  wallet Wallet @relation(fields: [walletId], references: [id], onDelete: Cascade)

  @@index([walletId])
  @@index([createdAt])
  @@map("wallet_transactions")
}

enum WalletTransactionType {
  TOPUP   // пополнение
  DEBIT   // списание (оплата брони)
}

// ─── Подписки ─────────────────────────────────────────────────────────────────

model Subscription {
  id        String             @id @default(uuid())
  userId    String             @unique @map("user_id")
  plan      SubscriptionPlan   @default(FREE)
  status    SubscriptionStatus @default(ACTIVE)
  expiresAt DateTime?          @map("expires_at")  // null для FREE (бессрочный)
  createdAt DateTime           @default(now()) @map("created_at")
  updatedAt DateTime           @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("subscriptions")
}

enum SubscriptionPlan {
  FREE
  PREMIUM
}

enum SubscriptionStatus {
  ACTIVE
  CANCELLED
  EXPIRED
}

// ─── Чат-сессии ──────────────────────────────────────────────────────────────

model ChatSession {
  id        String    @id @default(uuid())
  userId    String    @map("user_id")
  title     String    @default("Новый чат")  // авто-генерируется из первого сообщения
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")

  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages Message[]

  @@index([userId])
  @@index([updatedAt])
  @@map("chat_sessions")
}

model Message {
  id          String      @id @default(uuid())
  sessionId   String      @map("session_id")
  role        MessageRole
  content     String      @db.Text  // текст сообщения (null для tool-сообщений без текста)
  toolName    String?     @map("tool_name")    // имя инструмента (для role=TOOL_USE / TOOL_RESULT)
  toolInput   Json?       @map("tool_input")   // аргументы вызова tool
  toolResult  Json?       @map("tool_result")  // результат выполнения tool
  toolUseId   String?     @map("tool_use_id")  // Anthropic tool_use_id для корреляции
  createdAt   DateTime    @default(now()) @map("created_at")

  session ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
  @@index([createdAt])
  @@map("messages")
}

enum MessageRole {
  USER
  ASSISTANT
  TOOL_USE     // запрос на вызов инструмента от Claude
  TOOL_RESULT  // результат выполнения инструмента
}

// ─── Брони ───────────────────────────────────────────────────────────────────

model Booking {
  id         String        @id @default(uuid())
  userId     String        @map("user_id")
  type       BookingType
  status     BookingStatus @default(PENDING)
  provider   BookingProvider
  externalId String?       @map("external_id")  // ID в системе провайдера (Duffel order id и т.д.)
  details    Json          // сериализованные детали: маршрут, пассажиры, отель, даты
  totalPrice Decimal       @map("total_price") @db.Decimal(12, 2)
  currency   String        @default("RUB")
  createdAt  DateTime      @default(now()) @map("created_at")
  updatedAt  DateTime      @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@index([userId])
  @@index([status])
  @@index([createdAt])
  @@map("bookings")
}

enum BookingType {
  FLIGHT
  HOTEL
}

enum BookingStatus {
  PENDING    // создана, ожидает оплаты
  CONFIRMED  // оплачена и подтверждена у провайдера
  CANCELLED  // отменена
  FAILED     // ошибка при подтверждении у провайдера
}

enum BookingProvider {
  DUFFEL
  AVIASALES
  BOOKING
}
```

---

## Комментарии к схеме

### Кошелёк

- `balance` хранится на уровне `Wallet` и обновляется транзакционно вместе с
  записью в `WalletTransaction` — единственный способ изменить баланс.
- `amount` в `WalletTransaction` всегда положительный; тип операции определяется
  полем `type` (TOPUP / DEBIT).
- Поле `bookingId` в транзакции необязательно; заполняется только при списании
  за конкретную бронь.

### Сообщения и tool use

- `MessageRole.TOOL_USE` — сохраняется, когда Claude возвращает блок `tool_use`
  (имя инструмента + аргументы). Поля `toolName`, `toolInput`, `toolUseId` заполнены.
- `MessageRole.TOOL_RESULT` — сохраняется после выполнения инструмента на бэкенде
  перед отправкой результата обратно в Claude. Поля `toolUseId`, `toolResult` заполнены.
- Такая структура позволяет полностью восстановить Anthropic Messages API history
  из БД для продолжения сессии.

### Брони

- `details` (Json) содержит разные структуры в зависимости от `type`:
  - FLIGHT: `{ segments, passengers, baggage, airline }` 
  - HOTEL: `{ hotelName, address, checkIn, checkOut, roomType, guests }`
- `externalId` — ID заказа у провайдера; заполняется после успешного
  подтверждения у Duffel / Booking.

### Индексы

Ключевые индексы для производительности MVP:
- `users.email` — уникальный, для логина
- `wallet_transactions(walletId, createdAt)` — пагинированная история транзакций
- `chat_sessions(userId, updatedAt)` — список сессий пользователя по дате
- `messages(sessionId, createdAt)` — история чата в хронологическом порядке
- `bookings(userId, status)` — фильтрация броней пользователя по статусу
