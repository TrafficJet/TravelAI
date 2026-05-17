/**
 * POST /api/flights/multi-city — unit tests
 * Stack: Jest + Supertest
 *
 * Prisma is mocked. Duffel is mocked.
 * Run: npx jest --testPathPattern="flights-multi-city" --runInBand
 */

process.env.JWT_ACCESS_SECRET = 'test-access-secret-32chars!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32chars!!';

import Fastify, { FastifyInstance } from 'fastify';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { flightsRoutes, multiCityCache } from '../routes/flights.routes';
import { registerErrorHandler } from '../plugins/error-handler.plugin';

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

jest.mock('../lib/prisma', () => ({
  prisma: {
    subscription: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    searchHistory: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

// ─── Mock @duffel/api ─────────────────────────────────────────────────────────

const mockOfferRequestsCreate = jest.fn();

jest.mock('@duffel/api', () => ({
  Duffel: jest.fn().mockImplementation(() => ({
    offers: { get: jest.fn() },
    offerRequests: { create: mockOfferRequestsCreate },
  })),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const JWT_SECRET = 'test-access-secret-32chars!!';
const TEST_USER_ID = 'user-multi-city-uuid';

function makeToken(userId = TEST_USER_ID): string {
  return jwt.sign({ sub: userId, email: 'test@example.com' }, JWT_SECRET, { expiresIn: '1h' });
}

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  registerErrorHandler(app);
  await app.register(flightsRoutes, { prefix: '/api/flights' });
  await app.ready();
  return app;
}

// Future dates for valid test data
function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

const VALID_BODY = {
  segments: [
    { origin: 'MOW', destination: 'DXB', date: futureDate(30) },
    { origin: 'DXB', destination: 'BKK', date: futureDate(35) },
  ],
  passengers: { adults: 1, children: 0, infants: 0 },
  cabin_class: 'economy',
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/flights/multi-city', () => {
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
    multiCityCache.clear();
    delete process.env.DUFFEL_API_KEY;
  });

  // ── Auth ──────────────────────────────────────────────────────────────────

  it('returns 401 when no Bearer token is provided', async () => {
    const res = await request(app.server)
      .post('/api/flights/multi-city')
      .send(VALID_BODY)
      .expect(401);

    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('returns 200 with offers array for 2 valid segments (mock mode)', async () => {
    const res = await request(app.server)
      .post('/api/flights/multi-city')
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_BODY)
      .expect(200);

    expect(Array.isArray(res.body.offers)).toBe(true);
    expect(res.body.offers.length).toBeGreaterThan(0);
    expect(typeof res.body.totalResults).toBe('number');
    expect(res.body.totalResults).toBe(res.body.offers.length);
  });

  it('returns offers with correct structure for each offer', async () => {
    const res = await request(app.server)
      .post('/api/flights/multi-city')
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_BODY)
      .expect(200);

    const offer = res.body.offers[0];
    expect(offer).toHaveProperty('offerId');
    expect(offer).toHaveProperty('totalPrice');
    expect(offer).toHaveProperty('currency');
    expect(offer).toHaveProperty('cabinClass');
    expect(offer).toHaveProperty('segments');
    expect(Array.isArray(offer.segments)).toBe(true);
    expect(offer.segments.length).toBe(2); // 2 сегмента
  });

  it('accepts 5 segments (maximum allowed)', async () => {
    const body = {
      segments: [
        { origin: 'MOW', destination: 'DXB', date: futureDate(10) },
        { origin: 'DXB', destination: 'BKK', date: futureDate(15) },
        { origin: 'BKK', destination: 'SIN', date: futureDate(20) },
        { origin: 'SIN', destination: 'NRT', date: futureDate(25) },
        { origin: 'NRT', destination: 'MOW', date: futureDate(30) },
      ],
      passengers: { adults: 2, children: 1, infants: 0 },
      cabin_class: 'business',
    };

    const res = await request(app.server)
      .post('/api/flights/multi-city')
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(200);

    expect(res.body.offers.length).toBeGreaterThan(0);
  });

  // ── Validation — segment count ────────────────────────────────────────────

  it('returns 4xx when only 1 segment is provided', async () => {
    const body = {
      segments: [{ origin: 'MOW', destination: 'DXB', date: futureDate(30) }],
      passengers: { adults: 1, children: 0, infants: 0 },
      cabin_class: 'economy',
    };

    const res = await request(app.server)
      .post('/api/flights/multi-city')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

    // Fastify schema validation (minItems) returns 422; custom validation returns 422
    expect([400, 422]).toContain(res.status);
  });

  it('returns 4xx when 6 segments are provided (exceeds maximum)', async () => {
    const body = {
      segments: Array.from({ length: 6 }, (_, i) => ({
        origin: 'MOW',
        destination: `D${String(i).padStart(2, '0')}`,
        date: futureDate(10 + i),
      })),
      passengers: { adults: 1, children: 0, infants: 0 },
      cabin_class: 'economy',
    };

    const res = await request(app.server)
      .post('/api/flights/multi-city')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

    // Fastify schema validation (maxItems) returns 422
    expect([400, 422]).toContain(res.status);
  });

  // ── Validation — dates ────────────────────────────────────────────────────

  it('returns 422 when a segment date is in the past', async () => {
    const body = {
      segments: [
        { origin: 'MOW', destination: 'DXB', date: '2020-01-01' }, // прошлое
        { origin: 'DXB', destination: 'BKK', date: futureDate(35) },
      ],
      passengers: { adults: 1, children: 0, infants: 0 },
      cabin_class: 'economy',
    };

    const res = await request(app.server)
      .post('/api/flights/multi-city')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

    expect([400, 422]).toContain(res.status);
  });

  it('returns 400/422 when a date is invalid format', async () => {
    const body = {
      segments: [
        { origin: 'MOW', destination: 'DXB', date: 'not-a-date' },
        { origin: 'DXB', destination: 'BKK', date: futureDate(35) },
      ],
      passengers: { adults: 1, children: 0, infants: 0 },
      cabin_class: 'economy',
    };

    const res = await request(app.server)
      .post('/api/flights/multi-city')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

    expect([400, 422]).toContain(res.status);
  });

  // ── Caching ───────────────────────────────────────────────────────────────

  it('caches results for 10 minutes and returns same data on repeat request', async () => {
    const res1 = await request(app.server)
      .post('/api/flights/multi-city')
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_BODY)
      .expect(200);

    expect(multiCityCache.size).toBe(1);

    const res2 = await request(app.server)
      .post('/api/flights/multi-city')
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_BODY)
      .expect(200);

    // Offers count should be same (from cache)
    expect(res2.body.totalResults).toBe(res1.body.totalResults);
  });
});
