/**
 * GET /api/flights/:offerId — unit tests
 * Stack: Jest + Supertest
 *
 * Prisma is mocked. Duffel is mocked to test both the real-API path
 * and the fallback mock path.
 *
 * Run: npx jest --testPathPattern="flights-offer" --runInBand
 */

process.env.JWT_ACCESS_SECRET = 'test-access-secret-32chars!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32chars!!';

import Fastify, { FastifyInstance } from 'fastify';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { flightsRoutes, offerCache } from '../routes/flights.routes';
import { registerErrorHandler } from '../plugins/error-handler.plugin';

// ─── Mock Prisma (auth middleware reads subscription) ─────────────────────────

jest.mock('../lib/prisma', () => ({
  prisma: {
    subscription: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  },
}));

// ─── Mock @duffel/api ─────────────────────────────────────────────────────────

const mockDuffelGet = jest.fn();

jest.mock('@duffel/api', () => ({
  Duffel: jest.fn().mockImplementation(() => ({
    offers: { get: mockDuffelGet },
  })),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const JWT_SECRET = 'test-access-secret-32chars!!';
const TEST_USER_ID = 'user-flight-offer-uuid';

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

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/flights/:offerId', () => {
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
    offerCache.clear();
    // Remove DUFFEL_API_KEY so tests use mock data by default
    delete process.env.DUFFEL_API_KEY;
  });

  it('returns 401 when no Bearer token provided', async () => {
    const res = await request(app.server).get('/api/flights/offer-123').expect(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns flat offer structure when Duffel key is absent (mock fallback)', async () => {
    const res = await request(app.server)
      .get('/api/flights/offer-abc123')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const offer = res.body;
    expect(offer).toMatchObject({
      id: 'offer-abc123',
      origin: expect.any(String),
      destination: expect.any(String),
      departureDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      departureTime: expect.stringMatching(/^\d{2}:\d{2}$/),
      arrivalTime: expect.stringMatching(/^\d{2}:\d{2}$/),
      airline: expect.any(String),
      flightNumber: expect.any(String),
      cabin: expect.any(String),
      stops: expect.any(Number),
      durationMin: expect.any(Number),
      price: expect.any(Number),
      currency: expect.any(String),
      availableSeats: expect.any(Number),
    });
  });

  it('caches the offer on the first request and returns cached data on the second', async () => {
    const offerId = 'offer-cache-test';

    // First request — populates cache
    const res1 = await request(app.server)
      .get(`/api/flights/${offerId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Cache should now contain the entry
    expect(offerCache.has(offerId)).toBe(true);

    // Second request — must hit cache
    const res2 = await request(app.server)
      .get(`/api/flights/${offerId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res2.body).toEqual(res1.body);
  });

  it('returns the offer from Duffel API when DUFFEL_API_KEY is set', async () => {
    process.env.DUFFEL_API_KEY = 'test-duffel-key';

    const now = new Date().toISOString();
    const duffelOffer = {
      id: 'duf_offer_xyz',
      total_amount: '18500',
      total_currency: 'RUB',
      expires_at: now,
      conditions: {},
      passengers: [{ id: 'pax-1', type: 'adult', given_name: null, family_name: null }],
      slices: [
        {
          segments: [
            {
              origin: { iata_code: 'SVO' },
              destination: { iata_code: 'DXB' },
              departing_at: '2026-06-01T10:00:00Z',
              arriving_at: '2026-06-01T14:00:00Z',
              duration: 'PT4H0M',
              operating_carrier: { name: 'Aeroflot', iata_code: 'SU' },
              operating_carrier_flight_number: '101',
              aircraft: { name: 'Boeing 737' },
              origin_terminal: 'D',
              destination_terminal: '1',
              passengers: [
                {
                  cabin_class_marketing_name: 'Economy',
                  baggages: [{ type: 'checked', quantity: 1 }],
                },
              ],
            },
          ],
        },
      ],
    };

    mockDuffelGet.mockResolvedValueOnce({ data: duffelOffer });

    const res = await request(app.server)
      .get('/api/flights/duf_offer_xyz')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.id).toBe('duf_offer_xyz');
    expect(res.body.origin).toBe('SVO');
    expect(res.body.destination).toBe('DXB');
    expect(res.body.durationMin).toBe(240);
    expect(res.body.price).toBe(18500);
    expect(res.body.currency).toBe('RUB');
    expect(mockDuffelGet).toHaveBeenCalledTimes(1);

    delete process.env.DUFFEL_API_KEY;
  });

  it('falls back to mock when Duffel API throws', async () => {
    process.env.DUFFEL_API_KEY = 'test-duffel-key';
    mockDuffelGet.mockRejectedValueOnce(new Error('network error'));

    const res = await request(app.server)
      .get('/api/flights/offer-error-fallback')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Should still return a valid flat offer
    expect(res.body.id).toBe('offer-error-fallback');
    expect(res.body.price).toBeGreaterThan(0);

    delete process.env.DUFFEL_API_KEY;
  });
});
