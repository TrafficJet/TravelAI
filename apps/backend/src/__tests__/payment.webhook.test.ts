/**
 * YooKassa webhook handler — unit tests
 * Stack: Jest + Supertest
 *
 * These tests do NOT hit a real database. The Prisma client is mocked at the
 * module level so the suite can run without DATABASE_URL.
 *
 * Run: npx jest --testPathPattern="payment.webhook" --runInBand
 */

import Fastify, { FastifyInstance } from 'fastify';
import request from 'supertest';
import crypto from 'crypto';
import { paymentRoutes } from '../routes/payment.routes';

// ─── Mock Prisma ─────────────────────────────────────────────────────────────
// We mock the whole module so tests never need a real database connection.

const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
const mockTransaction = jest.fn();

jest.mock('../lib/prisma', () => ({
  prisma: {
    walletTransaction: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    wallet: {
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SECRET_KEY = 'test-secret-key';

function makeSignature(body: object): string {
  return crypto
    .createHmac('sha256', SECRET_KEY)
    .update(JSON.stringify(body))
    .digest('hex');
}

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(paymentRoutes, { prefix: '/api/payments' });
  await app.ready();
  return app;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/payments/yookassa/webhook', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.YOOKASSA_SECRET_KEY = SECRET_KEY;
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.YOOKASSA_SECRET_KEY;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  it('credits wallet on payment.succeeded with valid signature', async () => {
    const txId = 'tx-uuid-123';
    const walletId = 'wallet-uuid-456';
    const amount = 5000;

    const existingTx = {
      id: txId,
      walletId,
      amount: { toNumber: () => amount },
      description: 'Пополнение кошелька на 5000 ₽ (ожидает оплаты)',
      wallet: { id: walletId },
    };

    mockFindUnique.mockResolvedValueOnce(existingTx);
    mockTransaction.mockResolvedValueOnce([{}, {}]);

    const body = {
      type: 'notification',
      event: 'payment.succeeded',
      object: {
        id: 'yoo-pay-id-1',
        status: 'succeeded',
        paid: true,
        amount: { value: '5000.00', currency: 'RUB' },
        metadata: {
          internalTransactionId: txId,
          userId: 'user-123',
        },
      },
    };

    const sig = makeSignature(body);

    const res = await request(app.server)
      .post('/api/payments/yookassa/webhook')
      .set('X-Payment-Signature', sig)
      .send(body)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  // ── Idempotency ─────────────────────────────────────────────────────────────

  it('returns 200 without double-crediting if transaction already marked (оплачено)', async () => {
    const txId = 'tx-already-done';
    const existingTx = {
      id: txId,
      walletId: 'wallet-789',
      amount: 1000,
      status: 'COMPLETED',
      description: 'Пополнение кошелька на 1000 ₽ (оплачено)', // already done
      wallet: { id: 'wallet-789' },
    };

    mockFindUnique.mockResolvedValueOnce(existingTx);

    const body = {
      type: 'notification',
      event: 'payment.succeeded',
      object: {
        id: 'yoo-pay-id-2',
        status: 'succeeded',
        paid: true,
        amount: { value: '1000.00', currency: 'RUB' },
        metadata: { internalTransactionId: txId, userId: 'user-123' },
      },
    };

    const sig = makeSignature(body);

    const res = await request(app.server)
      .post('/api/payments/yookassa/webhook')
      .set('X-Payment-Signature', sig)
      .send(body)
      .expect(200);

    expect(res.body.ok).toBe(true);
    // Must NOT call $transaction for a second credit
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  // ── Ignored events ──────────────────────────────────────────────────────────

  it('returns 200 silently for non-payment.succeeded events', async () => {
    const body = {
      type: 'notification',
      event: 'payment.canceled',
      object: {
        id: 'yoo-pay-id-3',
        status: 'canceled',
        paid: false,
        amount: { value: '500.00', currency: 'RUB' },
        metadata: {},
      },
    };

    const sig = makeSignature(body);

    const res = await request(app.server)
      .post('/api/payments/yookassa/webhook')
      .set('X-Payment-Signature', sig)
      .send(body)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  // ── Security: missing signature ─────────────────────────────────────────────

  it('returns 400 when X-Payment-Signature header is missing', async () => {
    const body = {
      type: 'notification',
      event: 'payment.succeeded',
      object: {
        id: 'yoo-pay-id-4',
        status: 'succeeded',
        paid: true,
        amount: { value: '1000.00', currency: 'RUB' },
        metadata: { internalTransactionId: 'tx-123', userId: 'user-123' },
      },
    };

    const res = await request(app.server)
      .post('/api/payments/yookassa/webhook')
      .send(body)
      .expect(400);

    expect(res.body.error).toMatch(/signature/i);
  });

  // ── Security: wrong signature ───────────────────────────────────────────────

  it('returns 401 when signature does not match', async () => {
    const body = {
      type: 'notification',
      event: 'payment.succeeded',
      object: {
        id: 'yoo-pay-id-5',
        status: 'succeeded',
        paid: true,
        amount: { value: '1000.00', currency: 'RUB' },
        metadata: { internalTransactionId: 'tx-123', userId: 'user-123' },
      },
    };

    const res = await request(app.server)
      .post('/api/payments/yookassa/webhook')
      .set('X-Payment-Signature', 'deadbeef'.repeat(8))
      .send(body)
      .expect(401);

    expect(res.body.error).toMatch(/signature/i);
  });

  // ── Missing internalTransactionId ──────────────────────────────────────────

  it('returns 200 (no retry) when metadata lacks internalTransactionId', async () => {
    const body = {
      type: 'notification',
      event: 'payment.succeeded',
      object: {
        id: 'yoo-pay-id-6',
        status: 'succeeded',
        paid: true,
        amount: { value: '300.00', currency: 'RUB' },
        metadata: {},
      },
    };

    const sig = makeSignature(body);

    const res = await request(app.server)
      .post('/api/payments/yookassa/webhook')
      .set('X-Payment-Signature', sig)
      .send(body)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

// ─── payment.service mock-mode tests ─────────────────────────────────────────

describe('processCardTopup — mock mode (no YOOKASSA_SHOP_ID)', () => {
  beforeAll(() => {
    delete process.env.YOOKASSA_SHOP_ID;
    delete process.env.YOOKASSA_SECRET_KEY;
  });

  it('returns immediate:true and no confirmationUrl', async () => {
    // Dynamic import so the env vars above are already cleared when module loads
    const { processCardTopup } = await import('../services/payment.service');

    const result = await processCardTopup({
      amount: 1000,
      currency: 'RUB',
      userId: 'user-mock',
      internalTransactionId: 'tx-mock-1',
    });

    expect(result.immediate).toBe(true);
    expect(result.confirmationUrl).toBeNull();
    expect(result.success).toBe(true);
    expect(result.amount).toBe(1000);
  });
});
