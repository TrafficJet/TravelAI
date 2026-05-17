/**
 * GET /api/wallet/payment-status/:paymentId — integration tests
 *
 * Tests:
 *   - Returns 401 when no Bearer token is provided
 *   - Returns 404 when the transaction does not exist for this user
 *   - Returns 200 with { id, status, amount, createdAt } when found
 *
 * Prisma is fully mocked so the suite runs without a live database.
 */

// Set JWT env vars BEFORE any module imports that read them at load time
process.env.JWT_ACCESS_SECRET = 'test-access-secret-32chars!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32chars!!';

import Fastify, { FastifyInstance } from 'fastify';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { walletRoutes } from '../routes/wallet.routes';
import { registerErrorHandler } from '../plugins/error-handler.plugin';

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

const mockWalletFindUnique = jest.fn();
const mockTxFindFirst = jest.fn();

jest.mock('../lib/prisma', () => ({
  prisma: {
    wallet: {
      findUnique: (...args: unknown[]) => mockWalletFindUnique(...args),
    },
    walletTransaction: {
      findUnique: jest.fn(),
      findFirst: (...args: unknown[]) => mockTxFindFirst(...args),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const JWT_SECRET = 'test-access-secret-32chars!!';
const TEST_USER_ID = 'user-test-uuid-123';
const TEST_WALLET_ID = 'wallet-test-uuid-456';

function makeToken(userId = TEST_USER_ID): string {
  return jwt.sign({ sub: userId, email: 'test@example.com' }, JWT_SECRET, { expiresIn: '1h' });
}

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  registerErrorHandler(app);
  await app.register(walletRoutes, { prefix: '/api/wallet' });
  await app.ready();
  return app;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/wallet/payment-status/:paymentId', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = JWT_SECRET;
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── 401 — no token ──────────────────────────────────────────────────────────

  it('returns 401 when Authorization header is missing', async () => {
    const res = await request(app.server)
      .get('/api/wallet/payment-status/some-payment-id')
      .expect(401);

    expect(res.body.error?.code ?? res.body.error).toMatch(/UNAUTHORIZED/i);
  });

  // ── 404 — wallet not found ───────────────────────────────────────────────────

  it('returns 404 when the user has no wallet', async () => {
    mockWalletFindUnique.mockResolvedValueOnce(null);

    const res = await request(app.server)
      .get('/api/wallet/payment-status/pay-id-001')
      .set('Authorization', `Bearer ${makeToken()}`)
      .expect(404);

    expect(res.body.error?.code).toBe('NOT_FOUND');
  });

  // ── 404 — transaction not found ─────────────────────────────────────────────

  it('returns 404 when no transaction matches the paymentId', async () => {
    mockWalletFindUnique.mockResolvedValueOnce({ id: TEST_WALLET_ID });
    mockTxFindFirst.mockResolvedValueOnce(null);

    const res = await request(app.server)
      .get('/api/wallet/payment-status/nonexistent-pay-id')
      .set('Authorization', `Bearer ${makeToken()}`)
      .expect(404);

    expect(res.body.error?.code).toBe('NOT_FOUND');
  });

  // ── 200 — transaction found ─────────────────────────────────────────────────

  it('returns 200 with transaction data when found', async () => {
    const txId = 'tx-uuid-found';
    const paymentId = 'yoo-pay-id-found';
    const createdAt = new Date('2026-05-14T10:00:00.000Z');

    mockWalletFindUnique.mockResolvedValueOnce({ id: TEST_WALLET_ID });
    mockTxFindFirst.mockResolvedValueOnce({
      id: txId,
      walletId: TEST_WALLET_ID,
      status: 'COMPLETED',
      amount: { toString: () => '5000' },
      externalId: paymentId,
      createdAt,
    });

    const res = await request(app.server)
      .get(`/api/wallet/payment-status/${paymentId}`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .expect(200);

    expect(res.body).toMatchObject({
      id: txId,
      status: 'COMPLETED',
      amount: '5000',
      createdAt: createdAt.toISOString(),
    });
  });

  // ── 200 — PENDING status ────────────────────────────────────────────────────

  it('returns status PENDING when transaction is not yet processed', async () => {
    mockWalletFindUnique.mockResolvedValueOnce({ id: TEST_WALLET_ID });
    mockTxFindFirst.mockResolvedValueOnce({
      id: 'tx-pending',
      walletId: TEST_WALLET_ID,
      status: 'PENDING',
      amount: { toString: () => '1000' },
      externalId: 'pay-pending',
      createdAt: new Date(),
    });

    const res = await request(app.server)
      .get('/api/wallet/payment-status/pay-pending')
      .set('Authorization', `Bearer ${makeToken()}`)
      .expect(200);

    expect(res.body.status).toBe('PENDING');
  });
});
