/**
 * Favorites endpoints — unit tests
 * Stack: Jest + Supertest
 *
 * Prisma is mocked so the suite runs without a live database.
 * Run: npx jest --testPathPattern="favorites.test" --runInBand
 */

process.env.JWT_ACCESS_SECRET = 'test-access-secret-32chars!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32chars!!';

import Fastify, { FastifyInstance } from 'fastify';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { favoritesRoutes } from '../routes/favorites.routes';
import { registerErrorHandler } from '../plugins/error-handler.plugin';

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockCreate = jest.fn();
const mockDelete = jest.fn();

jest.mock('../lib/prisma', () => ({
  prisma: {
    favorite: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const JWT_SECRET = 'test-access-secret-32chars!!';
const TEST_USER_ID = 'user-fav-test-uuid';
const OTHER_USER_ID = 'user-other-uuid';

function makeToken(userId = TEST_USER_ID): string {
  return jwt.sign({ sub: userId, email: 'test@example.com' }, JWT_SECRET, { expiresIn: '1h' });
}

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  registerErrorHandler(app);
  await app.register(favoritesRoutes, { prefix: '/api/users/me/favorites' });
  await app.ready();
  return app;
}

function makeFavorite(overrides: Record<string, unknown> = {}) {
  return {
    id: 'fav-uuid-1',
    userId: TEST_USER_ID,
    type: 'hotel',
    itemId: 'hotel-123',
    itemData: { name: 'Grand Hotel', price: 5000 },
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ─── GET /api/users/me/favorites ─────────────────────────────────────────────

describe('GET /api/users/me/favorites', () => {
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
      .get('/api/users/me/favorites')
      .expect(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 200 with list of all favorites', async () => {
    const fakeFavs = [makeFavorite(), makeFavorite({ id: 'fav-uuid-2', type: 'flight', itemId: 'flight-456' })];
    mockFindMany.mockResolvedValueOnce(fakeFavs);

    const res = await request(app.server)
      .get('/api/users/me/favorites')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.favorites).toHaveLength(2);
    expect(res.body.total).toBe(2);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: TEST_USER_ID },
      }),
    );
  });

  it('filters favorites by type=hotel', async () => {
    const hotelFav = makeFavorite();
    mockFindMany.mockResolvedValueOnce([hotelFav]);

    const res = await request(app.server)
      .get('/api/users/me/favorites?type=hotel')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.favorites).toHaveLength(1);
    expect(res.body.favorites[0].type).toBe('hotel');
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: TEST_USER_ID, type: 'hotel' },
      }),
    );
  });

  it('filters favorites by type=flight', async () => {
    const flightFav = makeFavorite({ type: 'flight', itemId: 'flight-789' });
    mockFindMany.mockResolvedValueOnce([flightFav]);

    const res = await request(app.server)
      .get('/api/users/me/favorites?type=flight')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.favorites).toHaveLength(1);
    expect(res.body.favorites[0].type).toBe('flight');
  });

  it('returns empty array when user has no favorites', async () => {
    mockFindMany.mockResolvedValueOnce([]);

    const res = await request(app.server)
      .get('/api/users/me/favorites')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.favorites).toEqual([]);
    expect(res.body.total).toBe(0);
  });
});

// ─── POST /api/users/me/favorites ────────────────────────────────────────────

describe('POST /api/users/me/favorites', () => {
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
      .post('/api/users/me/favorites')
      .send({ type: 'hotel', itemId: 'hotel-123', itemData: {} })
      .expect(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('adds a hotel to favorites and returns 201', async () => {
    const newFav = makeFavorite();
    mockFindUnique.mockResolvedValueOnce(null); // не существует — можно добавить
    mockCreate.mockResolvedValueOnce(newFav);

    const res = await request(app.server)
      .post('/api/users/me/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'hotel', itemId: 'hotel-123', itemData: { name: 'Grand Hotel' } })
      .expect(201);

    expect(res.body.favorite).toMatchObject({
      id: 'fav-uuid-1',
      type: 'hotel',
      itemId: 'hotel-123',
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: TEST_USER_ID,
          type: 'hotel',
          itemId: 'hotel-123',
        }),
      }),
    );
  });

  it('adds a flight to favorites and returns 201', async () => {
    const newFav = makeFavorite({ type: 'flight', itemId: 'flight-456' });
    mockFindUnique.mockResolvedValueOnce(null);
    mockCreate.mockResolvedValueOnce(newFav);

    const res = await request(app.server)
      .post('/api/users/me/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'flight', itemId: 'flight-456', itemData: { airline: 'Аэрофлот' } })
      .expect(201);

    expect(res.body.favorite.type).toBe('flight');
  });

  it('returns 409 Conflict when favorite already exists (no duplicates)', async () => {
    const existingFav = makeFavorite();
    mockFindUnique.mockResolvedValueOnce(existingFav); // уже существует

    const res = await request(app.server)
      .post('/api/users/me/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'hotel', itemId: 'hotel-123', itemData: {} })
      .expect(409);

    expect(res.body.error.code).toBe('CONFLICT');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 4xx when required fields are missing', async () => {
    const res = await request(app.server)
      .post('/api/users/me/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'hotel' }); // itemId и itemData отсутствуют

    expect([400, 422]).toContain(res.status);
  });
});

// ─── DELETE /api/users/me/favorites/:itemId ───────────────────────────────────

describe('DELETE /api/users/me/favorites/:itemId', () => {
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
      .delete('/api/users/me/favorites/hotel-123?type=hotel')
      .expect(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('deletes favorite and returns { success: true }', async () => {
    const fav = makeFavorite();
    mockFindUnique.mockResolvedValueOnce(fav);
    mockDelete.mockResolvedValueOnce(fav);

    const res = await request(app.server)
      .delete('/api/users/me/favorites/hotel-123?type=hotel')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({ success: true });
    expect(mockDelete).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_type_itemId: { userId: TEST_USER_ID, type: 'hotel', itemId: 'hotel-123' } },
      }),
    );
  });

  it('returns 404 when favorite does not exist', async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const res = await request(app.server)
      .delete('/api/users/me/favorites/nonexistent?type=hotel')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('cannot delete another user\'s favorite (403 Forbidden)', async () => {
    const fav = makeFavorite({ userId: OTHER_USER_ID });
    mockFindUnique.mockResolvedValueOnce(fav);

    const res = await request(app.server)
      .delete('/api/users/me/favorites/hotel-123?type=hotel')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(mockDelete).not.toHaveBeenCalled();
  });
});

// ─── GET /api/users/me/favorites/check/:itemId ───────────────────────────────

describe('GET /api/users/me/favorites/check/:itemId', () => {
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
      .get('/api/users/me/favorites/check/hotel-123?type=hotel')
      .expect(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns { isFavorite: true } when item is in favorites', async () => {
    const fav = makeFavorite();
    mockFindUnique.mockResolvedValueOnce(fav);

    const res = await request(app.server)
      .get('/api/users/me/favorites/check/hotel-123?type=hotel')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({ isFavorite: true });
    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_type_itemId: { userId: TEST_USER_ID, type: 'hotel', itemId: 'hotel-123' } },
      }),
    );
  });

  it('returns { isFavorite: false } when item is NOT in favorites', async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const res = await request(app.server)
      .get('/api/users/me/favorites/check/hotel-999?type=hotel')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({ isFavorite: false });
  });

  it('returns { isFavorite: false } for a flight not in favorites', async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const res = await request(app.server)
      .get('/api/users/me/favorites/check/flight-xyz?type=flight')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.isFavorite).toBe(false);
  });

  it('cannot see another user\'s favorites — always returns own data', async () => {
    // The check endpoint filters by authenticated userId, so other users' data is invisible
    mockFindUnique.mockResolvedValueOnce(null); // not found for THIS user

    const res = await request(app.server)
      .get('/api/users/me/favorites/check/hotel-123?type=hotel')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Even if another user has this hotel, the query filters by userId
    expect(res.body.isFavorite).toBe(false);
    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId_type_itemId: expect.objectContaining({ userId: TEST_USER_ID }),
        }),
      }),
    );
  });
});
