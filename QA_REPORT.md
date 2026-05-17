# QA Report — Travel AI MVP

## Статус: NEEDS_FIXES

Тесты не запускались (нет тестовой БД в среде CI). Анализ статический.
Найдено: 2 блокера (P0), 5 важных (P1), 5 средних (P2), 4 замечания (P3).

---

## Критические баги (P0 — блокируют запуск)

- [ ] **[Backend]** `apps/backend/src/handlers/chat.handler.ts:243-245` —
  Некорректный фильтр истории: исключение сообщений по `{ role: 'USER', content }` ищет
  все USER-сообщения с таким же текстом, а не только только что добавленное.
  Если пользователь дважды отправит одно и то же сообщение, оба будут исключены из истории
  Claude, что сломает контекст разговора.
  **Как чинить:** фильтровать по `createdAt < now` или сохранять ID нового сообщения и
  исключать по `id`.

- [ ] **[Backend]** `apps/backend/src/server.ts` — JWT-плагин (`jwt.plugin.ts`) нигде
  не регистрируется в `buildServer()`. При этом в `package.json` присутствует зависимость
  `@fastify/jwt`, а файл плагина существует — это свидетельствует об оборванной интеграции.
  Сам `auth.middleware.ts` использует `jsonwebtoken` напрямую (что корректно), но
  декоратор `fastify.jwt` будет недоступен если кто-то попытается обратиться к нему.
  **Как чинить:** либо зарегистрировать плагин в `buildServer()` после `corsPlugin`,
  либо удалить `jwt.plugin.ts` и зависимость `@fastify/jwt` как неиспользуемую.

---

## Важные баги (P1 — нужно исправить до релиза)

- [ ] **[Mobile/Backend API mismatch]**
  `apps/mobile/services/authService.ts:27` — метод `refresh()` типизирован как
  возвращающий `AuthResponse` (содержит поле `user`), но бэкенд на
  `POST /api/auth/refresh` возвращает только `{ accessToken, refreshToken }` без `user`
  (тип `TokensResponse` из `API_CONTRACTS.md`).
  В `authStore.ts:59` результат `refresh` используется как `{ accessToken, refreshToken }`,
  значит runtime работает, но TypeScript-типизация неверна, что маскирует ошибки.
  **Как чинить:** в `authService.ts` создать отдельный тип `TokensResponse` для `refresh()`.

- [ ] **[Mobile]** `apps/mobile/hooks/useSSE.ts:86-87` — поля SSE-события `tool_use`
  и `tool_result` не совпадают с тем, что шлёт бэкенд.
  Бэкенд отправляет `{ type: 'tool_use', toolName, toolInput, toolUseId }`,
  а `SSEEvent` в `types/index.ts:103` и handler в `useSSE.ts:86` ожидают поля
  `tool` и `input` (без `toolUseId`). Аналогично `tool_result`: бэкенд шлёт
  `{ toolUseId, result }`, тип ожидает `{ tool, result }`.
  Это означает, что `handlers.onToolUse` вызывается с `undefined` вместо имени инструмента.
  **Как чинить:** привести `SSEEvent` в `types/index.ts` к полям бэкенда:
  `toolName`, `toolInput`, `toolUseId` для `tool_use`; `toolUseId`, `result` для `tool_result`.

- [ ] **[Mobile]** `apps/mobile/app/chat/[sessionId].tsx:123-134` —
  `handleConfirmBooking` вообще не вызывает `confirmBooking` из `bookingStore`.
  Функция показывает `Alert` и обнуляет `pendingBooking`, но не делает POST-запроса
  на `/api/bookings/confirm`. Кнопка "Оплатить" в `BookingConfirmModal` не производит
  фактического бронирования.
  **Как чинить:** передать в `BookingDraft.offerId` (или `bookingId`) из ивента
  `booking_draft` и вызвать `confirmBooking(bookingId)` из `bookingStore`.

- [ ] **[Mobile/Backend API mismatch]**
  `apps/mobile/services/bookingService.ts:6` — поле в запросе называется
  `paymentFromWallet`, тогда как контракт API (`API_CONTRACTS.md`) и бэкенд-хендлер
  (`bookings.handler.ts:17`) ожидают `payFromWallet`.
  **Как чинить:** переименовать поле в `bookingService.ts` и `ConfirmBookingPayload`.

- [ ] **[Mobile/Backend API mismatch]**
  `apps/mobile/services/chatService.ts:10-13` — `createSession` ожидает ответ
  `{ sessionId, title }`, тогда как бэкенд возвращает `{ session: { id, title, ... } }`
  (`chat.handler.ts:122`). Поле `id` вместо `sessionId`. При создании сессии
  `chatStore.createSession()` запишет `undefined` как ID новой сессии.
  **Как чинить:** исправить `CreateSessionResponse` на `{ session: { id, title, ... } }`
  и обращение к нему в `chatStore.ts:38-39`.

---

## Средние баги (P2 — желательно исправить)

- [ ] **[Mobile/Backend API mismatch]**
  `apps/mobile/types/index.ts:11` — `UserSubscription.status` содержит `'INACTIVE'`,
  которого нет ни в схеме Prisma, ни в API-контракте (там `CANCELLED`).
  При получении статуса `CANCELLED` с бэкенда UI-условия на `status === 'INACTIVE'`
  никогда не сработают.
  **Как чинить:** заменить `'INACTIVE'` на `'CANCELLED'` в типе `UserSubscription`.

- [ ] **[Mobile/Backend API mismatch]**
  `apps/mobile/types/index.ts:83` — `TransactionType` включает `'PAYMENT'` и `'REFUND'`,
  которых нет в Prisma-enum (`TOPUP` / `DEBIT`). Бэкенд никогда не вернёт эти значения.
  `WalletStore` хранит `transactions: WalletTransaction[]` с числовым `amount`,
  однако бэкенд возвращает `amount` как строку (`Decimal.toString()`). При отображении
  числа со строкой будет `NaN`.
  **Как чинить:** `TransactionType = 'TOPUP' | 'DEBIT'`; `amount` в типе — `string`,
  парсить в UI перед отображением.

- [ ] **[Mobile/Backend API mismatch]**
  `apps/mobile/types/index.ts:110-117` — `PaginatedResponse.pagination` содержит поля
  `pageSize` и `totalPages`, которых нет в ответе бэкенда. Бэкенд возвращает `limit`
  и `hasNext`. Это вызовет `undefined` при обращении к `pagination.pageSize`.
  **Как чинить:** выровнять тип `PaginatedResponse` с бэкендом: `limit`, `hasNext`.

- [ ] **[Mobile/Backend API mismatch]**
  `apps/mobile/services/walletService.ts:12-13` — `WalletData.balance` типизирован как
  `number`, хотя бэкенд возвращает строку (Decimal). `walletStore` тоже хранит
  `balance: number`. Если сервер возвращает `"1500.00"`, то `balance` в store будет
  строкой, но TS считает её `number`. Сравнение с `pendingBooking.totalPrice`
  (`BookingDraft.totalPrice: number`) пройдёт TS, но даст `"1500.00" >= 15000` — false.
  **Как чинить:** `balance` и `totalPrice` держать как `string` или явно парсить
  `parseFloat()` на уровне сервиса.

- [ ] **[Backend]** `apps/backend/src/middleware/auth.middleware.ts:23` —
  после неудачной верификации JWT функция не делает `return` после `reply.send()`.
  Выполнение продолжается, `request.userId` остаётся `undefined`. Fastify не бросит
  ошибку, но хендлер получит `userId = undefined` и сделает запрос в БД с `where: { userId: undefined }`.
  **Как чинить:** добавить `return;` после `reply.status(err.statusCode).send(err.toJSON());`
  на строке 24.

---

## Замечания (P3 — технический долг)

- [ ] **[Backend]** `apps/backend/src/lib/jwt.ts:3-4` — если `JWT_ACCESS_SECRET` или
  `JWT_REFRESH_SECRET` не установлены в `.env`, переменные будут `undefined` (постфикс `!`
  лишь подавляет TS-ошибку). JWT-подпись с ключом `undefined` формально работает,
  но крайне небезопасна. Добавить явную проверку при старте сервера.

- [ ] **[Backend]** `apps/backend/src/handlers/auth.handler.ts:91` — `generateTokenPair`
  вызывается вне транзакции: если `prisma.refreshToken.create` упадёт, пользователь
  создан, но токен не сохранён — ответ будет 500 при корректно созданном аккаунте.
  Лучше включить создание refresh-токена в ту же транзакцию или добавить rollback.

- [ ] **[Backend]** `apps/backend/src/handlers/chat.handler.ts` — отсутствует проверка
  rate-limit перед записью user-сообщения в БД. Сейчас сообщение сохраняется
  (`prisma.message.create` на строке 225-230), а затем `checkChatLimit` (в middleware)
  работает ДО хендлера. Порядок правильный, но счётчик лимита включает сообщение,
  которое только что сохранено. Это не баг, но стоит задокументировать.

- [ ] **[Mobile]** `apps/mobile/app/_layout.tsx:14-16` — `loadStoredAuth` вызывается
  в `useEffect` без зависимости от `loadStoredAuth`, что вызовет предупреждение ESLint
  `react-hooks/exhaustive-deps`. Следует передать `[loadStoredAuth]` в массив зависимостей
  (функция стабильна через Zustand, так что лишних вызовов не будет).

---

## Несоответствия API (мобайл vs бэкенд)

| Место | Мобайл | Бэкенд | Критичность |
|---|---|---|---|
| `authService.refresh()` тип ответа | `AuthResponse` (с `user`) | `TokensResponse` (без `user`) | P1 |
| SSE `tool_use` поля | `tool`, `input` | `toolName`, `toolInput`, `toolUseId` | P1 |
| SSE `tool_result` поля | `tool`, `result` | `toolUseId`, `result` | P1 |
| `confirmBooking` поле | `paymentFromWallet` | `payFromWallet` | P1 |
| `createSession` ответ | `{ sessionId, title }` | `{ session: { id, title, ... } }` | P1 |
| `SubscriptionStatus` тип | `'INACTIVE'` | `'CANCELLED'` | P2 |
| `TransactionType` тип | `'PAYMENT' \| 'REFUND'` | только `'TOPUP' \| 'DEBIT'` | P2 |
| `PaginatedResponse.pagination` поля | `pageSize`, `totalPages` | `limit`, `hasNext` | P2 |
| `balance` / `amount` числовой тип | `number` | строка (Decimal) | P2 |

---

## Что работает корректно

- Регистрация в транзакции: user + wallet + subscription создаются атомарно (`auth.handler.ts:71-89`).
- Refresh token rotation: старый токен отзывается, новая пара выдаётся корректно.
- JWT middleware: заголовок `Authorization: Bearer` парсится, `userId` устанавливается на request.
- SSE streaming: заголовки (`text/event-stream`, `no-cache`, `keep-alive`) выставлены верно; agentic loop c tool use реализован корректно.
- Парсинг SSE на мобайле: буферизация по `\n\n`, разбор по `data:` — работает правильно.
- Auth guard в `_layout.tsx`: redirect по `isAuthenticated` через Zustand корректен.
- Bcrypt с 10 раундами — приемлемый уровень для MVP.
- Prisma schema: соответствует `DATABASE.md`, индексы расставлены адекватно.
- `confirmBooking` на бэкенде атомарен: списание баланса и смена статуса брони — в одной транзакции.
- Rate limiter: проверка FREE-лимитов (сообщения/день, сессии, брони/месяц) реализована.
- Refresh token interceptor в `api.ts`: queue для параллельных 401, логика повтора верна.
- CORS plugin: мобайльный клиент (origin=undefined) пропускается корректно.
- SecureStore: токены сохраняются в зашифрованное хранилище, не в AsyncStorage.
- Валидация входных данных на бэкенде через Fastify JSON Schema (email format, minLength 8 для пароля, maxLength 4000 для сообщений).

---

## Что я добавил

- `/Users/v/Documents/Claude/Projects/Аи Агенты/workspace/travel-ai/apps/backend/src/__tests__/auth.test.ts`
  — интеграционные тесты (Jest + Supertest) для auth flow:
  - регистрация нового пользователя (проверяет 201, структуру ответа, создание wallet и subscription в БД);
  - попытка повторной регистрации (409);
  - валидация слабого пароля (422);
  - логин с верными данными (200 + токены);
  - логин с неверным паролем (401);
  - логин с несуществующим email (401);
  - refresh: новые токены отличны от старых, старый revoked в БД;
  - повторное использование rotated-токена (401);
  - невалидный токен (401).
