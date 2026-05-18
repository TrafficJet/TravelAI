# TravelAI — Crypto Payment Integration Research

> Дата исследования: 2026-05-19
> Стек: Node.js + Fastify + Prisma + PostgreSQL + TypeScript

---

## 1. Сравнительная таблица решений

| Критерий | NOWPayments | Coinbase Commerce | CryptoAPIs | BitPay | Plisio | Crypto.com Pay |
|---|---|---|---|---|---|---|
| **Комиссия** | 0.5% (крипто→крипто), 1% с конвертацией, 1.5–2.3% в фиат | 1% | $49–$799/мес (API credits, без % от транзакций) | 1–2% + $0.25 | 0.5% (gateway), 1.5% white-label | 0% транзакционная (blockchain fee отдельно) |
| **BTC** | + | + | + | + | + | + |
| **ETH** | + | + | + | + | + | + |
| **USDT** | + (TRC20, ERC20, BEP20, TON) | - (нет USDT) | + | - (нет USDT напрямую) | + (ETH, TRX, BSC, TON, SOL) | + |
| **USDC** | + | + | + | + (ERC20) | + (ETH, Base, SOL) | + |
| **TON** | + (явная поддержка) | - | + (blockchain инфра) | - | + (USDT on TON) | - |
| **REST API** | + | + | + | + | + | + |
| **Webhook** | + (IPN/webhook) | + | + | + | + | + |
| **Sandbox** | + (sandbox.nowpayments.io) | + (test API keys) | + | + | - (не найден публично) | + (sk_test_ prefix) |
| **Сложность интеграции** | 2/5 | 2/5 | 4/5 | 3/5 | 2/5 | 3/5 |
| **Мин. платёж** | ~$2–$5 (зависит от монеты) | не ограничен явно | определяется тарифом | ~$2.50 | не указан | $1 (USD) |
| **Вывод в фиат** | + (EUR SEPA: 0.8% + €25, макс $250k) | + (авто-конвертация) | - (инфраструктура, не шлюз) | + (USD/EUR банк) | - (только крипто) | + (гарантированная фиат-сумма) |
| **Украина (merchants)** | + (работает) | - (ограничена/недоступна) | + | + | + | неизвестно |
| **Россия (merchants)** | частично (санкционное давление) | - (заблокирована) | - | - | + | - |

---

## 2. Детали по каждому решению

### 2.1 NOWPayments

**Сильные стороны:**
- 350+ монет, включая TON нативно (важно для Telegram-аудитории)
- USDT на всех основных сетях (TRC20, ERC20, BEP20, TON chain)
- Самая гибкая модель: crypto-only 0.5%, с конвертацией 1%
- Полноценный sandbox на отдельном домене (sandbox.nowpayments.io)
- Фиат оф-рамп через SEPA (EUR), запущен в 2025
- Хорошо работает с Украиной
- KYC не нужен для крипто-режима (важно для быстрого старта MVP)
- Подробная документация + Postman-коллекция

**Слабые стороны:**
- Фиат-вывод только EUR SEPA, USD — нет
- Минимальная сумма транзакции зависит от рынка ($2–$5)
- Санкционные ограничения для России могут меняться

**Документация:** https://documenter.getpostman.com/view/7907941/2s93JusNJt

---

### 2.2 Coinbase Commerce

**Сильные стороны:**
- Бренд Coinbase — доверие пользователей
- Простая интеграция (1%)
- Хороший sandbox
- Автоматическая конвертация в USD

**Слабые стороны:**
- Нет USDT (только USDC)
- Нет TON
- Украина и Россия — проблемная зона (подпадает под OFAC compliance)
- Для СНГ-аудитории неприменим

---

### 2.3 CryptoAPIs

**Сильные стороны:**
- Мощная инфраструктура (blockchain data, HD wallets, webhooks)
- Подходит для кастомных решений (собственный кошелёк)
- TON поддерживается на уровне блокчейн-инфраструктуры

**Слабые стороны:**
- Это НЕ payment gateway — это blockchain infrastructure API
- Нет готового "принять платёж за 5 минут"
- Стоимость: от $49/мес за подписку (подходит для зрелого продукта)
- Требует значительных инженерных ресурсов (2+ месяца на интеграцию)

---

### 2.4 BitPay

**Сильные стороны:**
- Надёжный (работает с 2011)
- Хорошая поддержка для бизнеса
- Фиат-вывод USD/EUR

**Слабые стороны:**
- 1–2% + $0.25 — дороже конкурентов
- Нет USDT нативно
- Нет TON
- Ориентирован на западный рынок, СНГ — ограниченно

---

### 2.5 Plisio

**Сильные стороны:**
- 0.5% — самая низкая комиссия среди custodial-шлюзов
- TON + USDT on TON — поддержка
- Лояльные требования к merchants (нет жёстких географических блоков для СНГ)
- Простой API

**Слабые стороны:**
- Нет публичного sandbox (усложняет разработку)
- Нет фиат-вывода (только крипто)
- Менее известен — потенциально меньше доверия у пользователей
- Документация более скудная

---

### 2.6 Crypto.com Pay

**Сильные стороны:**
- 0% транзакционная комиссия (платит только blockchain fee)
- Гарантированная фиат-сумма для мерчанта
- Хороший sandbox (sk_test_ ключи)

**Слабые стороны:**
- Нет TON
- Ограниченный список монет (BTC, ETH, CRO, DOGE, USDC)
- Ошибка `region_not_supported` — географические блокировки есть
- Требует account на Crypto.com — проблемно для СНГ-региона

---

## 3. Рекомендация

### Для MVP TravelAI: NOWPayments

**Обоснование:**

1. **TON-поддержка** — критична, учитывая, что TravelAI нацелен на СНГ-аудиторию, которая активно использует Telegram и TON-экосистему
2. **USDT (TRC20, BEP20, TON)** — самый популярный стейблкоин в регионе
3. **0.5% комиссия** — конкурентно
4. **Рабочий sandbox** — можно разрабатывать без реальных транзакций
5. **Украина — доступно** — без регуляторных блокировок для мерчантов
6. **KYC не нужен** для старта (крипто-режим)
7. **Простая интеграция (2/5)** — REST API + webhook, хорошая документация
8. **350+ монет** — не нужно думать о поддержке конкретных сетей

**Резервный вариант:** Plisio (если нужна ещё более низкая комиссия, и отсутствие sandbox некритично).

**Для зрелого продукта:** CryptoAPIs (собственный кошелёк, полный контроль, но +2 месяца разработки).

---

## 4. Архитектура интеграции — Flow пополнения

```
Пользователь (мобильное приложение)
       │
       │ POST /api/wallet/crypto-deposit
       │ { amount: 10, currency: "USDT", network: "TRC20" }
       │
       ▼
  Fastify Backend
       │
       │ 1. Валидация запроса (zod)
       │ 2. Создаём запись CryptoDeposit в БД (status: PENDING)
       │ 3. Вызов NOWPayments API: POST /v1/payment
       │    { price_amount, price_currency, pay_currency, order_id, ipn_callback_url }
       │
       ▼
  NOWPayments API
       │
       │ Возвращает: { payment_id, pay_address, pay_amount, expiration_date }
       │
       ▼
  Fastify Backend
       │
       │ 4. Сохраняем payment_id, pay_address в CryptoDeposit
       │ 5. Возвращаем клиенту: { pay_address, pay_amount, pay_currency, expires_at }
       │
       ▼
  Мобильное приложение
       │
       │ Показывает QR-код с адресом и суммой
       │ Пользователь отправляет крипту со своего кошелька
       │
       ▼
  Блокчейн-сеть (TRC20 / ETH / TON и т.д.)
       │
       │ Транзакция подтверждена
       │
       ▼
  NOWPayments
       │
       │ POST /api/webhooks/nowpayments  (IPN callback)
       │ { payment_id, payment_status: "confirmed", price_amount, pay_amount, order_id }
       │
       ▼
  Fastify Backend — Webhook Handler
       │
       │ 6. Верификация HMAC подписи (x-nowpayments-sig header)
       │ 7. Проверка idempotency (payment_id уже обработан?)
       │ 8. Обновляем CryptoDeposit.status = CONFIRMED
       │ 9. prisma.$transaction:
       │    - Wallet.balance += price_amount (в USD)
       │    - Transaction.create({ type: DEPOSIT, amount, txHash })
       │
       ▼
  Пользователь видит обновлённый баланс (polling или push)
```

### Статусы платежа NOWPayments

```
waiting → confirming → confirmed → finished
                    ↘ partially_paid → expired
                    ↘ failed
```

Засчитываем пополнение на статусах: `confirmed` или `finished`.

---

## 5. Prisma-схема (дополнение к существующей)

```prisma
model CryptoDeposit {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])

  // NOWPayments данные
  nowPaymentId    String   @unique
  payAddress      String
  payCurrency     String   // USDT, BTC, ETH, TON...
  payNetwork      String   // TRC20, ERC20, BEP20, TON
  payAmount       Float    // сколько крипты должен прислать пользователь
  priceAmount     Float    // в USD
  priceCurrency   String   @default("USD")

  // Статус
  status          CryptoDepositStatus @default(PENDING)
  txHash          String?  // hash транзакции из блокчейна
  confirmedAt     DateTime?

  expiresAt       DateTime
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([userId])
  @@index([status])
}

enum CryptoDepositStatus {
  PENDING
  WAITING
  CONFIRMING
  CONFIRMED
  FINISHED
  PARTIALLY_PAID
  EXPIRED
  FAILED
}
```

---

## 6. Код бэкенд-эндпоинта

### 6.1 `src/services/nowpayments.service.ts`

```typescript
import axios from 'axios';
import crypto from 'crypto';
import { env } from '../lib/env.js';

const BASE_URL = env.NOWPAYMENTS_SANDBOX
  ? 'https://api.sandbox.nowpayments.io/v1'
  : 'https://api.nowpayments.io/v1';

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'x-api-key': env.NOWPAYMENTS_API_KEY },
});

export interface CreatePaymentParams {
  priceAmount: number;       // сумма в USD
  payCurrency: string;       // USDT, BTC, ETH, TON...
  orderId: string;           // наш внутренний ID депозита
  callbackUrl: string;       // webhook URL
}

export interface NowPaymentsPayment {
  payment_id: string;
  pay_address: string;
  pay_amount: number;
  pay_currency: string;
  price_amount: number;
  price_currency: string;
  expiration_estimate_date: string;
  payment_status: string;
}

/**
 * Создать запрос на платёж в NOWPayments.
 * Документация: https://documenter.getpostman.com/view/7907941/2s93JusNJt#intro
 */
export async function createPayment(
  params: CreatePaymentParams
): Promise<NowPaymentsPayment> {
  const { data } = await client.post<NowPaymentsPayment>('/payment', {
    price_amount: params.priceAmount,
    price_currency: 'usd',
    pay_currency: params.payCurrency.toLowerCase(),
    order_id: params.orderId,
    ipn_callback_url: params.callbackUrl,
    is_fixed_rate: false,
    is_fee_paid_by_user: false,
  });
  return data;
}

/**
 * Верификация HMAC подписи входящего webhook от NOWPayments.
 * NOWPayments подписывает тело сортированным JSON через HMAC-SHA512.
 */
export function verifyWebhookSignature(
  rawBody: Buffer,
  signature: string
): boolean {
  const sorted = JSON.stringify(
    JSON.parse(rawBody.toString()),
    Object.keys(JSON.parse(rawBody.toString())).sort()
  );
  const expected = crypto
    .createHmac('sha512', env.NOWPAYMENTS_IPN_SECRET)
    .update(sorted)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(signature, 'hex')
  );
}
```

---

### 6.2 `src/routes/wallet.routes.ts` (дополнение)

```typescript
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { createPayment, verifyWebhookSignature } from '../services/nowpayments.service.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { logger } from '../lib/logger.js';

// Поддерживаемые валюты и сети
const SUPPORTED_CURRENCIES = ['BTC', 'ETH', 'USDT', 'USDC', 'TON', 'LTC'] as const;

const cryptoDepositSchema = z.object({
  amount: z.number().positive().min(2).max(10000),   // USD
  currency: z.enum(SUPPORTED_CURRENCIES),
  network: z.string().optional(),                    // 'TRC20', 'ERC20', etc.
});

type CryptoDepositBody = z.infer<typeof cryptoDepositSchema>;

export async function walletRoutes(app: FastifyInstance) {

  /**
   * POST /api/wallet/crypto-deposit
   * Инициация пополнения кошелька через криптовалюту.
   * Создаёт платёж в NOWPayments и возвращает адрес для отправки крипты.
   *
   * Body: { amount: number (USD), currency: "USDT"|"BTC"|..., network?: "TRC20" }
   * Returns: { depositId, payAddress, payAmount, payCurrency, expiresAt, qrData }
   */
  app.post<{ Body: CryptoDepositBody }>(
    '/api/wallet/crypto-deposit',
    { preHandler: [authenticate] },
    async (request: FastifyRequest<{ Body: CryptoDepositBody }>, reply: FastifyReply) => {
      const parseResult = cryptoDepositSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          details: parseResult.error.flatten(),
        });
      }

      const { amount, currency, network } = parseResult.data;
      const userId = request.user.id;

      // Формируем pay_currency с учётом сети (напр. "usdttrc20")
      const payCurrency = buildPayCurrency(currency, network);

      // Создаём запись в БД в статусе PENDING
      const deposit = await prisma.cryptoDeposit.create({
        data: {
          userId,
          priceAmount: amount,
          priceCurrency: 'USD',
          payCurrency,
          payNetwork: network ?? deriveDefaultNetwork(currency),
          payAddress: '',          // заполним после ответа NOWPayments
          payAmount: 0,
          nowPaymentId: '',        // заполним после ответа NOWPayments
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 час (будет перезаписано)
        },
      });

      try {
        const callbackUrl = `${process.env.API_BASE_URL}/api/webhooks/nowpayments`;
        const payment = await createPayment({
          priceAmount: amount,
          payCurrency,
          orderId: deposit.id,
          callbackUrl,
        });

        // Обновляем запись реальными данными от NOWPayments
        const updated = await prisma.cryptoDeposit.update({
          where: { id: deposit.id },
          data: {
            nowPaymentId: payment.payment_id,
            payAddress: payment.pay_address,
            payAmount: payment.pay_amount,
            status: 'WAITING',
            expiresAt: new Date(payment.expiration_estimate_date),
          },
        });

        logger.info(
          { depositId: deposit.id, paymentId: payment.payment_id, userId },
          'crypto deposit initiated'
        );

        return reply.status(201).send({
          depositId: updated.id,
          payAddress: payment.pay_address,
          payAmount: payment.pay_amount,
          payCurrency: payment.pay_currency.toUpperCase(),
          priceAmount: amount,
          priceCurrency: 'USD',
          expiresAt: payment.expiration_estimate_date,
          // Готовые данные для QR-кода (BIP21/URI-схема)
          qrData: buildCryptoUri(currency, payment.pay_address, payment.pay_amount),
        });

      } catch (err) {
        // Помечаем депозит как FAILED если NOWPayments не ответил
        await prisma.cryptoDeposit.update({
          where: { id: deposit.id },
          data: { status: 'FAILED' },
        });
        logger.error({ err, depositId: deposit.id }, 'NOWPayments createPayment failed');
        return reply.status(502).send({
          error: 'PAYMENT_GATEWAY_ERROR',
          message: 'Failed to create payment. Please try again.',
        });
      }
    }
  );

  /**
   * POST /api/webhooks/nowpayments
   * IPN-callback от NOWPayments при изменении статуса платежа.
   * НЕ требует JWT — проверяется HMAC-подпись в заголовке.
   *
   * Заголовок: x-nowpayments-sig: <hmac-sha512>
   */
  app.post(
    '/api/webhooks/nowpayments',
    {
      config: { rawBody: true }, // важно: нужен raw body для верификации подписи
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const signature = request.headers['x-nowpayments-sig'] as string;

      if (!signature) {
        logger.warn('nowpayments webhook: missing signature');
        return reply.status(401).send({ error: 'MISSING_SIGNATURE' });
      }

      // Верифицируем подпись
      const rawBody = (request as any).rawBody as Buffer;
      if (!verifyWebhookSignature(rawBody, signature)) {
        logger.warn('nowpayments webhook: invalid signature');
        return reply.status(401).send({ error: 'INVALID_SIGNATURE' });
      }

      const payload = request.body as {
        payment_id: string;
        payment_status: string;
        price_amount: number;
        price_currency: string;
        pay_amount: number;
        pay_currency: string;
        order_id: string;           // наш depositId
        outcome_amount?: number;
        outcome_currency?: string;
        payin_hash?: string;        // tx hash в блокчейне
      };

      const { payment_id, payment_status, order_id, price_amount, payin_hash } = payload;

      logger.info({ payment_id, payment_status, order_id }, 'nowpayments webhook received');

      // Ищем депозит по нашему ID
      const deposit = await prisma.cryptoDeposit.findUnique({
        where: { id: order_id },
        include: { user: { select: { id: true } } },
      });

      if (!deposit) {
        logger.warn({ order_id }, 'nowpayments webhook: deposit not found');
        return reply.status(200).send({ ok: true }); // 200, чтобы NOWPayments не ретраил
      }

      // Idempotency: игнорируем уже обработанные финальные статусы
      if (deposit.status === 'CONFIRMED' || deposit.status === 'FINISHED') {
        return reply.status(200).send({ ok: true });
      }

      const normalizedStatus = normalizeStatus(payment_status);

      // Обновляем статус депозита
      await prisma.cryptoDeposit.update({
        where: { id: order_id },
        data: {
          status: normalizedStatus,
          txHash: payin_hash ?? deposit.txHash,
          confirmedAt: isFinalized(normalizedStatus) ? new Date() : undefined,
          nowPaymentId: payment_id,
        },
      });

      // Зачисляем средства только при подтверждении
      if (isFinalized(normalizedStatus)) {
        await prisma.$transaction(async (tx) => {
          // 1. Пополняем кошелёк
          await tx.wallet.update({
            where: { userId: deposit.userId },
            data: { balance: { increment: price_amount } },
          });

          // 2. Записываем транзакцию
          await tx.transaction.create({
            data: {
              userId: deposit.userId,
              type: 'DEPOSIT',
              amount: price_amount,
              currency: 'USD',
              description: `Crypto deposit (${deposit.payCurrency})`,
              meta: {
                depositId: deposit.id,
                nowPaymentId: payment_id,
                txHash: payin_hash,
                payCurrency: deposit.payCurrency,
              },
            },
          });
        });

        logger.info(
          { userId: deposit.userId, amount: price_amount, depositId: deposit.id },
          'wallet credited from crypto deposit'
        );
      }

      return reply.status(200).send({ ok: true });
    }
  );

  /**
   * GET /api/wallet/crypto-deposit/:depositId
   * Получить статус конкретного депозита (polling с клиента).
   */
  app.get<{ Params: { depositId: string } }>(
    '/api/wallet/crypto-deposit/:depositId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const deposit = await prisma.cryptoDeposit.findFirst({
        where: {
          id: request.params.depositId,
          userId: request.user.id, // защита: только свои депозиты
        },
        select: {
          id: true,
          status: true,
          payAddress: true,
          payAmount: true,
          payCurrency: true,
          priceAmount: true,
          expiresAt: true,
          confirmedAt: true,
          txHash: true,
        },
      });

      if (!deposit) {
        return reply.status(404).send({ error: 'DEPOSIT_NOT_FOUND' });
      }

      return reply.send(deposit);
    }
  );
}

// ---- Вспомогательные функции ----

/**
 * Формирует код валюты для NOWPayments API с учётом сети.
 * Например: USDT + TRC20 -> "usdttrc20", USDT + TON -> "usdtton"
 */
function buildPayCurrency(currency: string, network?: string): string {
  if (!network) return currency.toLowerCase();
  const networkMap: Record<string, string> = {
    TRC20: 'trc20',
    ERC20: 'erc20',
    BEP20: 'bsc',
    TON: 'ton',
    POLYGON: 'polygon',
    BASE: 'base',
    SOL: 'sol',
  };
  const suffix = networkMap[network.toUpperCase()] ?? network.toLowerCase();
  return `${currency.toLowerCase()}${suffix}`;
}

function deriveDefaultNetwork(currency: string): string {
  const defaults: Record<string, string> = {
    USDT: 'TRC20',  // дешевле всего по сети
    USDC: 'ERC20',
    BTC: 'BTC',
    ETH: 'ERC20',
    TON: 'TON',
    LTC: 'LTC',
  };
  return defaults[currency] ?? currency;
}

/**
 * Строит URI для QR-кода (BIP21 для BTC, ERC-681 для ETH, итп)
 */
function buildCryptoUri(currency: string, address: string, amount: number): string {
  switch (currency.toUpperCase()) {
    case 'BTC':  return `bitcoin:${address}?amount=${amount}`;
    case 'ETH':  return `ethereum:${address}?value=${amount}`;
    case 'TON':  return `ton://transfer/${address}?amount=${amount}`;
    default:     return address; // QR просто с адресом
  }
}

type DepositStatus =
  | 'PENDING' | 'WAITING' | 'CONFIRMING' | 'CONFIRMED'
  | 'FINISHED' | 'PARTIALLY_PAID' | 'EXPIRED' | 'FAILED';

function normalizeStatus(nowStatus: string): DepositStatus {
  const map: Record<string, DepositStatus> = {
    waiting:        'WAITING',
    confirming:     'CONFIRMING',
    confirmed:      'CONFIRMED',
    finished:       'FINISHED',
    partially_paid: 'PARTIALLY_PAID',
    expired:        'EXPIRED',
    failed:         'FAILED',
  };
  return map[nowStatus] ?? 'PENDING';
}

function isFinalized(status: DepositStatus): boolean {
  return status === 'CONFIRMED' || status === 'FINISHED';
}
```

---

### 6.3 Переменные окружения (дополнить `.env`)

```dotenv
# NOWPayments
NOWPAYMENTS_API_KEY=your_api_key_here
NOWPAYMENTS_IPN_SECRET=your_ipn_secret_here
NOWPAYMENTS_SANDBOX=true          # false на production

# Базовый URL бэкенда (для webhook callback)
API_BASE_URL=https://your-backend.railway.app
```

---

## 7. Необходимые ручные шаги

1. **Регистрация** на https://nowpayments.io (бесплатно, KYC не нужен для начала)
2. **Sandbox**: https://sandbox.nowpayments.io — отдельный аккаунт для тестов
3. **API Key**: Dashboard → API Keys → Create Key
4. **IPN Secret**: Dashboard → IPN Settings → IPN Secret Key
5. **Webhook URL** зарегистрировать в Dashboard → IPN Settings → Callback URL
6. Добавить переменные в `.env` (см. выше)
7. Добавить Prisma-миграцию для модели `CryptoDeposit`
8. **rawBody plugin** для Fastify (нужен для HMAC верификации):

```typescript
// src/server.ts
import fastifyRawBody from 'fastify-raw-body';
await app.register(fastifyRawBody, { field: 'rawBody', global: false });
```

```bash
npm install fastify-raw-body
```

---

## 8. curl-примеры

### Инициировать пополнение

```bash
curl -X POST https://api.travelai.app/api/wallet/crypto-deposit \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50,
    "currency": "USDT",
    "network": "TRC20"
  }'
```

Ответ:
```json
{
  "depositId": "clx1abc123",
  "payAddress": "TFGb...xyz",
  "payAmount": 50.25,
  "payCurrency": "USDT",
  "priceAmount": 50,
  "priceCurrency": "USD",
  "expiresAt": "2026-05-19T14:00:00.000Z",
  "qrData": "TFGb...xyz"
}
```

### Проверить статус депозита

```bash
curl https://api.travelai.app/api/wallet/crypto-deposit/clx1abc123 \
  -H "Authorization: Bearer <JWT>"
```

---

## 9. Топ-3 итоговый вывод

### 1 место — NOWPayments (рекомендуется для MVP)

Плюсы: TON + USDT-TRC20, 0.5%, sandbox, Украина работает, KYC не нужен, 350+ монет  
Минусы: Фиат-вывод только EUR SEPA, мин. платёж ~$2–5

### 2 место — Plisio

Плюсы: 0.5%, TON + USDT on TON, лояльна к СНГ-региону  
Минусы: Нет sandbox, нет фиат-вывода, меньше документации

### 3 место — Crypto.com Pay

Плюсы: 0% транзакционная комиссия, хороший sandbox  
Минусы: Нет TON, ограниченный список монет, географические блокировки для СНГ

---

*Sources:*
- [NOWPayments Pricing](https://nowpayments.io/pricing)
- [NOWPayments API Docs (Postman)](https://documenter.getpostman.com/view/7907941/2s93JusNJt)
- [NOWPayments TON Support](https://nowpayments.io/supported-coins/ton-payments)
- [Coinbase Commerce Quickstart](https://docs.cdp.coinbase.com/commerce/introduction/quickstart)
- [Plisio Pricing](https://plisio.net/pricing)
- [Crypto.com Pay Documentation](https://pay-docs.crypto.com/)
- [CryptoAPIs Pricing](https://cryptoapis.io/pricing)
- [BitPay Pricing](https://www.bitpay.com/pricing)
- [Best Crypto Payment Gateways 2025 — Microblink](https://microblink.com/resources/blog/crypto-payment-gateway/)
