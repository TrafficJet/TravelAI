/**
 * Price alerts endpoints — unit tests
 * Stack: Jest + Supertest
 *
 * Prisma is mocked so the suite runs without a live database.
 * Run: npx jest --testPathPattern="price-alerts.test" --runInBand
 */

process.env.JWT_ACCESS_SECRET = 'test-access-secret-32chars!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32chars!!';

import Fastify, { FastifyInstance } from 'fastify';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { priceAlertsRoutes } from '../routes/price-alerts.routes';
import { registerErrorHandler } from '../plugins/error-handler.plugin';

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

const mockCount = jest.fn();
const mockCreate = jest.fn();
const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockDelete = jest.fn();
const mockUpdate = jest.fn();

jest.mock('../lib/prisma', () => ({
  prisma: {
    priceAlert: {
      count: (...args: unknown[]) => mockCount(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const JWT_SECRET = 'test-access-secret-32chars!!';
const TEST_USER_ID = 'user-price-alert-uuid';
const OTHER_USER_ID = 'user-other-uuid';

function makeToken(userId = TEST_USER_ID): string {
  return jwt.sign({ sub: userId, email: 'test@example.com' }, JWT_SECRET, { expiresIn: '1h' });
}

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  registerErrorHandler(app);
  await app.register(priceAlertsRoutes, { prefix: '/api/price-alerts' });
  await app.ready();
  return app;
}

const VALID_ALERT = { origin: 'SVO', destination: 'IST', maxPrice: 15000 };

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/price-alerts', () => {
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
    const res = await request(app.server).post('/api/price-alerts').send(VALID_ALERT).expect(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('creates a new price alert and returns 201', async () => {
    mockCount.mockResolvedValueOnce(0);
    const createdAlert = {
      id: 'alert-uuid-1',
      userId: TEST_USER_ID,
      ...VALID_ALERT,
      origin: 'SVO',
      destination: 'IST',
      active: true,
      triggeredAt: null,
      createdAt: new Date().toISOString(),
    };
    mockCreate.mockResolvedValueOnce(createdAlert);

    const res = await request(app.server)
      .post('/api/price-alerts')
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_ALERT)
      .expect(201);

    expect(res.body.alert).toMatchObject({
      id: 'alert-uuid-1',
      origin: 'SVO',
      destination: 'IST',
      active: true,
    });
  });

  it('returns 429 when user already has 5 active alerts', async () => {
    mockCount.mockResolvedValueOnce(5);

    const res = await request(app.server)
      .post('/api/price-alerts')
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_ALERT)
      .expect(429);

    expect(res.body.error.code).toBe('LIMIT_REACHED');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 422 when maxPrice is negative', async () => {
    const res = await request(app.server)
      .post('/api/price-alerts')
      .set('Authorization', `Bearer ${token}`)
      .send({ origin: 'SVO', destination: 'IST', maxPrice: -100 })
      .expect(422);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 when required fields are missing', async () => {
    const res = await request(app.server)
      .post('/api/price-alerts')
      .set('Authorization', `Bearer ${token}`)
      .send({ origin: 'SVO' })
      .expect(422);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/price-alerts', () => {
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
    const res = await request(app.server).get('/api/price-alerts').expect(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 200 with list of active alerts', async () => {
    const fakeAlerts = [
      {
        id: 'alert-uuid-1',
        userId: TEST_USER_ID,
        origin: 'SVO',
        destination: 'IST',
        maxPrice: 15000,
        active: true,
        triggeredAt: null,
        createdAt: new Date().toISOString(),
      },
    ];
    mockFindMany.mockResolvedValueOnce(fakeAlerts);

    const res = await request(app.server)
      .get('/api/price-alerts')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].origin).toBe('SVO');
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: TEST_USER_ID, active: true },
      }),
    );
  });

  it('returns empty array when user has no active alerts', async () => {
    mockFindMany.mockResolvedValueOnce([]);

    const res = await request(app.server)
      .get('/api/price-alerts')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data).toEqual([]);
  });
});

describe('DELETE /api/price-alerts/:id', () => {
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
    const res = await request(app.server).delete('/api/price-alerts/some-id').expect(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 200 with success true when alert is deleted', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'alert-uuid-1',
      userId: TEST_USER_ID,
      origin: 'SVO',
      destination: 'IST',
      maxPrice: 15000,
      active: true,
    });
    mockUpdate.mockResolvedValueOnce({ id: 'alert-uuid-1', active: false });

    const res = await request(app.server)
      .delete('/api/price-alerts/alert-uuid-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({ success: true });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'alert-uuid-1' },
      data: { active: false },
    });
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('returns 404 when alert does not exist', async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const res = await request(app.server)
      .delete('/api/price-alerts/nonexistent-id')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 403 when alert belongs to another user', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'alert-uuid-2',
      userId: OTHER_USER_ID, // different owner
      origin: 'LED',
      destination: 'AER',
      maxPrice: 5000,
      active: true,
    });

    const res = await request(app.server)
      .delete('/api/price-alerts/alert-uuid-2')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
