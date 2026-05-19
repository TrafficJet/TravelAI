/**
 * Auth flow integration tests
 * Stack: Jest + Supertest
 *
 * Prerequisites (run before tests):
 *   DATABASE_URL pointing to a test database
 *   JWT_ACCESS_SECRET and JWT_REFRESH_SECRET set
 *
 * Run: npx jest --testPathPattern="auth.test" --runInBand
 */

import Fastify from 'fastify';
import request from 'supertest';
import { prisma } from '../lib/prisma';
import prismaPlugin from '../plugins/prisma.plugin';
import corsPlugin from '../plugins/cors.plugin';
import { authRoutes } from '../routes/auth.routes';
import { registerErrorHandler } from '../plugins/error-handler.plugin';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

async function buildTestApp() {
  const app = Fastify({ logger: false });
  await app.register(prismaPlugin);
  await app.register(corsPlugin);
  registerErrorHandler(app);
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.ready();
  return app;
}

const TEST_USER = {
  email: `qa-test-${Date.now()}@travel-ai.test`,
  password: 'Passw0rd_Test!',
  name: 'QA Tester',
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('Auth flow', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;

  beforeAll(async () => {
    // Ensure required env vars are present so jwt.ts does not blow up
    process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test-access-secret-32chars!!';
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-32chars!';

    app = await buildTestApp();
  });

  afterAll(async () => {
    // Clean up test user and all related rows (cascade handles wallet/subscription)
    await prisma.user.deleteMany({ where: { email: TEST_USER.email } });
    await app.close();
    await prisma.$disconnect();
  });

  // -------------------------------------------------------------------------
  // 1. Register
  // -------------------------------------------------------------------------

  describe('POST /api/auth/register', () => {
    it('creates user, wallet and subscription; returns 201 with tokens and user profile', async () => {
      const res = await request(app.server)
        .post('/api/auth/register')
        .send(TEST_USER)
        .expect(201);

      expect(res.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: {
          email: TEST_USER.email,
          name: TEST_USER.name,
          id: expect.any(String),
          createdAt: expect.any(String),
        },
      });

      // password must NOT be present in response
      expect(res.body.user.password).toBeUndefined();

      // Verify wallet and subscription were created in DB
      const dbUser = await prisma.user.findUnique({
        where: { email: TEST_USER.email },
        include: { wallet: true, subscription: true },
      });
      expect(dbUser?.wallet).toBeTruthy();
      expect(dbUser?.wallet?.currency).toBe('USD');
      expect(dbUser?.subscription?.plan).toBe('FREE');
      expect(dbUser?.subscription?.status).toBe('ACTIVE');
    });

    it('returns 409 when email is already registered', async () => {
      const res = await request(app.server)
        .post('/api/auth/register')
        .send(TEST_USER)
        .expect(409);

      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('returns 422 when password is shorter than 8 characters', async () => {
      const res = await request(app.server)
        .post('/api/auth/register')
        .send({ ...TEST_USER, email: 'short@pw.test', password: '1234567' })
        .expect(422);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // -------------------------------------------------------------------------
  // 2. Login
  // -------------------------------------------------------------------------

  describe('POST /api/auth/login', () => {
    it('returns 200 with tokens and user profile for valid credentials', async () => {
      const res = await request(app.server)
        .post('/api/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password })
        .expect(200);

      expect(res.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: { email: TEST_USER.email },
      });
    });

    it('returns 401 for wrong password', async () => {
      const res = await request(app.server)
        .post('/api/auth/login')
        .send({ email: TEST_USER.email, password: 'WrongPassword1!' })
        .expect(401);

      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 for unknown email', async () => {
      const res = await request(app.server)
        .post('/api/auth/login')
        .send({ email: 'nobody@nowhere.test', password: 'AnyPassword1' })
        .expect(401);

      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  // -------------------------------------------------------------------------
  // 3. Refresh token rotation
  // -------------------------------------------------------------------------

  describe('POST /api/auth/refresh', () => {
    let originalRefreshToken: string;
    let originalAccessToken: string;

    beforeAll(async () => {
      const res = await request(app.server)
        .post('/api/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password });
      originalRefreshToken = res.body.refreshToken;
      originalAccessToken = res.body.accessToken;
    });

    it('issues a NEW token pair and revokes the old refresh token', async () => {
      const res = await request(app.server)
        .post('/api/auth/refresh')
        .send({ refreshToken: originalRefreshToken })
        .expect(200);

      expect(res.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });

      // New tokens must differ from old ones
      expect(res.body.accessToken).not.toBe(originalAccessToken);
      expect(res.body.refreshToken).not.toBe(originalRefreshToken);

      // Old refresh token must be revoked in DB
      const revoked = await prisma.refreshToken.findFirst({
        where: { token: originalRefreshToken },
      });
      expect(revoked?.revoked).toBe(true);
    });

    it('returns 401 when reusing the already-rotated (revoked) refresh token', async () => {
      const res = await request(app.server)
        .post('/api/auth/refresh')
        .send({ refreshToken: originalRefreshToken })
        .expect(401);

      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 for a completely invalid token string', async () => {
      const res = await request(app.server)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'this.is.not.a.jwt' })
        .expect(401);

      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
