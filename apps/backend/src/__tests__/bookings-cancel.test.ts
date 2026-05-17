/**
 * POST /api/bookings/:id/cancel — unit tests
 * Stack: Jest + Supertest
 *
 * Prisma is mocked so the suite runs without a live database.
 * Run: npx jest --testPathPattern="bookings-cancel" --runInBand
 */

process.env.JWT_ACCESS_SECRET = 'test-access-secret-32chars!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32chars!!';

import Fastify, { FastifyInstance } from 'fastify';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { bookingsRoutes } from '../routes/bookings.routes';
import { registerErrorHandler } from '../plugins/error-handler.plugin';

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();

jest.mock('../lib/prisma', () => ({
  prisma: {
    booking: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    wallet: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    walletTransaction: {
      create: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn().mockResolvedValue([{}, {}, {}]),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const JWT_SECRET = 'test-access-secret-32chars!!';
const TEST_USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OTHER_USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const BOOKING_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

function makeToken(userId = TEST_USER_ID): string {
  return jwt.sign({ sub: userId, email: 'test@example.com' }, JWT_SECRET, { expiresIn: '1h' });
}

function makeBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: BOOKING_ID,
    userId: TEST_USER_ID,
    type: 'FLIGHT',
    status: 'PENDING',
    provider: 'duffel',
    externalId: 'ext-123',
    totalPrice: { toString: () => '9999.00', valueOf: () => 9999.00 },
    currency: 'RUB',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    details: {},
    ...overrides,
  };
}

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  registerErrorHandler(app);
  await app.register(bookingsRoutes, { prefix: '/api/bookings' });
  await app.ready();
  return app;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/bookings/:id/cancel', () => {
  let app: FastifyInstance;
  let token: string;

  beforeAll(async () => {
    app = await buildApp();
    token = makeToken();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when no Bearer token is provided', async () => {
    const res = await request(app.server)
      .post(`/api/bookings/${BOOKING_ID}/cancel`)
      .expect(401);

    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 404 when booking does not exist', async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const res = await request(app.server)
      .post(`/api/bookings/${BOOKING_ID}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 when booking belongs to another user', async () => {
    mockFindUnique.mockResolvedValueOnce(makeBooking({ userId: OTHER_USER_ID }));

    const res = await request(app.server)
      .post(`/api/bookings/${BOOKING_ID}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns 400 when booking is already CANCELLED', async () => {
    mockFindUnique.mockResolvedValueOnce(makeBooking({ status: 'CANCELLED' }));

    const res = await request(app.server)
      .post(`/api/bookings/${BOOKING_ID}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(res.body.error.message).toBe('Бронирование уже отменено');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns 400 when booking is CONFIRMED', async () => {
    mockFindUnique.mockResolvedValueOnce(makeBooking({ status: 'CONFIRMED' }));

    const res = await request(app.server)
      .post(`/api/bookings/${BOOKING_ID}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(res.body.error.message).toBe('Нельзя отменить подтверждённое бронирование. Обратитесь в поддержку.');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns 200 with updated booking when status is PENDING', async () => {
    const pending = makeBooking({ status: 'PENDING' });
    const cancelled = makeBooking({ status: 'CANCELLED', updatedAt: new Date('2024-01-02') });

    mockFindUnique.mockResolvedValueOnce(pending);
    mockUpdate.mockResolvedValueOnce(cancelled);

    const res = await request(app.server)
      .post(`/api/bookings/${BOOKING_ID}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.booking.id).toBe(BOOKING_ID);
    expect(res.body.booking.status).toBe('CANCELLED');
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: BOOKING_ID },
      data: { status: 'CANCELLED' },
    });
  });
});
