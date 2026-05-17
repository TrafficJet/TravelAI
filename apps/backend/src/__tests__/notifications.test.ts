/**
 * Notifications endpoints — unit tests
 * Stack: Jest + Supertest
 *
 * Prisma is mocked so the suite runs without a live database.
 * Run: npx jest --testPathPattern="notifications.test" --runInBand
 */

process.env.JWT_ACCESS_SECRET = 'test-access-secret-32chars!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32chars!!';

import Fastify, { FastifyInstance } from 'fastify';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { notificationsRoutes } from '../routes/notifications.routes';
import { registerErrorHandler } from '../plugins/error-handler.plugin';

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
const mockUpdateMany = jest.fn();
const mockDelete = jest.fn();

jest.mock('../lib/prisma', () => ({
  prisma: {
    notification: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const JWT_SECRET = 'test-access-secret-32chars!!';
const TEST_USER_ID = 'user-notif-test-uuid';
const OTHER_USER_ID = 'user-other-uuid';

function makeToken(userId = TEST_USER_ID): string {
  return jwt.sign({ sub: userId, email: 'test@example.com' }, JWT_SECRET, { expiresIn: '1h' });
}

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  registerErrorHandler(app);
  await app.register(notificationsRoutes, { prefix: '/api/notifications' });
  await app.ready();
  return app;
}

function makeNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: 'notif-uuid-1',
    userId: TEST_USER_ID,
    type: 'PRICE_ALERT',
    title: 'Цена снизилась',
    body: 'Цена на рейс SVO→IST упала до 12000 ₽',
    isRead: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ─── GET /api/notifications ───────────────────────────────────────────────────

describe('GET /api/notifications', () => {
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
    const res = await request(app.server).get('/api/notifications').expect(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 200 with paginated list of notifications (default limit=20)', async () => {
    const fakeNotifs = [makeNotification(), makeNotification({ id: 'notif-uuid-2', isRead: true })];
    mockFindMany.mockResolvedValueOnce(fakeNotifs);
    mockCount.mockResolvedValueOnce(2);

    const res = await request(app.server)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toMatchObject({ page: 1, pageSize: 20, total: 2, totalPages: 1 });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: TEST_USER_ID },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      }),
    );
  });

  it('returns 200 with limit=50 when explicitly requested', async () => {
    const fakeNotifs = [makeNotification()];
    mockFindMany.mockResolvedValueOnce(fakeNotifs);
    mockCount.mockResolvedValueOnce(1);

    const res = await request(app.server)
      .get('/api/notifications?limit=50')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.meta).toMatchObject({ pageSize: 50 });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 }),
    );
  });

  it('returns empty array when user has no notifications', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(0);

    const res = await request(app.server)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data).toEqual([]);
    expect(res.body.meta.total).toBe(0);
  });

  it('supports page query parameter (skips by limit)', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(60);

    const res = await request(app.server)
      .get('/api/notifications?page=2')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.meta.page).toBe(2);
    // default limit is 20, so page 2 skips 20
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 20 }),
    );
  });

  it('supports limit query parameter', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(100);

    await request(app.server)
      .get('/api/notifications?page=3&limit=10')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );
  });
});

// ─── GET /api/notifications/unread-count ─────────────────────────────────────

describe('GET /api/notifications/unread-count', () => {
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
    const res = await request(app.server).get('/api/notifications/unread-count').expect(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns count of unread notifications', async () => {
    mockCount.mockResolvedValueOnce(7);

    const res = await request(app.server)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.count).toBe(7);
    expect(mockCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: TEST_USER_ID, isRead: false } }),
    );
  });

  it('returns 0 when all notifications are read', async () => {
    mockCount.mockResolvedValueOnce(0);

    const res = await request(app.server)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.count).toBe(0);
  });
});

// ─── PATCH /api/notifications/:id/read ───────────────────────────────────────

describe('PATCH /api/notifications/:id/read', () => {
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
      .patch('/api/notifications/notif-uuid-1/read')
      .expect(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('marks notification as read and returns updated record', async () => {
    const notif = makeNotification();
    const updatedNotif = { ...notif, isRead: true };
    mockFindUnique.mockResolvedValueOnce(notif);
    mockUpdate.mockResolvedValueOnce(updatedNotif);

    const res = await request(app.server)
      .patch('/api/notifications/notif-uuid-1/read')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.notification.isRead).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'notif-uuid-1' },
      data: { isRead: true },
    });
  });

  it('returns 404 when notification does not exist', async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const res = await request(app.server)
      .patch('/api/notifications/nonexistent-id/read')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 403 when notification belongs to another user', async () => {
    const notif = makeNotification({ userId: OTHER_USER_ID });
    mockFindUnique.mockResolvedValueOnce(notif);

    const res = await request(app.server)
      .patch('/api/notifications/notif-uuid-1/read')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

// ─── PATCH /api/notifications/read-all ───────────────────────────────────────

describe('PATCH /api/notifications/read-all', () => {
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
    const res = await request(app.server).patch('/api/notifications/read-all').expect(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('marks all unread notifications as read', async () => {
    mockUpdateMany.mockResolvedValueOnce({ count: 5 });

    const res = await request(app.server)
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.updated).toBe(5);
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { userId: TEST_USER_ID, isRead: false },
      data: { isRead: true },
    });
  });

  it('returns 0 when there are no unread notifications', async () => {
    mockUpdateMany.mockResolvedValueOnce({ count: 0 });

    const res = await request(app.server)
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.updated).toBe(0);
  });
});

// ─── DELETE /api/notifications/:id ───────────────────────────────────────────

describe('DELETE /api/notifications/:id', () => {
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
    const res = await request(app.server).delete('/api/notifications/notif-uuid-1').expect(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('deletes notification and returns success', async () => {
    const notif = makeNotification();
    mockFindUnique.mockResolvedValueOnce(notif);
    mockDelete.mockResolvedValueOnce(notif);

    const res = await request(app.server)
      .delete('/api/notifications/notif-uuid-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({ success: true });
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'notif-uuid-1' } });
  });

  it('returns 404 when notification does not exist', async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const res = await request(app.server)
      .delete('/api/notifications/nonexistent-id')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 403 when notification belongs to another user', async () => {
    const notif = makeNotification({ userId: OTHER_USER_ID });
    mockFindUnique.mockResolvedValueOnce(notif);

    const res = await request(app.server)
      .delete('/api/notifications/notif-uuid-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
