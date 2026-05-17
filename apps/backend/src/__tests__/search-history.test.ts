/**
 * Search history endpoints — unit tests
 * Stack: Jest + Supertest
 *
 * Prisma is mocked so the suite runs without a live database.
 * Run: npx jest --testPathPattern="search-history.test" --runInBand
 */

process.env.JWT_ACCESS_SECRET = 'test-access-secret-32chars!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32chars!!';

import Fastify, { FastifyInstance } from 'fastify';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { searchHistoryRoutes } from '../routes/search-history.routes';
import { registerErrorHandler } from '../plugins/error-handler.plugin';

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockDeleteMany = jest.fn();
const mockDelete = jest.fn();

jest.mock('../lib/prisma', () => ({
  prisma: {
    searchHistory: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const JWT_SECRET = 'test-access-secret-32chars!!';
const TEST_USER_ID = 'user-search-history-uuid';
const OTHER_USER_ID = 'user-other-uuid';

function makeToken(userId = TEST_USER_ID): string {
  return jwt.sign({ sub: userId, email: 'test@example.com' }, JWT_SECRET, { expiresIn: '1h' });
}

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  registerErrorHandler(app);
  await app.register(searchHistoryRoutes, { prefix: '/api/search-history' });
  await app.ready();
  return app;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/search-history', () => {
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
    const res = await request(app.server).get('/api/search-history').expect(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 200 with search history data for authenticated user', async () => {
    const fakeHistory = [
      {
        id: 'sh-uuid-1',
        query: '{"origin":"SVO","destination":"IST"}',
        type: 'flight',
        results: [],
        createdAt: new Date().toISOString(),
      },
    ];
    mockFindMany.mockResolvedValueOnce(fakeHistory);

    const res = await request(app.server)
      .get('/api/search-history')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].type).toBe('flight');
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: TEST_USER_ID },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    );
  });

  it('returns empty array when user has no history', async () => {
    mockFindMany.mockResolvedValueOnce([]);

    const res = await request(app.server)
      .get('/api/search-history')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data).toEqual([]);
  });
});

describe('GET /api/search-history/:id', () => {
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
    const res = await request(app.server).get('/api/search-history/sh-uuid-1').expect(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 200 with record details for the owner', async () => {
    const fakeRecord = {
      id: 'sh-uuid-1',
      query: '{"origin":"SVO","destination":"IST"}',
      type: 'flight',
      results: [],
      createdAt: new Date().toISOString(),
      userId: TEST_USER_ID,
    };
    mockFindUnique.mockResolvedValueOnce(fakeRecord);

    const res = await request(app.server)
      .get('/api/search-history/sh-uuid-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.id).toBe('sh-uuid-1');
    expect(res.body.data.type).toBe('flight');
    // userId must not be exposed
    expect(res.body.data.userId).toBeUndefined();
  });

  it('returns 404 when record does not exist', async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const res = await request(app.server)
      .get('/api/search-history/nonexistent')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 403 when record belongs to another user', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'sh-uuid-2',
      query: '{}',
      type: 'flight',
      results: [],
      createdAt: new Date().toISOString(),
      userId: OTHER_USER_ID,
    });

    const res = await request(app.server)
      .get('/api/search-history/sh-uuid-2')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

describe('DELETE /api/search-history/:id', () => {
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
    const res = await request(app.server).delete('/api/search-history/sh-uuid-1').expect(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 200 with success true when record is deleted', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'sh-uuid-1',
      userId: TEST_USER_ID,
    });
    mockDelete.mockResolvedValueOnce({ id: 'sh-uuid-1' });

    const res = await request(app.server)
      .delete('/api/search-history/sh-uuid-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({ success: true });
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'sh-uuid-1' } });
  });

  it('returns 404 when record does not exist', async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const res = await request(app.server)
      .delete('/api/search-history/nonexistent')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 403 when record belongs to another user', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'sh-uuid-3',
      userId: OTHER_USER_ID,
    });

    const res = await request(app.server)
      .delete('/api/search-history/sh-uuid-3')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(mockDelete).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/search-history', () => {
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
    const res = await request(app.server).delete('/api/search-history').expect(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 200 with success true and deleted count', async () => {
    mockDeleteMany.mockResolvedValueOnce({ count: 5 });

    const res = await request(app.server)
      .delete('/api/search-history')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({ success: true, deleted: 5 });
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { userId: TEST_USER_ID } });
  });

  it('returns deleted: 0 when history was already empty', async () => {
    mockDeleteMany.mockResolvedValueOnce({ count: 0 });

    const res = await request(app.server)
      .delete('/api/search-history')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({ success: true, deleted: 0 });
  });
});
