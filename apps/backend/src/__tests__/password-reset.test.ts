/**
 * Password reset flow — integration tests
 * Uses jsonTransport stub so no real SMTP is needed.
 */

import Fastify from 'fastify';
import request from 'supertest';
import { prisma } from '../lib/prisma';
import prismaPlugin from '../plugins/prisma.plugin';
import corsPlugin from '../plugins/cors.plugin';
import { authRoutes } from '../routes/auth.routes';
import { registerErrorHandler } from '../plugins/error-handler.plugin';

// Ensure email stub is used (no SMTP_HOST in test env)
delete process.env.SMTP_HOST;

async function buildTestApp() {
  const app = Fastify({ logger: false });
  await app.register(prismaPlugin);
  await app.register(corsPlugin);
  registerErrorHandler(app);
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.ready();
  return app;
}

const TEST_EMAIL = `pw-reset-${Date.now()}@travel-ai.test`;
const TEST_PASSWORD = 'OldPass123!';
const TEST_NAME = 'Reset Tester';

describe('Password reset flow', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let userId: string;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test-access-secret-32chars!!';
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-32chars!';

    app = await buildTestApp();

    // Register a test user
    const res = await request(app.server)
      .post('/api/auth/register')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME });

    userId = res.body.user?.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
    await app.close();
    await prisma.$disconnect();
  });

  // -------------------------------------------------------------------------
  // forgot-password
  // -------------------------------------------------------------------------

  describe('POST /api/auth/forgot-password', () => {
    it('returns 200 for a non-existent email without revealing its absence', async () => {
      const res = await request(app.server)
        .post('/api/auth/forgot-password')
        .send({ email: 'nobody-for-real@nowhere.test' })
        .expect(200);

      expect(res.body.message).toMatch(/письмо отправлено/i);
    });

    it('returns 200 for an existing email and creates a reset token in DB', async () => {
      const res = await request(app.server)
        .post('/api/auth/forgot-password')
        .send({ email: TEST_EMAIL })
        .expect(200);

      expect(res.body.message).toMatch(/письмо отправлено/i);

      // Verify token was persisted
      const token = await prisma.passwordResetToken.findFirst({
        where: { userId, used: false },
        orderBy: { createdAt: 'desc' },
      });
      expect(token).not.toBeNull();
      expect(token?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  // -------------------------------------------------------------------------
  // reset-password
  // -------------------------------------------------------------------------

  describe('POST /api/auth/reset-password', () => {
    it('returns 400 for an invalid (non-existent) token', async () => {
      const res = await request(app.server)
        .post('/api/auth/reset-password')
        .send({ token: 'totally-invalid-token-xyz', newPassword: 'NewPass456!' })
        .expect(400);

      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('returns 200 and changes the password with a valid token', async () => {
      // Create a fresh reset token directly in DB
      const rawToken = require('crypto').randomBytes(32).toString('hex');
      await prisma.passwordResetToken.create({
        data: {
          userId,
          token: rawToken,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const res = await request(app.server)
        .post('/api/auth/reset-password')
        .send({ token: rawToken, newPassword: 'BrandNew789!' })
        .expect(200);

      expect(res.body.message).toMatch(/обновлён/i);

      // Confirm the new password works
      const loginRes = await request(app.server)
        .post('/api/auth/login')
        .send({ email: TEST_EMAIL, password: 'BrandNew789!' })
        .expect(200);

      expect(loginRes.body.accessToken).toBeDefined();
    });

    it('returns 400 when reusing an already-used token', async () => {
      // Retrieve the token we just used (it should be marked used=true)
      const usedToken = await prisma.passwordResetToken.findFirst({
        where: { userId, used: true },
        orderBy: { createdAt: 'desc' },
      });

      expect(usedToken).not.toBeNull();

      const res = await request(app.server)
        .post('/api/auth/reset-password')
        .send({ token: usedToken!.token, newPassword: 'AnotherPass000!' })
        .expect(400);

      expect(res.body.error.code).toBe('BAD_REQUEST');
    });
  });
});
