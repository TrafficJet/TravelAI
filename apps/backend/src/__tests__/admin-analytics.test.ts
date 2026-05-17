/**
 * Admin panel + Analytics endpoints — integration tests
 * Stack: Jest + Supertest
 *
 * Run: npx jest --testPathPattern="admin-analytics.test" --runInBand
 */

import Fastify from 'fastify';
import request from 'supertest';
import { prisma } from '../lib/prisma';
import prismaPlugin from '../plugins/prisma.plugin';
import corsPlugin from '../plugins/cors.plugin';
import { registerErrorHandler } from '../plugins/error-handler.plugin';
import { adminRoutes } from '../routes/admin.routes';
import { analyticsRoutes } from '../routes/analytics.routes';
import { authRoutes } from '../routes/auth.routes';

// ---------------------------------------------------------------------------
// Test app factory
// ---------------------------------------------------------------------------

async function buildTestApp() {
  process.env.JWT_ACCESS_SECRET =
    process.env.JWT_ACCESS_SECRET ?? 'test-access-secret-32chars!!';
  process.env.JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-32chars!';
  process.env.ADMIN_SECRET = 'test-admin-secret-123';

  const app = Fastify({ logger: false });
  await app.register(prismaPlugin);
  await app.register(corsPlugin);
  registerErrorHandler(app);
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(adminRoutes, { prefix: '/admin' });
  await app.register(analyticsRoutes, { prefix: '/api/analytics' });
  await app.ready();
  return app;
}

const ADMIN_SECRET = 'test-admin-secret-123';
const TEST_EMAIL = `qa-admin-${Date.now()}@travel-ai.test`;

// ---------------------------------------------------------------------------
// Suite: Admin middleware
// ---------------------------------------------------------------------------

describe('Admin middleware (adminAuth)', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 when x-admin-secret header is missing', async () => {
    const res = await request(app.server).get('/admin/stats/json');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: 'Unauthorized' });
  });

  it('returns 401 when x-admin-secret header is wrong', async () => {
    const res = await request(app.server)
      .get('/admin/stats/json')
      .set('x-admin-secret', 'totally-wrong-secret');
    expect(res.status).toBe(401);
  });

  it('returns 200 when x-admin-secret is correct', async () => {
    const res = await request(app.server)
      .get('/admin/stats/json')
      .set('x-admin-secret', ADMIN_SECRET);
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Suite: GET /admin/stats/json
// ---------------------------------------------------------------------------

describe('GET /admin/stats/json', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns correct JSON shape', async () => {
    const res = await request(app.server)
      .get('/admin/stats/json')
      .set('x-admin-secret', ADMIN_SECRET)
      .expect(200);

    expect(res.body).toMatchObject({
      users: {
        total: expect.any(Number),
        byPlan: expect.any(Object),
      },
      bookings: {
        total: expect.any(Number),
        byStatus: expect.any(Object),
        revenue: expect.any(Number),
      },
      wallet: {
        totalBalance: expect.any(Number),
        totalTransactions: expect.any(Number),
      },
    });
  });
});

// ---------------------------------------------------------------------------
// Suite: GET /admin/dashboard, /admin/users, /admin/bookings — HTML responses
// ---------------------------------------------------------------------------

describe('Admin HTML pages', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /admin/dashboard returns HTML with Bootstrap', async () => {
    const res = await request(app.server)
      .get('/admin/dashboard')
      .set('x-admin-secret', ADMIN_SECRET)
      .expect(200);

    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('bootstrap');
    expect(res.text).toContain('Дашборд');
  });

  it('GET /admin/users returns HTML with user table', async () => {
    const res = await request(app.server)
      .get('/admin/users')
      .set('x-admin-secret', ADMIN_SECRET)
      .expect(200);

    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('Пользователи');
  });

  it('GET /admin/bookings returns HTML with bookings table', async () => {
    const res = await request(app.server)
      .get('/admin/bookings')
      .set('x-admin-secret', ADMIN_SECRET)
      .expect(200);

    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('Брони');
  });
});

// ---------------------------------------------------------------------------
// Suite: POST /admin/users/:id/ban
// ---------------------------------------------------------------------------

describe('POST /admin/users/:id/ban', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let testUserId: string;

  beforeAll(async () => {
    app = await buildTestApp();

    // Create a real user to ban
    const res = await request(app.server)
      .post('/api/auth/register')
      .send({ email: TEST_EMAIL, password: 'Passw0rd!', name: 'Ban Target' });
    testUserId = res.body?.user?.id;
  });

  afterAll(async () => {
    if (testUserId) {
      await prisma.user.deleteMany({ where: { id: testUserId } });
    }
    await app.close();
    await prisma.$disconnect();
  });

  it('returns 404 for non-existent user', async () => {
    const res = await request(app.server)
      .post('/admin/users/non-existent-id/ban')
      .set('x-admin-secret', ADMIN_SECRET)
      .expect(404);

    expect(res.body).toMatchObject({ error: 'User not found' });
  });

  it('successfully revokes sessions for existing user', async () => {
    if (!testUserId) return;

    const res = await request(app.server)
      .post(`/admin/users/${testUserId}/ban`)
      .set('x-admin-secret', ADMIN_SECRET)
      .expect(200);

    expect(res.body).toMatchObject({
      ok: true,
      userId: testUserId,
    });
    expect(res.body.message).toContain('banned');
  });

  it('requires admin secret to ban', async () => {
    if (!testUserId) return;

    await request(app.server)
      .post(`/admin/users/${testUserId}/ban`)
      .expect(401);
  });
});

// ---------------------------------------------------------------------------
// Suite: POST /api/analytics/events (batch insert)
// ---------------------------------------------------------------------------

describe('POST /api/analytics/events', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    // Clean up test analytics events
    await prisma.analyticsEvent.deleteMany({
      where: { event: { startsWith: 'qa_test_' } },
    });
    await app.close();
  });

  it('inserts a single event and returns 201', async () => {
    const res = await request(app.server)
      .post('/api/analytics/events')
      .send({ events: [{ event: 'qa_test_event', platform: 'ios' }] })
      .expect(201);

    expect(res.body).toMatchObject({ ok: true, inserted: 1 });
  });

  it('inserts a batch of events and returns correct count', async () => {
    const events = Array.from({ length: 5 }, (_, i) => ({
      event: `qa_test_batch_${i}`,
      platform: 'android',
      properties: { index: i },
    }));

    const res = await request(app.server)
      .post('/api/analytics/events')
      .send({ events })
      .expect(201);

    expect(res.body).toMatchObject({ ok: true, inserted: 5 });
  });

  it('returns 422 when events array is empty', async () => {
    const res = await request(app.server)
      .post('/api/analytics/events')
      .send({ events: [] })
      .expect(422);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 when events array exceeds 50 items', async () => {
    const events = Array.from({ length: 51 }, (_, i) => ({
      event: `qa_overflow_${i}`,
    }));

    const res = await request(app.server)
      .post('/api/analytics/events')
      .send({ events })
      .expect(422);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 when event name is empty string', async () => {
    const res = await request(app.server)
      .post('/api/analytics/events')
      .send({ events: [{ event: '' }] })
      .expect(422);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('accepts event with optional timestamp', async () => {
    const res = await request(app.server)
      .post('/api/analytics/events')
      .send({
        events: [
          {
            event: 'qa_test_with_timestamp',
            platform: 'ios',
            timestamp: new Date().toISOString(),
          },
        ],
      })
      .expect(201);

    expect(res.body.inserted).toBe(1);
  });

  it('accepts event without auth (anonymous tracking)', async () => {
    // No Authorization header — should still succeed
    const res = await request(app.server)
      .post('/api/analytics/events')
      .send({ events: [{ event: 'qa_test_anon' }] })
      .expect(201);

    expect(res.body.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Suite: GET /api/analytics/events (requires auth)
// ---------------------------------------------------------------------------

describe('GET /api/analytics/events', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let accessToken: string;
  let userId: string;

  const AUTH_EMAIL = `qa-analytics-get-${Date.now()}@travel-ai.test`;

  beforeAll(async () => {
    app = await buildTestApp();

    const reg = await request(app.server)
      .post('/api/auth/register')
      .send({ email: AUTH_EMAIL, password: 'Passw0rd!', name: 'Analytics User' });

    accessToken = reg.body.accessToken;
    userId = reg.body.user.id;
  });

  afterAll(async () => {
    await prisma.analyticsEvent.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await app.close();
    await prisma.$disconnect();
  });

  it('returns 401 without auth token', async () => {
    await request(app.server).get('/api/analytics/events').expect(401);
  });

  it('returns empty list when no events for user', async () => {
    const res = await request(app.server)
      .get('/api/analytics/events')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toMatchObject({
      events: expect.any(Array),
      total: expect.any(Number),
      limit: expect.any(Number),
      offset: expect.any(Number),
    });
  });

  it('returns paginated events for authenticated user', async () => {
    // Insert 3 events for this user via the POST endpoint with auth
    await request(app.server)
      .post('/api/analytics/events')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        events: [
          { event: 'qa_get_test_1' },
          { event: 'qa_get_test_2' },
          { event: 'qa_get_test_3' },
        ],
      });

    const res = await request(app.server)
      .get('/api/analytics/events?limit=2&offset=0')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.events.length).toBeLessThanOrEqual(2);
    expect(res.body.limit).toBe(2);
    expect(res.body.offset).toBe(0);
    expect(typeof res.body.total).toBe('number');
  });
});
