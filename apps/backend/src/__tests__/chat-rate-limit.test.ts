/**
 * Chat per-minute rate limiter — unit tests
 * Stack: Jest + Supertest
 *
 * Tests the in-memory checkChatRateLimit middleware (30 msg/min per user).
 * Run: npx jest --testPathPattern="chat-rate-limit" --runInBand
 */

process.env.JWT_ACCESS_SECRET = 'test-access-secret-32chars!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32chars!!';

import Fastify, { FastifyInstance } from 'fastify';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { checkChatRateLimit, chatRateBuckets } from '../middleware/rateLimiter';
import { authenticate } from '../middleware/auth.middleware';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const JWT_SECRET = 'test-access-secret-32chars!!';
const TEST_USER_ID = 'user-rate-limit-uuid';
const OTHER_USER_ID = 'user-rate-limit-other-uuid';

function makeToken(userId = TEST_USER_ID): string {
  return jwt.sign({ sub: userId, email: 'test@example.com' }, JWT_SECRET, { expiresIn: '1h' });
}

// Build a minimal Fastify app with the rate-limit middleware attached
async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  app.post(
    '/test-endpoint',
    { preHandler: [authenticate, checkChatRateLimit] },
    async (_req, reply) => {
      reply.send({ ok: true });
    },
  );

  await app.ready();
  return app;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('checkChatRateLimit middleware', () => {
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
    // Reset buckets before each test to avoid cross-test pollution
    chatRateBuckets.clear();
  });

  it('allows the first request through (count = 1)', async () => {
    const res = await request(app.server)
      .post('/test-endpoint')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(chatRateBuckets.get(TEST_USER_ID)?.count).toBe(1);
  });

  it('allows up to 30 requests within the window', async () => {
    for (let i = 0; i < 30; i++) {
      await request(app.server)
        .post('/test-endpoint')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    }
    expect(chatRateBuckets.get(TEST_USER_ID)?.count).toBe(30);
  });

  it('returns 429 on the 31st request within the window', async () => {
    // Fill the bucket to exactly 30
    for (let i = 0; i < 30; i++) {
      await request(app.server)
        .post('/test-endpoint')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    }

    // 31st request should be rate-limited
    const res = await request(app.server)
      .post('/test-endpoint')
      .set('Authorization', `Bearer ${token}`)
      .expect(429);

    expect(res.body.error).toBe('Too many messages, please slow down');
  });

  it('tracks buckets independently per user', async () => {
    const otherToken = makeToken(OTHER_USER_ID);

    // Exhaust limit for test user
    for (let i = 0; i < 30; i++) {
      await request(app.server)
        .post('/test-endpoint')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    }
    await request(app.server)
      .post('/test-endpoint')
      .set('Authorization', `Bearer ${token}`)
      .expect(429);

    // Other user should still be allowed
    const res = await request(app.server)
      .post('/test-endpoint')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
  });

  it('resets the bucket after the time window expires', async () => {
    // Manually set a bucket with an expired resetAt
    chatRateBuckets.set(TEST_USER_ID, { count: 30, resetAt: Date.now() - 1 });

    // Next request should start a fresh window
    const res = await request(app.server)
      .post('/test-endpoint')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(chatRateBuckets.get(TEST_USER_ID)?.count).toBe(1);
  });
});
