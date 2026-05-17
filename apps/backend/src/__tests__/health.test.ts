/**
 * Health check endpoints — unit tests
 * Stack: Jest + Supertest
 *
 * Prisma is mocked so the suite runs without a live database.
 * Run: npx jest --testPathPattern="health.test" --runInBand
 */

// Set JWT env vars before any module import
process.env.JWT_ACCESS_SECRET = 'test-access-secret-32chars!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32chars!!';

import Fastify, { FastifyInstance } from 'fastify';
import request from 'supertest';
import { healthRoutes } from '../routes/health.routes';

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

const mockQueryRaw = jest.fn();
const mockPriceAlertCount = jest.fn();

jest.mock('../lib/prisma', () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
    priceAlert: {
      count: (...args: unknown[]) => mockPriceAlertCount(...args),
    },
  },
}));

// ─── Mock websocket plugin (getActiveConnectionCount) ────────────────────────

jest.mock('../plugins/websocket.plugin', () => ({
  getActiveConnectionCount: () => 3,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(healthRoutes, { prefix: '/health' });
  await app.ready();
  return app;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /health', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 with status ok, db ok, and new fields when DB responds', async () => {
    mockQueryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
    mockPriceAlertCount.mockResolvedValueOnce(7);

    const res = await request(app.server).get('/health').expect(200);

    expect(res.body).toMatchObject({
      status: 'ok',
      db: 'ok',
      timestamp: expect.any(String),
      uptime: expect.any(Number),
      version: expect.any(String),
      websocketConnections: 3,
      cacheSize: expect.any(Number),
      activeAlerts: 7,
    });
  });

  it('returns 503 with db error when DB is unreachable', async () => {
    mockQueryRaw.mockRejectedValueOnce(new Error('connection refused'));
    mockPriceAlertCount.mockRejectedValueOnce(new Error('connection refused'));

    const res = await request(app.server).get('/health').expect(503);

    expect(res.body).toMatchObject({
      status: 'ok',
      db: 'error',
      websocketConnections: 3,
      activeAlerts: 0,
    });
  });

  it('includes websocketConnections and cacheSize in the response', async () => {
    mockQueryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
    mockPriceAlertCount.mockResolvedValueOnce(0);

    const res = await request(app.server).get('/health').expect(200);

    expect(typeof res.body.websocketConnections).toBe('number');
    expect(typeof res.body.cacheSize).toBe('number');
  });
});

describe('GET /health/ready', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with ready: true', async () => {
    mockQueryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

    const res = await request(app.server).get('/health/ready').expect(200);

    expect(res.body).toEqual({ ready: true });
  });
});
