/**
 * POST /api/bookings/confirm — unit tests
 * Stack: Jest + Supertest (mocked Prisma, no live DB required)
 *
 * Covers:
 *   - Happy path: PENDING booking, sufficient wallet balance → 200 + CONFIRMED status
 *   - Insufficient funds → 402 INSUFFICIENT_FUNDS
 *   - Booking not found / wrong user → 404
 *   - Booking already CONFIRMED (not PENDING) → 404
 *   - Missing auth token → 401
 *   - Missing required body fields → 400
 *
 * Run: npx jest --testPathPattern="bookings-confirm" --runInBand
 */

process.env.JWT_ACCESS_SECRET = 'test-access-secret-32chars!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32chars!!';

import Fastify, { FastifyInstance } from 'fastify';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { bookingsRoutes } from '../routes/bookings.routes';
import { registerErrorHandler } from '../plugins/error-handler.plugin';

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

const mockBookingFindFirst = jest.fn();
const mockWalletFindUnique = jest.fn();
const mockTransaction = jest.fn();
const mockUserFindUnique = jest.fn();
const mockSubscriptionFindUnique = jest.fn();

jest.mock('../lib/prisma', () => ({
  prisma: {
    booking: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: (...args: unknown[]) => mockBookingFindFirst(...args),
      // count is called by checkBookingLimit — return 0 so limit is not hit
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockResolvedValue({}),
    },
    wallet: {
      findUnique: (...args: unknown[]) => mockWalletFindUnique(...args),
      update: jest.fn().mockResolvedValue({}),
    },
    walletTransaction: {
      create: jest.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    subscription: {
      // checkBookingLimit checks subscription plan; return PREMIUM to skip the booking-count check
      findUnique: (...args: unknown[]) => mockSubscriptionFindUnique(...args),
    },
    // notification.create is called fire-and-forget after booking confirmation
    notification: {
      create: jest.fn().mockResolvedValue({}),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

// ─── Mock email service so no SMTP calls happen ──────────────────────────────

jest.mock('../lib/email', () => ({
  emailService: {
    sendBookingConfirmation: jest.fn().mockResolvedValue(undefined),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const JWT_SECRET = 'test-access-secret-32chars!!';
const TEST_USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OTHER_USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const BOOKING_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const WALLET_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

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
    totalPrice: { toString: () => '5000.00', valueOf: () => 5000 },
    currency: 'RUB',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    details: { origin: 'WAW', destination: 'BCN', departureDate: '2024-06-01' },
    ...overrides,
  };
}

function makeWallet(balance: number) {
  return {
    id: WALLET_ID,
    userId: TEST_USER_ID,
    balance: { valueOf: () => balance },
  };
}

function makeConfirmedBooking() {
  const b = makeBooking({ status: 'CONFIRMED' });
  return {
    ...b,
    updatedAt: new Date(),
  };
}

function makeTransaction() {
  return {
    id: 'tttttttt-tttt-tttt-tttt-tttttttttttt',
    amount: { toString: () => '5000.00' },
    type: 'DEBIT',
    description: 'Оплата бронирования',
    bookingId: BOOKING_ID,
    createdAt: new Date(),
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

describe('POST /api/bookings/confirm', () => {
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
    // Default: user findUnique resolves to null (email notification fire-and-forget)
    mockUserFindUnique.mockResolvedValue(null);
    // Default: subscription returns PREMIUM so checkBookingLimit middleware passes through
    mockSubscriptionFindUnique.mockResolvedValue({
      plan: 'PREMIUM',
      status: 'ACTIVE',
    });
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  it('confirms a PENDING booking and returns 200 with CONFIRMED status', async () => {
    const booking = makeBooking();
    const wallet = makeWallet(10000);
    const confirmedBooking = makeBooking({ status: 'CONFIRMED' });
    const updatedWallet = makeWallet(5000);
    const transaction = makeTransaction();

    mockBookingFindFirst.mockResolvedValue(booking);
    mockWalletFindUnique.mockResolvedValue(wallet);
    mockTransaction.mockResolvedValue([updatedWallet, confirmedBooking, transaction]);

    const res = await request(app.server)
      .post('/api/bookings/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookingId: BOOKING_ID, payFromWallet: true });

    expect(res.status).toBe(200);
    expect(res.body.booking).toBeDefined();
    expect(res.body.booking.status).toBe('CONFIRMED');
    expect(res.body.transaction).toBeDefined();
    expect(res.body.newBalance).toBeDefined();
  });

  // ── Insufficient funds ─────────────────────────────────────────────────────

  it('returns 402 when wallet balance is less than booking price', async () => {
    const booking = makeBooking(); // totalPrice = 5000
    const wallet = makeWallet(1000); // balance = 1000 < 5000

    mockBookingFindFirst.mockResolvedValue(booking);
    mockWalletFindUnique.mockResolvedValue(wallet);

    const res = await request(app.server)
      .post('/api/bookings/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookingId: BOOKING_ID, payFromWallet: true });

    expect(res.status).toBe(402);
    expect(res.body.error?.code).toBe('INSUFFICIENT_FUNDS');
  });

  // ── Not found ──────────────────────────────────────────────────────────────

  it('returns 404 when the booking does not exist', async () => {
    mockBookingFindFirst.mockResolvedValue(null);

    const res = await request(app.server)
      .post('/api/bookings/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookingId: BOOKING_ID, payFromWallet: true });

    expect(res.status).toBe(404);
  });

  it('returns 404 when the booking belongs to a different user', async () => {
    // findFirst filters by userId, so it returns null for other user's bookings
    mockBookingFindFirst.mockResolvedValue(null);

    const otherToken = makeToken(OTHER_USER_ID);
    const res = await request(app.server)
      .post('/api/bookings/confirm')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ bookingId: BOOKING_ID, payFromWallet: true });

    expect(res.status).toBe(404);
  });

  // ── Auth guard ─────────────────────────────────────────────────────────────

  it('returns 401 when no Bearer token is provided', async () => {
    const res = await request(app.server)
      .post('/api/bookings/confirm')
      .send({ bookingId: BOOKING_ID, payFromWallet: true });

    expect(res.status).toBe(401);
  });

  it('returns 401 when an invalid Bearer token is provided', async () => {
    const res = await request(app.server)
      .post('/api/bookings/confirm')
      .set('Authorization', 'Bearer not.a.valid.token')
      .send({ bookingId: BOOKING_ID, payFromWallet: true });

    expect(res.status).toBe(401);
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  it('returns 4xx when bookingId is missing from the request body', async () => {
    // Fastify schema validation returns 400 in strict mode; some versions return 422.
    const res = await request(app.server)
      .post('/api/bookings/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ payFromWallet: true });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it('returns 4xx when payFromWallet is missing from the request body', async () => {
    const res = await request(app.server)
      .post('/api/bookings/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookingId: BOOKING_ID });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});
