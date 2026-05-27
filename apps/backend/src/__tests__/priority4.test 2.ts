/**
 * Priority-4 feature tests
 *
 * Covers:
 *   4A — GET /health/providers
 *   4B — Stripe: POST /api/wallet/topup (Stripe flow), POST /api/stripe/webhook
 *   4C — Push token: POST /api/users/me/push-token (save + clear)
 *        push.service — invalid token, Expo API failure
 *
 * Run: npx jest --testPathPattern="priority4" --runInBand
 */

process.env.JWT_ACCESS_SECRET = 'test-access-secret-32chars!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32chars!!';

import Fastify, { FastifyInstance } from 'fastify';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// ─── Shared JWT helpers ───────────────────────────────────────────────────────

const JWT_SECRET = 'test-access-secret-32chars!!';
const TEST_USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const WALLET_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

function makeToken(userId = TEST_USER_ID): string {
  return jwt.sign({ sub: userId, email: 'test@example.com' }, JWT_SECRET, { expiresIn: '1h' });
}

// ─────────────────────────────────────────────────────────────────────────────
// 4A — GET /health/providers
// ─────────────────────────────────────────────────────────────────────────────

// Mock Prisma and websocket plugin for the health suite
jest.mock('../lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    priceAlert: { count: jest.fn().mockResolvedValue(0) },
    user: { update: jest.fn().mockResolvedValue({ id: TEST_USER_ID }) },
    wallet: { findUnique: jest.fn(), update: jest.fn() },
    walletTransaction: { create: jest.fn().mockResolvedValue({ id: 'tx-1', amount: { toString: () => '500' }, type: 'TOPUP', status: 'PENDING', description: '', bookingId: null, createdAt: new Date() }), delete: jest.fn() },
    notification: { create: jest.fn().mockResolvedValue({}) },
  },
}));

jest.mock('../plugins/websocket.plugin', () => ({
  getActiveConnectionCount: () => 0,
}));

jest.mock('../lib/email', () => ({
  emailService: { sendBookingConfirmation: jest.fn().mockResolvedValue(undefined) },
}));

// ── Build helpers ─────────────────────────────────────────────────────────────

import { healthRoutes } from '../routes/health.routes';
import { registerErrorHandler } from '../plugins/error-handler.plugin';
import { usersRoutes } from '../routes/users.routes';
import { stripeRoutes } from '../routes/stripe.routes';
import { walletRoutes } from '../routes/wallet.routes';

async function buildHealthApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  registerErrorHandler(app);
  await app.register(healthRoutes, { prefix: '/health' });
  await app.ready();
  return app;
}

async function buildUsersApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  registerErrorHandler(app);
  await app.register(usersRoutes, { prefix: '/api/users' });
  await app.ready();
  return app;
}

async function buildStripeApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  registerErrorHandler(app);
  await app.register(stripeRoutes, { prefix: '/api/stripe' });
  await app.ready();
  return app;
}

async function buildWalletApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  registerErrorHandler(app);
  await app.register(walletRoutes, { prefix: '/api/wallet' });
  await app.ready();
  return app;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4A — /health/providers
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /health/providers', () => {
  let app: FastifyInstance;

  beforeAll(async () => { app = await buildHealthApp(); });
  afterAll(async () => { await app.close(); });

  it('returns 200 with all providers unconfigured when no env vars are set', async () => {
    // Ensure no payment/flight keys in env
    delete process.env.DUFFEL_API_KEY;
    delete process.env.AVIASALES_TOKEN;
    delete process.env.YOOKASSA_SHOP_ID;
    delete process.env.YOOKASSA_SECRET_KEY;

    const res = await request(app.server).get('/health/providers').expect(200);

    expect(res.body).toMatchObject({
      duffel: { configured: false, mode: 'mock' },
      aviasales: { configured: false },
      yookassa: { configured: false },
    });
  });

  it('returns duffel.configured=true when DUFFEL_API_KEY is set', async () => {
    process.env.DUFFEL_API_KEY = 'duffel_test_key';

    const res = await request(app.server).get('/health/providers').expect(200);

    expect(res.body.duffel).toMatchObject({ configured: true, mode: 'real' });

    delete process.env.DUFFEL_API_KEY;
  });

  it('returns yookassa.configured=true when both YooKassa env vars are set', async () => {
    process.env.YOOKASSA_SHOP_ID = 'shop123';
    process.env.YOOKASSA_SECRET_KEY = 'secret123';

    const res = await request(app.server).get('/health/providers').expect(200);

    expect(res.body.yookassa.configured).toBe(true);

    delete process.env.YOOKASSA_SHOP_ID;
    delete process.env.YOOKASSA_SECRET_KEY;
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4C — POST /api/users/me/push-token
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '../lib/prisma';

describe('POST /api/users/me/push-token', () => {
  let app: FastifyInstance;
  let token: string;

  beforeAll(async () => {
    app = await buildUsersApp();
    token = makeToken();
  });

  afterAll(async () => { await app.close(); });

  beforeEach(() => { jest.clearAllMocks(); });

  it('returns 200 and saves a valid Expo push token', async () => {
    (prisma.user.update as jest.Mock).mockResolvedValue({ id: TEST_USER_ID });

    const res = await request(app.server)
      .post('/api/users/me/push-token')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { pushToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' },
      }),
    );
  });

  it('returns 4xx when token field is missing (Fastify schema validation)', async () => {
    const res = await request(app.server)
      .post('/api/users/me/push-token')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    // Fastify returns 422 for JSON schema validation failures
    expect([400, 422]).toContain(res.status);
  });

  it('returns 401 when no auth token is provided', async () => {
    const res = await request(app.server)
      .post('/api/users/me/push-token')
      .send({ token: 'ExponentPushToken[xxx]' });

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4C — push.service — unit tests (no HTTP)
// ─────────────────────────────────────────────────────────────────────────────

import { sendExpoPush } from '../services/push.service';

describe('sendExpoPush', () => {
  const validToken = 'ExponentPushToken[abcdefghij1234567890]';

  afterEach(() => { jest.restoreAllMocks(); });

  it('silently returns without throwing when pushToken format is invalid', async () => {
    // Should not throw; invalid token is just skipped
    await expect(
      sendExpoPush({ pushToken: 'invalid-token', title: 'T', body: 'B' }),
    ).resolves.toBeUndefined();
  });

  it('silently swallows network errors from Expo API', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network failure'));

    await expect(
      sendExpoPush({ pushToken: validToken, title: 'T', body: 'B' }),
    ).resolves.toBeUndefined();
  });

  it('silently swallows non-2xx responses from Expo API', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('rate limited', { status: 429 }),
    );

    await expect(
      sendExpoPush({ pushToken: validToken, title: 'T', body: 'B' }),
    ).resolves.toBeUndefined();
  });

  it('calls fetch with correct payload for a valid token', async () => {
    const mockFetch = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));

    await sendExpoPush({
      pushToken: validToken,
      title: 'Test title',
      body: 'Test body',
      data: { bookingId: 'book-1' },
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://exp.host/--/api/v2/push/send');
    const sent = JSON.parse(init.body as string);
    expect(sent.to).toBe(validToken);
    expect(sent.title).toBe('Test title');
    expect(sent.sound).toBe('default');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4B — POST /api/stripe/webhook
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/stripe/webhook', () => {
  let app: FastifyInstance;

  beforeAll(async () => { app = await buildStripeApp(); });
  afterAll(async () => { await app.close(); });

  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure no Stripe keys so signature check is skipped in test mode
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it('returns 500 when STRIPE_SECRET_KEY is not configured', async () => {
    const res = await request(app.server)
      .post('/api/stripe/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'sig_test')
      .send(JSON.stringify({ type: 'payment_intent.succeeded', id: 'evt_1', data: { object: {} } }));

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Stripe not configured');
  });

  it('returns 400 when stripe-signature header is missing', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';

    const res = await request(app.server)
      .post('/api/stripe/webhook')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ type: 'payment_intent.succeeded', id: 'evt_1', data: { object: {} } }));

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing stripe-signature header');

    delete process.env.STRIPE_SECRET_KEY;
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4B — POST /api/wallet/topup — Stripe mock-mode flow
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/wallet/topup — Stripe mock mode', () => {
  let app: FastifyInstance;
  let token: string;

  beforeAll(async () => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.YOOKASSA_SHOP_ID;
    delete process.env.YOOKASSA_SECRET_KEY;

    app = await buildWalletApp();
    token = makeToken();
  });

  afterAll(async () => { await app.close(); });

  beforeEach(() => { jest.clearAllMocks(); });

  it('credits wallet immediately in mock mode and returns new balance', async () => {
    (prisma.wallet.findUnique as jest.Mock).mockResolvedValue({
      id: WALLET_ID,
      userId: TEST_USER_ID,
      balance: { toString: () => '0.00' },
      currency: 'RUB',
    });
    (prisma.wallet.update as jest.Mock).mockResolvedValue({
      id: WALLET_ID,
      balance: { toString: () => '500.00' },
      currency: 'RUB',
    });
    (prisma.walletTransaction.create as jest.Mock).mockResolvedValue({
      id: 'tx-mock-1',
      amount: { toString: () => '500' },
      type: 'TOPUP',
      status: 'COMPLETED',
      description: 'Пополнение кошелька на 500 ₽',
      bookingId: null,
      createdAt: new Date(),
    });

    // Use prisma.$transaction mock to return [updatedWallet, transaction]
    const mockPrisma = prisma as unknown as { $transaction: jest.Mock };
    mockPrisma.$transaction = jest.fn().mockResolvedValue([
      { id: WALLET_ID, balance: { toString: () => '500.00' } },
      { id: 'tx-mock-1', amount: { toString: () => '500' }, type: 'TOPUP', status: 'COMPLETED', description: '', bookingId: null, createdAt: new Date() },
    ]);

    const res = await request(app.server)
      .post('/api/wallet/topup')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 500, paymentMethod: 'CARD' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Кошелёк пополнен');
    expect(res.body.newBalance).toBeDefined();
  });

  it('returns 400 for a disallowed top-up amount', async () => {
    (prisma.wallet.findUnique as jest.Mock).mockResolvedValue({
      id: WALLET_ID,
      userId: TEST_USER_ID,
      balance: { toString: () => '0.00' },
      currency: 'RUB',
    });

    const res = await request(app.server)
      .post('/api/wallet/topup')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 123, paymentMethod: 'CARD' });

    // Handler-level validation returns 400; Fastify schema validation returns 422
    expect([400, 422]).toContain(res.status);
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app.server)
      .post('/api/wallet/topup')
      .send({ amount: 500, paymentMethod: 'CARD' });

    expect(res.status).toBe(401);
  });
});
