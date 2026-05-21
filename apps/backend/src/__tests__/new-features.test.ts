/**
 * New features — unit tests
 *
 * Covers:
 *   1. DELETE /api/users/me            — soft-delete account
 *   2. GET    /api/users/me/preferences — get preferences
 *   3. PATCH  /api/users/me/preferences — update preferences
 *   4. GET    /api/flights/popular      — popular flight routes (public)
 *   5. GET    /api/hotels/popular       — popular hotel cities  (public)
 *
 * Prisma is fully mocked; no live DB required.
 * Run: npx jest --testPathPattern="new-features" --runInBand
 */

process.env.JWT_ACCESS_SECRET = 'test-access-secret-32chars!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32chars!!';

import Fastify, { FastifyInstance } from 'fastify';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { usersRoutes } from '../routes/users.routes';
import { flightsRoutes } from '../routes/flights.routes';
import { hotelsRoutes } from '../routes/hotels.routes';
import { authRoutes } from '../routes/auth.routes';
import { registerErrorHandler } from '../plugins/error-handler.plugin';

// ---------------------------------------------------------------------------
// Prisma mock
// ---------------------------------------------------------------------------

const mockUserFindUnique = jest.fn();
const mockUserUpdate = jest.fn();
const mockSearchHistoryFindMany = jest.fn();

jest.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
    booking: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    wallet: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    searchHistory: {
      findMany: (...args: unknown[]) => mockSearchHistoryFindMany(...args),
    },
    refreshToken: {
      create: jest.fn().mockResolvedValue({}),
    },
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const JWT_SECRET = 'test-access-secret-32chars!!';
const TEST_USER_ID = 'user-new-features-uuid';

function makeToken(userId = TEST_USER_ID): string {
  return jwt.sign({ sub: userId, email: 'test@example.com' }, JWT_SECRET, { expiresIn: '1h' });
}

async function buildUsersApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  registerErrorHandler(app);
  await app.register(usersRoutes, { prefix: '/api/users' });
  await app.ready();
  return app;
}

async function buildFlightsApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  registerErrorHandler(app);
  await app.register(flightsRoutes, { prefix: '/api/flights' });
  await app.ready();
  return app;
}

async function buildHotelsApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  registerErrorHandler(app);
  await app.register(hotelsRoutes, { prefix: '/api/hotels' });
  await app.ready();
  return app;
}

async function buildAuthApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  registerErrorHandler(app);
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.ready();
  return app;
}

// ---------------------------------------------------------------------------
// 1. DELETE /api/users/me
// ---------------------------------------------------------------------------

describe('DELETE /api/users/me', () => {
  let app: FastifyInstance;
  let token: string;

  beforeAll(async () => {
    app = await buildUsersApp();
    token = makeToken();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when no Bearer token provided', async () => {
    const res = await request(app.server)
      .delete('/api/users/me')
      .send({ password: 'Passw0rd!' })
      .expect(401);

    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 422 when password field is missing', async () => {
    const res = await request(app.server)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(422);

    // Fastify schema validation returns 422 for missing required field
    expect(res.status).toBe(422);
  });

  it('returns 404 when user does not exist', async () => {
    mockUserFindUnique.mockResolvedValueOnce(null);

    const res = await request(app.server)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'Passw0rd!' })
      .expect(404);

    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 401 when password is incorrect', async () => {
    // bcrypt hash of "CorrectPass" — pre-computed to avoid real bcrypt in tests
    // We use a real bcrypt hash here; import bcrypt directly
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('CorrectPass', 10);

    mockUserFindUnique.mockResolvedValueOnce({
      id: TEST_USER_ID,
      password: hash,
    });

    const res = await request(app.server)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'WrongPass' })
      .expect(401);

    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('soft-deletes user and returns { success: true } on correct password', async () => {
    const bcrypt = await import('bcrypt');
    const correctPassword = 'Passw0rd!';
    const hash = await bcrypt.hash(correctPassword, 10);

    mockUserFindUnique.mockResolvedValueOnce({
      id: TEST_USER_ID,
      password: hash,
    });

    mockUserUpdate.mockResolvedValueOnce({ id: TEST_USER_ID, deletedAt: new Date() });

    const res = await request(app.server)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: correctPassword })
      .expect(200);

    expect(res.body).toMatchObject({ success: true, message: 'Аккаунт удалён' });

    // Verify update was called with deletedAt
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TEST_USER_ID },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// 2. GET /api/users/me/preferences
// ---------------------------------------------------------------------------

describe('GET /api/users/me/preferences', () => {
  let app: FastifyInstance;
  let token: string;

  beforeAll(async () => {
    app = await buildUsersApp();
    token = makeToken();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when no Bearer token provided', async () => {
    const res = await request(app.server)
      .get('/api/users/me/preferences')
      .expect(401);

    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 404 when user does not exist', async () => {
    mockUserFindUnique.mockResolvedValueOnce(null);

    const res = await request(app.server)
      .get('/api/users/me/preferences')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns default preferences when user has empty preferences', async () => {
    mockUserFindUnique.mockResolvedValueOnce({ preferences: {} });

    const res = await request(app.server)
      .get('/api/users/me/preferences')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.preferences).toMatchObject({
      theme: 'auto',
      language: 'ru',
      notifications: {
        priceAlerts: true,
        bookings: true,
        system: true,
      },
    });
  });

  it('returns merged preferences when user has partial preferences stored', async () => {
    mockUserFindUnique.mockResolvedValueOnce({
      preferences: { theme: 'dark', language: 'en' },
    });

    const res = await request(app.server)
      .get('/api/users/me/preferences')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.preferences).toMatchObject({
      theme: 'dark',
      language: 'en',
      notifications: {
        priceAlerts: true,
        bookings: true,
        system: true,
      },
    });
  });
});

// ---------------------------------------------------------------------------
// 3. PATCH /api/users/me/preferences
// ---------------------------------------------------------------------------

describe('PATCH /api/users/me/preferences', () => {
  let app: FastifyInstance;
  let token: string;

  beforeAll(async () => {
    app = await buildUsersApp();
    token = makeToken();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when no Bearer token provided', async () => {
    const res = await request(app.server)
      .patch('/api/users/me/preferences')
      .send({ theme: 'dark' })
      .expect(401);

    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 422 when theme value is invalid', async () => {
    const res = await request(app.server)
      .patch('/api/users/me/preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({ theme: 'rainbow' })
      .expect(422);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 when language value is invalid', async () => {
    const res = await request(app.server)
      .patch('/api/users/me/preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({ language: 'de' })
      .expect(422);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when user does not exist', async () => {
    mockUserFindUnique.mockResolvedValueOnce(null);

    const res = await request(app.server)
      .patch('/api/users/me/preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({ theme: 'dark' })
      .expect(404);

    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('updates theme and returns merged preferences', async () => {
    mockUserFindUnique.mockResolvedValueOnce({ preferences: {} });

    const updatedPrefs = {
      theme: 'dark',
      language: 'ru',
      notifications: { priceAlerts: true, bookings: true, system: true },
    };
    mockUserUpdate.mockResolvedValueOnce({ preferences: updatedPrefs });

    const res = await request(app.server)
      .patch('/api/users/me/preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({ theme: 'dark' })
      .expect(200);

    expect(res.body.preferences).toMatchObject({ theme: 'dark' });

    // Verify update was called
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TEST_USER_ID },
        data: expect.objectContaining({
          preferences: expect.objectContaining({ theme: 'dark' }),
        }),
      }),
    );
  });

  it('updates only notification flags without affecting other fields', async () => {
    mockUserFindUnique.mockResolvedValueOnce({
      preferences: { theme: 'light', language: 'en', notifications: { priceAlerts: true, bookings: true, system: true } },
    });

    const updatedPrefs = {
      theme: 'light',
      language: 'en',
      notifications: { priceAlerts: false, bookings: true, system: true },
    };
    mockUserUpdate.mockResolvedValueOnce({ preferences: updatedPrefs });

    const res = await request(app.server)
      .patch('/api/users/me/preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({ notifications: { priceAlerts: false } })
      .expect(200);

    expect(res.body.preferences.notifications.priceAlerts).toBe(false);

    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          preferences: expect.objectContaining({
            notifications: expect.objectContaining({ priceAlerts: false }),
          }),
        }),
      }),
    );
  });

  it('accepts all valid fields in a single request', async () => {
    mockUserFindUnique.mockResolvedValueOnce({ preferences: {} });

    const updatedPrefs = {
      theme: 'light',
      language: 'en',
      notifications: { priceAlerts: false, bookings: false, system: true },
    };
    mockUserUpdate.mockResolvedValueOnce({ preferences: updatedPrefs });

    const res = await request(app.server)
      .patch('/api/users/me/preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({
        theme: 'light',
        language: 'en',
        notifications: { priceAlerts: false, bookings: false, system: true },
      })
      .expect(200);

    expect(res.body.preferences).toMatchObject({
      theme: 'light',
      language: 'en',
      notifications: { priceAlerts: false, bookings: false },
    });
  });
});

// ---------------------------------------------------------------------------
// 4. GET /api/flights/popular
// ---------------------------------------------------------------------------

describe('GET /api/flights/popular', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildFlightsApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 without authentication token', async () => {
    mockSearchHistoryFindMany.mockResolvedValueOnce([]);

    const res = await request(app.server)
      .get('/api/flights/popular')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns fallback popular destinations when search history is empty', async () => {
    mockSearchHistoryFindMany.mockResolvedValueOnce([]);

    const res = await request(app.server)
      .get('/api/flights/popular')
      .expect(200);

    expect(res.body).toHaveLength(5);
    expect(res.body[0]).toMatchObject({
      origin: 'IST',
      destination: 'DXB',
      label: 'Стамбул → Дубай',
      count: 1250,
    });
  });

  it('returns fallback when DB throws', async () => {
    mockSearchHistoryFindMany.mockRejectedValueOnce(new Error('DB connection refused'));

    const res = await request(app.server)
      .get('/api/flights/popular')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('aggregates search history and returns top routes sorted by count', async () => {
    const rows = [
      { query: JSON.stringify({ origin: 'MOW', destination: 'DXB' }) },
      { query: JSON.stringify({ origin: 'MOW', destination: 'DXB' }) },
      { query: JSON.stringify({ origin: 'MOW', destination: 'DXB' }) },
      { query: JSON.stringify({ origin: 'LED', destination: 'BCN' }) },
      { query: JSON.stringify({ origin: 'LED', destination: 'BCN' }) },
      { query: JSON.stringify({ origin: 'MOW', destination: 'AYT' }) },
    ];
    mockSearchHistoryFindMany.mockResolvedValueOnce(rows);

    const res = await request(app.server)
      .get('/api/flights/popular')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].origin).toBe('MOW');
    expect(res.body[0].destination).toBe('DXB');
    expect(res.body[0].count).toBe(3);
    expect(res.body[1].count).toBe(2);
    expect(res.body[2].count).toBe(1);
  });

  it('returns at most 10 destinations', async () => {
    // Generate 15 unique routes
    const rows = Array.from({ length: 15 }, (_, i) => ({
      query: JSON.stringify({ origin: 'MOW', destination: `D${String(i).padStart(2, '0')}` }),
    }));
    mockSearchHistoryFindMany.mockResolvedValueOnce(rows);

    const res = await request(app.server)
      .get('/api/flights/popular')
      .expect(200);

    expect(res.body.length).toBeLessThanOrEqual(10);
  });

  it('skips unparseable query strings gracefully', async () => {
    const rows = [
      { query: 'not-valid-json' },
      { query: JSON.stringify({ origin: 'MOW', destination: 'DXB' }) },
    ];
    mockSearchHistoryFindMany.mockResolvedValueOnce(rows);

    const res = await request(app.server)
      .get('/api/flights/popular')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].origin).toBe('MOW');
    expect(res.body[0].destination).toBe('DXB');
  });

  it('returns fallback when all queries lack origin or destination', async () => {
    const rows = [
      { query: JSON.stringify({ something: 'else' }) },
      { query: JSON.stringify({ origin: 'MOW' }) }, // missing destination
    ];
    mockSearchHistoryFindMany.mockResolvedValueOnce(rows);

    const res = await request(app.server)
      .get('/api/flights/popular')
      .expect(200);

    // Should fall back to hardcoded list
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('each returned item has origin, destination, label and count fields', async () => {
    const rows = [
      { query: JSON.stringify({ origin: 'SVO', destination: 'IST' }) },
    ];
    mockSearchHistoryFindMany.mockResolvedValueOnce(rows);

    const res = await request(app.server)
      .get('/api/flights/popular')
      .expect(200);

    const item = res.body[0];
    expect(item).toHaveProperty('origin');
    expect(item).toHaveProperty('destination');
    expect(item).toHaveProperty('label');
    expect(item).toHaveProperty('count');
  });
});

// ---------------------------------------------------------------------------
// 5. GET /api/hotels/popular
// ---------------------------------------------------------------------------

describe('GET /api/hotels/popular', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildHotelsApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 without authentication token', async () => {
    mockSearchHistoryFindMany.mockResolvedValueOnce([]);

    const res = await request(app.server)
      .get('/api/hotels/popular')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns fallback popular hotels when search history is empty', async () => {
    mockSearchHistoryFindMany.mockResolvedValueOnce([]);

    const res = await request(app.server)
      .get('/api/hotels/popular')
      .expect(200);

    expect(res.body).toHaveLength(4);
    expect(res.body[0]).toMatchObject({
      city: 'Дубай',
      country: 'ОАЭ',
      code: 'DXB',
      count: 890,
    });
  });

  it('returns fallback when DB throws', async () => {
    mockSearchHistoryFindMany.mockRejectedValueOnce(new Error('DB connection refused'));

    const res = await request(app.server)
      .get('/api/hotels/popular')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('aggregates hotel search history and returns top cities sorted by count', async () => {
    const rows = [
      { query: JSON.stringify({ city: 'Дубай', country: 'ОАЭ', code: 'DXB' }) },
      { query: JSON.stringify({ city: 'Дубай', country: 'ОАЭ', code: 'DXB' }) },
      { query: JSON.stringify({ city: 'Бали', country: 'Индонезия', code: 'DPS' }) },
    ];
    mockSearchHistoryFindMany.mockResolvedValueOnce(rows);

    const res = await request(app.server)
      .get('/api/hotels/popular')
      .expect(200);

    expect(res.body[0].code).toBe('DXB');
    expect(res.body[0].count).toBe(2);
    expect(res.body[1].code).toBe('DPS');
    expect(res.body[1].count).toBe(1);
  });

  it('returns at most 10 cities', async () => {
    // Generate 15 unique city codes
    const rows = Array.from({ length: 15 }, (_, i) => ({
      query: JSON.stringify({ city: `City${i}`, country: 'XX', code: `C${String(i).padStart(2, '0')}` }),
    }));
    mockSearchHistoryFindMany.mockResolvedValueOnce(rows);

    const res = await request(app.server)
      .get('/api/hotels/popular')
      .expect(200);

    expect(res.body.length).toBeLessThanOrEqual(10);
  });

  it('handles queries with destination field as city code fallback', async () => {
    const rows = [
      { query: JSON.stringify({ destination: 'DXB' }) },
      { query: JSON.stringify({ destination: 'DXB' }) },
    ];
    mockSearchHistoryFindMany.mockResolvedValueOnce(rows);

    const res = await request(app.server)
      .get('/api/hotels/popular')
      .expect(200);

    expect(res.body[0].code).toBe('DXB');
    expect(res.body[0].count).toBe(2);
  });

  it('skips entries with no city code and falls back to hardcoded if all entries are invalid', async () => {
    const rows = [
      { query: JSON.stringify({ something: 'else' }) },
      { query: 'bad-json' },
    ];
    mockSearchHistoryFindMany.mockResolvedValueOnce(rows);

    const res = await request(app.server)
      .get('/api/hotels/popular')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('each returned item has city, country, code and count fields', async () => {
    const rows = [
      { query: JSON.stringify({ city: 'Прага', country: 'Чехия', code: 'PRG' }) },
    ];
    mockSearchHistoryFindMany.mockResolvedValueOnce(rows);

    const res = await request(app.server)
      .get('/api/hotels/popular')
      .expect(200);

    const item = res.body[0];
    expect(item).toHaveProperty('city');
    expect(item).toHaveProperty('country');
    expect(item).toHaveProperty('code');
    expect(item).toHaveProperty('count');
  });
});

// ---------------------------------------------------------------------------
// 6. Soft-deleted user login guard
// ---------------------------------------------------------------------------

describe('POST /api/auth/login — soft-deleted user', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildAuthApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when user has deletedAt set (soft-deleted account)', async () => {
    const bcrypt = await import('bcrypt');
    const password = 'Passw0rd!';
    const hash = await bcrypt.hash(password, 10);

    // Simulate a soft-deleted user: deletedAt is a Date, not null
    mockUserFindUnique.mockResolvedValueOnce({
      id: TEST_USER_ID,
      email: 'deleted@example.com',
      password: hash,
      deletedAt: new Date(),
    });

    const res = await request(app.server)
      .post('/api/auth/login')
      .send({ email: 'deleted@example.com', password })
      .expect(401);

    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
