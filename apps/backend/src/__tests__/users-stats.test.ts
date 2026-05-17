/**
 * GET /api/users/me/stats — unit tests
 * Stack: Jest + Supertest
 *
 * Prisma is mocked so the suite runs without a live database.
 * Run: npx jest --testPathPattern="users-stats" --runInBand
 */

process.env.JWT_ACCESS_SECRET = 'test-access-secret-32chars!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32chars!!';

import Fastify, { FastifyInstance } from 'fastify';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { usersRoutes } from '../routes/users.routes';
import { registerErrorHandler } from '../plugins/error-handler.plugin';

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

const mockBookingFindMany = jest.fn();
const mockWalletFindUnique = jest.fn();
const mockUserFindUnique = jest.fn();

jest.mock('../lib/prisma', () => ({
  prisma: {
    booking: {
      findMany: (...args: unknown[]) => mockBookingFindMany(...args),
    },
    wallet: {
      findUnique: (...args: unknown[]) => mockWalletFindUnique(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      update: jest.fn().mockResolvedValue({}),
    },
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const JWT_SECRET = 'test-access-secret-32chars!!';
const TEST_USER_ID = 'user-stats-test-uuid';

function makeToken(userId = TEST_USER_ID): string {
  return jwt.sign({ sub: userId, email: 'test@example.com' }, JWT_SECRET, { expiresIn: '1h' });
}

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  registerErrorHandler(app);
  await app.register(usersRoutes, { prefix: '/api/users' });
  await app.ready();
  return app;
}

function makeBooking(type: string, totalPrice: string) {
  return {
    type,
    totalPrice: { toString: () => totalPrice },
    createdAt: new Date('2024-01-15'),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/users/me/stats', () => {
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

  it('returns 401 when no Bearer token provided', async () => {
    const res = await request(app.server).get('/api/users/me/stats').expect(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns stats with correct totals for a user with bookings', async () => {
    const bookings = [
      makeBooking('FLIGHT', '25000'),
      makeBooking('FLIGHT', '30000'),
      makeBooking('HOTEL', '15000'),
      makeBooking('FLIGHT', '20000'),
      makeBooking('HOTEL', '10000'),
    ];

    mockBookingFindMany.mockResolvedValueOnce(bookings);
    mockWalletFindUnique.mockResolvedValueOnce({ balance: { toString: () => '500' } });
    mockUserFindUnique.mockResolvedValueOnce({ createdAt: new Date('2024-01-01') });

    const res = await request(app.server)
      .get('/api/users/me/stats')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({
      totalBookings: 5,
      totalSpent: 100000,
      totalFlights: 3,
      bonusBalance: 1000, // 1% of 100000
      memberSince: '2024-01-01',
    });
  });

  it('returns zeroed stats for a user with no bookings', async () => {
    mockBookingFindMany.mockResolvedValueOnce([]);
    mockWalletFindUnique.mockResolvedValueOnce(null);
    mockUserFindUnique.mockResolvedValueOnce({ createdAt: new Date('2024-06-15') });

    const res = await request(app.server)
      .get('/api/users/me/stats')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({
      totalBookings: 0,
      totalSpent: 0,
      totalFlights: 0,
      bonusBalance: 0,
      memberSince: '2024-06-15',
    });
  });

  it('returns 404 when user does not exist', async () => {
    mockBookingFindMany.mockResolvedValueOnce([]);
    mockWalletFindUnique.mockResolvedValueOnce(null);
    mockUserFindUnique.mockResolvedValueOnce(null);

    const res = await request(app.server)
      .get('/api/users/me/stats')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('counts only FLIGHT type bookings for totalFlights', async () => {
    const bookings = [
      makeBooking('HOTEL', '5000'),
      makeBooking('HOTEL', '8000'),
      makeBooking('FLIGHT', '12000'),
    ];

    mockBookingFindMany.mockResolvedValueOnce(bookings);
    mockWalletFindUnique.mockResolvedValueOnce(null);
    mockUserFindUnique.mockResolvedValueOnce({ createdAt: new Date('2023-03-10') });

    const res = await request(app.server)
      .get('/api/users/me/stats')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.totalBookings).toBe(3);
    expect(res.body.totalFlights).toBe(1);
    expect(res.body.memberSince).toBe('2023-03-10');
  });
});
