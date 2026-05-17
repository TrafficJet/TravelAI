# Travel AI — API Контракты

## Общие соглашения

- Base URL: `https://api.travel-ai.app/api` (prod) / `http://localhost:3000/api` (dev)
- Все запросы и ответы — `Content-Type: application/json`
- Авторизованные эндпоинты требуют заголовок `Authorization: Bearer <accessToken>`
- SSE endpoint возвращает `Content-Type: text/event-stream`
- Формат ошибок единый для всех эндпоинтов:

```typescript
interface ApiError {
  error: {
    code: string;       // машиночитаемый код: "UNAUTHORIZED", "VALIDATION_ERROR", etc.
    message: string;    // человекочитаемое сообщение (на русском)
    details?: unknown;  // дополнительные данные (поля валидации и т.п.)
  };
}
```

- HTTP статусы: `200` OK, `201` Created, `400` Bad Request, `401` Unauthorized,
  `403` Forbidden, `404` Not Found, `409` Conflict, `422` Validation Error,
  `429` Too Many Requests, `500` Internal Server Error

---

## Общие TypeScript типы

```typescript
// packages/shared/src/types/common.types.ts

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
  };
}

export type SubscriptionPlan = 'FREE' | 'PREMIUM';
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
export type BookingType = 'FLIGHT' | 'HOTEL';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'FAILED';
export type BookingProvider = 'DUFFEL' | 'AVIASALES' | 'BOOKING';
export type MessageRole = 'USER' | 'ASSISTANT' | 'TOOL_USE' | 'TOOL_RESULT';
export type WalletTransactionType = 'TOPUP' | 'DEBIT';
```

---

## Auth `/api/auth`

### POST `/api/auth/register`

Регистрация нового пользователя. Создаёт пользователя, кошелёк (balance=0, RUB)
и FREE подписку.

**Request Body**
```typescript
interface RegisterRequest {
  email: string;     // валидный email
  password: string;  // минимум 8 символов
  name: string;      // 2–100 символов
}
```

**Response `201`**
```typescript
interface AuthResponse {
  accessToken: string;   // JWT, TTL 15 минут
  refreshToken: string;  // JWT, TTL 30 дней
  user: UserProfile;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  createdAt: string;  // ISO 8601
}
```

**Ошибки**
- `409 CONFLICT` — email уже зарегистрирован

---

### POST `/api/auth/login`

**Request Body**
```typescript
interface LoginRequest {
  email: string;
  password: string;
}
```

**Response `200`** — `AuthResponse` (тот же тип, что у `/register`)

**Ошибки**
- `401 UNAUTHORIZED` — неверный email или пароль

---

### POST `/api/auth/refresh`

Обновление пары токенов. Старый refresh token инвалидируется (rotation).

**Request Body**
```typescript
interface RefreshRequest {
  refreshToken: string;
}
```

**Response `200`**
```typescript
interface TokensResponse {
  accessToken: string;
  refreshToken: string;
}
```

**Ошибки**
- `401 UNAUTHORIZED` — токен недействителен или отозван

---

### POST `/api/auth/logout`

Требует авторизации. Инвалидирует refresh token.

**Request Body**
```typescript
interface LogoutRequest {
  refreshToken: string;
}
```

**Response `200`**
```typescript
interface SuccessResponse {
  success: true;
}
```

---

## Users `/api/users`

### GET `/api/users/me`

Требует авторизации. Возвращает профиль с балансом кошелька и подпиской.

**Response `200`**
```typescript
interface MeResponse {
  user: UserProfile;
  wallet: {
    balance: string;   // Decimal как строка: "1500.00"
    currency: string;  // "RUB"
  };
  subscription: {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    expiresAt: string | null;  // ISO 8601 или null для FREE
  };
}
```

---

### PATCH `/api/users/me`

Требует авторизации. Обновляет редактируемые поля профиля.

**Request Body**
```typescript
interface UpdateProfileRequest {
  name?: string;   // 2–100 символов
  phone?: string;  // E.164 формат: "+79001234567"
}
```

**Response `200`**
```typescript
interface UpdateProfileResponse {
  user: UserProfile;
}
```

---

## Wallet `/api/wallet`

### GET `/api/wallet`

Требует авторизации. Возвращает баланс и последние 10 транзакций.

**Response `200`**
```typescript
interface WalletResponse {
  balance: string;        // "1500.00"
  currency: string;       // "RUB"
  transactions: WalletTransaction[];
}

interface WalletTransaction {
  id: string;
  amount: string;         // "500.00"
  type: WalletTransactionType;
  description: string;
  bookingId: string | null;
  createdAt: string;
}
```

---

### POST `/api/wallet/topup`

Требует авторизации. Пополняет баланс (эквайринг — заглушка в MVP).

**Request Body**
```typescript
interface TopupRequest {
  amount: number;          // сумма в рублях, минимум 100, максимум 100000
  paymentMethod: 'CARD';  // в MVP только карта (заглушка)
}
```

**Response `200`**
```typescript
interface TopupResponse {
  newBalance: string;           // "2000.00"
  transaction: WalletTransaction;
}
```

**Ошибки**
- `400 BAD_REQUEST` — сумма вне допустимого диапазона

---

### GET `/api/wallet/transactions`

Требует авторизации. Пагинированная история транзакций.

**Query Params**
```
page: number (default 1)
limit: number (default 20, max 50)
type: "TOPUP" | "DEBIT" (опционально, фильтр)
```

**Response `200`** — `PaginatedResponse<WalletTransaction>`

---

## Subscriptions `/api/subscriptions`

### GET `/api/subscriptions/plans`

Публичный эндпоинт. Возвращает список доступных планов.

**Response `200`**
```typescript
interface PlansResponse {
  plans: SubscriptionPlanInfo[];
}

interface SubscriptionPlanInfo {
  id: SubscriptionPlan;
  name: string;          // "Базовый" / "Премиум"
  price: number;         // 0 для FREE, цена в RUB для PREMIUM
  currency: string;      // "RUB"
  billingPeriod: 'MONTHLY' | null;
  features: string[];    // список преимуществ на русском
  limits: {
    messagesPerDay: number | null;     // null = безлимит
    activeSessions: number | null;
    bookingsPerMonth: number | null;
  };
}
```

---

### POST `/api/subscriptions/subscribe`

Требует авторизации. Оформляет или продлевает подписку.

**Request Body**
```typescript
interface SubscribeRequest {
  plan: SubscriptionPlan;  // "PREMIUM"
}
```

**Response `200`**
```typescript
interface SubscribeResponse {
  subscription: {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    expiresAt: string;  // ISO 8601
  };
  newBalance: string;  // баланс после списания
}
```

**Ошибки**
- `402 PAYMENT_REQUIRED` — недостаточно средств на кошельке
- `409 CONFLICT` — подписка уже активна (идемпотентность через план)

---

### GET `/api/subscriptions/current`

Требует авторизации. Текущая подписка пользователя.

**Response `200`**
```typescript
interface CurrentSubscriptionResponse {
  subscription: {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    expiresAt: string | null;
  };
  usage: {
    messagesUsedToday: number;
    bookingsUsedThisMonth: number;
  };
}
```

---

## Chat `/api/chat`

### POST `/api/chat/sessions`

Требует авторизации. Создаёт новую сессию чата.

**Request Body** — пустое тело или опциональный заголовок:
```typescript
interface CreateSessionRequest {
  title?: string;  // если не передан — генерируется из первого сообщения
}
```

**Response `201`**
```typescript
interface CreateSessionResponse {
  session: ChatSession;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}
```

**Ошибки**
- `403 LIMIT_REACHED` — превышен лимит активных сессий для FREE tier

---

### GET `/api/chat/sessions`

Требует авторизации. Список сессий пользователя (последние обновлённые).

**Query Params**
```
page: number (default 1)
limit: number (default 20, max 50)
```

**Response `200`** — `PaginatedResponse<ChatSession>`

---

### GET `/api/chat/sessions/:id/messages`

Требует авторизации. История сообщений сессии в хронологическом порядке.

**Query Params**
```
page: number (default 1)
limit: number (default 50)
```

**Response `200`**
```typescript
interface MessagesResponse {
  session: ChatSession;
  messages: ChatMessage[];
  pagination: PaginatedResponse<ChatMessage>['pagination'];
}

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  toolName: string | null;
  toolInput: unknown | null;
  toolResult: unknown | null;
  toolUseId: string | null;
  createdAt: string;
}
```

**Ошибки**
- `403 FORBIDDEN` — сессия не принадлежит текущему пользователю
- `404 NOT_FOUND` — сессия не найдена

---

### POST `/api/chat/sessions/:id/messages` — SSE Stream

Требует авторизации. Отправляет сообщение и возвращает ответ Claude стримом.

**Request Body**
```typescript
interface SendMessageRequest {
  content: string;  // текст сообщения пользователя, 1–4000 символов
}
```

**Response Headers**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**SSE Event Types**

```typescript
// Тип каждого SSE-события
type SSEEvent =
  | { type: 'text_delta';    delta: string }            // фрагмент текста от Claude
  | { type: 'tool_use';      toolName: string; toolInput: unknown; toolUseId: string }  // Claude вызвал инструмент
  | { type: 'tool_result';   toolUseId: string; result: unknown }                       // результат инструмента
  | { type: 'booking_draft'; booking: BookingDraft }    // черновик брони (до оплаты)
  | { type: 'done';          messageId: string }        // стрим завершён
  | { type: 'error';         code: string; message: string };

interface BookingDraft {
  type: BookingType;
  provider: BookingProvider;
  offerId: string;       // ID оффера у провайдера
  totalPrice: string;    // "15000.00"
  currency: string;
  details: FlightDetails | HotelDetails;
}
```

**Пример SSE-ответа**
```
data: {"type":"text_delta","delta":"Нашёл подходящие рейсы"}

data: {"type":"tool_use","toolName":"search_flights","toolUseId":"toolu_01","toolInput":{...}}

data: {"type":"tool_result","toolUseId":"toolu_01","result":[...]}

data: {"type":"text_delta","delta":"Вот лучший вариант: Москва → Стамбул"}

data: {"type":"booking_draft","booking":{...}}

data: {"type":"done","messageId":"msg_uuid"}
```

**Ошибки** (возвращаются как SSE event типа `error` или HTTP 4xx до начала стрима)
- `403 LIMIT_REACHED` — превышен дневной лимит сообщений (FREE tier)
- `403 FORBIDDEN` — сессия не принадлежит пользователю
- `404 NOT_FOUND` — сессия не найдена

---

## Bookings `/api/bookings`

### GET `/api/bookings`

Требует авторизации. Список броней пользователя.

**Query Params**
```
page: number (default 1)
limit: number (default 20)
type: "FLIGHT" | "HOTEL" (опционально)
status: "PENDING" | "CONFIRMED" | "CANCELLED" | "FAILED" (опционально)
```

**Response `200`** — `PaginatedResponse<BookingSummary>`

```typescript
interface BookingSummary {
  id: string;
  type: BookingType;
  status: BookingStatus;
  provider: BookingProvider;
  totalPrice: string;
  currency: string;
  createdAt: string;
  // Краткое описание (зависит от type)
  summary: {
    title: string;       // "Москва → Стамбул" или "Hilton Garden Inn"
    subtitle: string;    // "25 мая, 2 пассажира" или "10–15 июня, 2 гостя"
  };
}
```

---

### GET `/api/bookings/:id`

Требует авторизации. Полные детали брони.

**Response `200`**
```typescript
interface BookingDetailResponse {
  booking: BookingDetail;
}

interface BookingDetail {
  id: string;
  type: BookingType;
  status: BookingStatus;
  provider: BookingProvider;
  externalId: string | null;
  totalPrice: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
  details: FlightDetails | HotelDetails;
}

interface FlightDetails {
  segments: FlightSegment[];
  passengers: Passenger[];
  baggage: string;    // "1 место 23 кг"
  bookingReference: string | null;  // PNR после подтверждения
}

interface FlightSegment {
  origin: string;       // IATA код: "SVO"
  destination: string;  // "IST"
  departureAt: string;  // ISO 8601
  arrivalAt: string;
  airline: string;      // "Аэрофлот"
  flightNumber: string; // "SU 100"
  duration: number;     // минуты
}

interface Passenger {
  firstName: string;
  lastName: string;
  birthDate: string;   // "1990-01-15"
  passport: string;    // "7700123456"
}

interface HotelDetails {
  hotelName: string;
  address: string;
  checkIn: string;   // "2025-06-10"
  checkOut: string;  // "2025-06-15"
  roomType: string;  // "Стандартный двухместный"
  guests: Guest[];
  confirmationNumber: string | null;  // после подтверждения
}

interface Guest {
  firstName: string;
  lastName: string;
}
```

**Ошибки**
- `403 FORBIDDEN` — бронь не принадлежит пользователю
- `404 NOT_FOUND` — бронь не найдена

---

### POST `/api/bookings/confirm`

Требует авторизации. Подтверждает бронь и списывает средства с кошелька.
В MVP — выполняется как один синхронный запрос.

**Request Body**
```typescript
interface ConfirmBookingRequest {
  bookingId: string;              // ID существующей брони со статусом PENDING
  payFromWallet: boolean;         // в MVP всегда true
}
```

**Response `200`**
```typescript
interface ConfirmBookingResponse {
  booking: BookingDetail;         // обновлённая бронь со статусом CONFIRMED
  transaction: WalletTransaction; // запись о списании
  newBalance: string;             // остаток на кошельке
}
```

**Ошибки**
- `402 PAYMENT_REQUIRED` — недостаточно средств на кошельке
- `404 NOT_FOUND` — бронь не найдена или не в статусе PENDING
- `422 PROVIDER_ERROR` — провайдер вернул ошибку подтверждения (бронь переходит в FAILED)

---

## Search `/api/search`

Внутренние эндпоинты — вызываются обработчиком Claude tool use на бэкенде.
Не доступны напрямую с мобильного клиента (rate limit + auth на уровне сервиса).

### POST `/api/search/flights`

**Request Body**
```typescript
interface SearchFlightsRequest {
  origin: string;       // IATA: "SVO", "LED"
  destination: string;  // IATA: "IST", "DXB"
  departureDate: string; // "2025-06-10"
  returnDate?: string;   // "2025-06-20" для round-trip
  passengers: {
    adults: number;
    children?: number;   // до 12 лет
    infants?: number;    // до 2 лет
  };
  cabinClass?: 'ECONOMY' | 'BUSINESS' | 'FIRST';
}
```

**Response `200`**
```typescript
interface SearchFlightsResponse {
  offers: FlightOffer[];
  searchId: string;  // для трекинга
}

interface FlightOffer {
  offerId: string;       // ID для передачи в create_booking
  provider: BookingProvider;
  totalPrice: string;    // "15000.00"
  currency: string;
  segments: FlightSegment[];
  baggage: string;
  expiresAt: string;     // время действия оффера (ISO 8601)
}
```

---

### POST `/api/search/hotels`

**Request Body**
```typescript
interface SearchHotelsRequest {
  city: string;          // "Стамбул" или "Istanbul" — нормализуется на бэкенде
  checkIn: string;       // "2025-06-10"
  checkOut: string;      // "2025-06-15"
  guests: {
    adults: number;
    children?: number;
  };
  rooms?: number;        // default 1
  starRating?: number[]; // [3, 4, 5] — фильтр звёздности
  maxPrice?: number;     // макс. цена за ночь в RUB
}
```

**Response `200`**
```typescript
interface SearchHotelsResponse {
  offers: HotelOffer[];
  searchId: string;
}

interface HotelOffer {
  offerId: string;
  provider: 'BOOKING';
  hotelName: string;
  address: string;
  starRating: number;
  rating: number;        // 0–10, рейтинг гостей
  reviewCount: number;
  roomType: string;
  totalPrice: string;    // за весь период
  pricePerNight: string;
  currency: string;
  amenities: string[];   // ["WiFi", "Бассейн", "Завтрак"]
  imageUrl: string | null;
  expiresAt: string;
}
```
