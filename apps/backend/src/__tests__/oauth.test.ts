/**
 * OAuth flow integration tests — Google & Apple
 *
 * Mock strategy:
 *   - google-auth-library is mocked via jest.mock so no real HTTP is made
 *   - For Apple we operate in test-mode (NODE_ENV=test) — jwt.decode is used
 *     instead of real JWKS verification
 *   - Both flows use pre-built JWTs signed with a known secret so jwt.decode
 *     returns a real payload object
 */

// Set env vars BEFORE any module import so jwt.ts does not throw on startup
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test-access-secret-32chars!!';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-32chars!';

// ---------------------------------------------------------------------------
// Mock jwks-rsa (uses jose/ESM internally — not compatible with ts-jest CJS)
// ---------------------------------------------------------------------------

jest.mock('jwks-rsa', () => {
  const mockGetSigningKey = jest.fn((_kid: string, cb: (err: Error | null, key: { getPublicKey: () => string } | null) => void) => {
    cb(null, { getPublicKey: () => 'mock-public-key' });
  });
  const mockClient = jest.fn(() => ({ getSigningKey: mockGetSigningKey }));
  return mockClient;
});

// ---------------------------------------------------------------------------
// Mock google-auth-library
// ---------------------------------------------------------------------------

interface GoogleMockPayload {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

const GOOGLE_PAYLOAD_DEFAULT: GoogleMockPayload = {
  sub: 'google-user-001',
  email: 'google-user@gmail.com',
  name: 'Google User',
  picture: 'https://example.com/pic.jpg',
};

// Mutable reference so individual tests can override the payload
let mockGooglePayload: GoogleMockPayload = { ...GOOGLE_PAYLOAD_DEFAULT };
let mockGoogleShouldFail = false;

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn().mockImplementation(() => {
      if (mockGoogleShouldFail) {
        return Promise.reject(new Error('Invalid token signature'));
      }
      return Promise.resolve({
        getPayload: () => ({ ...mockGooglePayload }),
      });
    }),
  })),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks are registered)
// ---------------------------------------------------------------------------

import Fastify from 'fastify';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import prismaPlugin from '../plugins/prisma.plugin';
import corsPlugin from '../plugins/cors.plugin';
import { authRoutes } from '../routes/auth.routes';
import { registerErrorHandler } from '../plugins/error-handler.plugin';

// ---------------------------------------------------------------------------
// App factory
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

// ---------------------------------------------------------------------------
// Token factories
// ---------------------------------------------------------------------------

// Build a minimal Google-style ID token that jwt.decode will parse in test mode
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeGoogleIdToken(payload: any): string {
  // In test mode oauth.handler uses jwt.decode (no verification), so any
  // signing secret works — we just need a valid JWT structure
  return jwt.sign(payload as object, 'test-signing-secret');
}

// Build a minimal Apple-style identity token
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeAppleIdentityToken(payload: any): string {
  return jwt.sign(payload as object, 'test-signing-secret');
}

// ---------------------------------------------------------------------------
// Cleanup helpers
// ---------------------------------------------------------------------------

const createdEmails: string[] = [];

async function cleanupEmails(emails: string[]) {
  if (emails.length > 0) {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  }
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('OAuth flow', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await cleanupEmails(createdEmails);
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(() => {
    // Reset Google mock state before each test
    mockGooglePayload = { ...GOOGLE_PAYLOAD_DEFAULT };
    mockGoogleShouldFail = false;
  });

  // =========================================================================
  // Google
  // =========================================================================

  describe('POST /api/auth/google', () => {
    it('returns 200 with accessToken for a valid mock token (new user)', async () => {
      const email = `google-new-${Date.now()}@gmail.com`;
      mockGooglePayload = { sub: `g-sub-new-${Date.now()}`, email, name: 'New Google User' };
      createdEmails.push(email);

      const idToken = makeGoogleIdToken(mockGooglePayload);

      const res = await request(app.server)
        .post('/api/auth/google')
        .send({ idToken })
        .expect(200);

      expect(res.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: {
          email,
          id: expect.any(String),
        },
      });
      // password must NOT be in response
      expect(res.body.user.password).toBeUndefined();
    });

    it('returns 401 for a structurally invalid (non-JWT) token', async () => {
      const res = await request(app.server)
        .post('/api/auth/google')
        .send({ idToken: 'not.a.valid.jwt.at.all.extra' })
        .expect(401);

      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 for a token with missing required fields (no sub)', async () => {
      // JWT that decodes fine but has no "sub" field
      const badToken = makeGoogleIdToken({ email: 'no-sub@gmail.com', name: 'No Sub' });

      const res = await request(app.server)
        .post('/api/auth/google')
        .send({ idToken: badToken })
        .expect(401);

      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('does NOT duplicate a user on second login with same Google userId', async () => {
      const email = `google-dedup-${Date.now()}@gmail.com`;
      const sub = `g-sub-dedup-${Date.now()}`;
      mockGooglePayload = { sub, email, name: 'Dedup User' };
      createdEmails.push(email);

      const idToken = makeGoogleIdToken(mockGooglePayload);

      // First login
      const res1 = await request(app.server)
        .post('/api/auth/google')
        .send({ idToken })
        .expect(200);

      // Second login — same token payload
      const res2 = await request(app.server)
        .post('/api/auth/google')
        .send({ idToken })
        .expect(200);

      // Both responses must reference the same user id
      expect(res1.body.user.id).toBe(res2.body.user.id);

      // Only one user record should exist in DB
      const count = await prisma.user.count({ where: { email } });
      expect(count).toBe(1);
    });

    it('links Google to an existing email-registered account (no duplicate)', async () => {
      const email = `google-link-${Date.now()}@gmail.com`;
      createdEmails.push(email);

      // Pre-create a user via normal registration
      const regRes = await request(app.server)
        .post('/api/auth/register')
        .send({ email, password: 'Password123!', name: 'Link User' })
        .expect(201);

      const originalId = regRes.body.user.id;

      // Now OAuth login with same email
      const sub = `g-sub-link-${Date.now()}`;
      mockGooglePayload = { sub, email, name: 'Link User' };
      const idToken = makeGoogleIdToken(mockGooglePayload);

      const oauthRes = await request(app.server)
        .post('/api/auth/google')
        .send({ idToken })
        .expect(200);

      // Must return the same user id (linked, not duplicated)
      expect(oauthRes.body.user.id).toBe(originalId);

      const count = await prisma.user.count({ where: { email } });
      expect(count).toBe(1);
    });

    it('creates wallet and subscription for new OAuth user', async () => {
      const email = `google-wallet-${Date.now()}@gmail.com`;
      const sub = `g-sub-wallet-${Date.now()}`;
      mockGooglePayload = { sub, email, name: 'Wallet User' };
      createdEmails.push(email);

      const idToken = makeGoogleIdToken(mockGooglePayload);

      await request(app.server).post('/api/auth/google').send({ idToken }).expect(200);

      const dbUser = await prisma.user.findUnique({
        where: { email },
        include: { wallet: true, subscription: true },
      });
      expect(dbUser?.wallet).toBeTruthy();
      expect(dbUser?.subscription?.plan).toBe('FREE');
    });
  });

  // =========================================================================
  // Apple
  // =========================================================================

  describe('POST /api/auth/apple', () => {
    it('returns 200 with accessToken for a valid mock token (new user)', async () => {
      const email = `apple-new-${Date.now()}@privaterelay.appleid.com`;
      const sub = `apple-sub-new-${Date.now()}`;
      createdEmails.push(email);

      const identityToken = makeAppleIdentityToken({ sub, email });

      const res = await request(app.server)
        .post('/api/auth/apple')
        .send({ identityToken })
        .expect(200);

      expect(res.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: {
          email,
          id: expect.any(String),
        },
      });
      expect(res.body.user.password).toBeUndefined();
    });

    it('returns 401 for a structurally invalid (non-JWT) token', async () => {
      const res = await request(app.server)
        .post('/api/auth/apple')
        .send({ identityToken: 'garbage.token.here.extra' })
        .expect(401);

      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 for token with missing sub', async () => {
      const badToken = makeAppleIdentityToken({ email: 'no-sub-apple@test.com' });

      const res = await request(app.server)
        .post('/api/auth/apple')
        .send({ identityToken: badToken })
        .expect(401);

      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('does NOT duplicate a user on second login with same Apple userId', async () => {
      const email = `apple-dedup-${Date.now()}@privaterelay.appleid.com`;
      const sub = `apple-sub-dedup-${Date.now()}`;
      createdEmails.push(email);

      const identityToken = makeAppleIdentityToken({ sub, email });

      const res1 = await request(app.server)
        .post('/api/auth/apple')
        .send({ identityToken })
        .expect(200);

      const res2 = await request(app.server)
        .post('/api/auth/apple')
        .send({ identityToken })
        .expect(200);

      expect(res1.body.user.id).toBe(res2.body.user.id);

      const count = await prisma.user.count({ where: { email } });
      expect(count).toBe(1);
    });

    it('links Apple to an existing email-registered account', async () => {
      const email = `apple-link-${Date.now()}@gmail.com`;
      createdEmails.push(email);

      // Pre-create via normal registration
      const regRes = await request(app.server)
        .post('/api/auth/register')
        .send({ email, password: 'Password123!', name: 'Apple Link User' })
        .expect(201);

      const originalId = regRes.body.user.id;

      const sub = `apple-sub-link-${Date.now()}`;
      const identityToken = makeAppleIdentityToken({ sub, email });

      const oauthRes = await request(app.server)
        .post('/api/auth/apple')
        .send({ identityToken })
        .expect(200);

      expect(oauthRes.body.user.id).toBe(originalId);

      const count = await prisma.user.count({ where: { email } });
      expect(count).toBe(1);
    });

    it('uses name from user field when not in token', async () => {
      const sub = `apple-sub-name-${Date.now()}`;
      const email = `apple-name-${Date.now()}@privaterelay.appleid.com`;
      createdEmails.push(email);

      // Token has no email — pass it via user field
      const identityToken = makeAppleIdentityToken({ sub });

      const res = await request(app.server)
        .post('/api/auth/apple')
        .send({
          identityToken,
          user: { name: 'Apple Named User', email },
        })
        .expect(200);

      expect(res.body.user.name).toBe('Apple Named User');
    });
  });

  // =========================================================================
  // Login blocked for OAuth-only accounts
  // =========================================================================

  describe('POST /api/auth/login — OAuth account protection', () => {
    it('returns 400 when trying email/password login on a Google-only account', async () => {
      const email = `google-only-${Date.now()}@gmail.com`;
      const sub = `g-sub-only-${Date.now()}`;
      mockGooglePayload = { sub, email, name: 'Google Only' };
      createdEmails.push(email);

      const idToken = makeGoogleIdToken(mockGooglePayload);

      // Create OAuth-only account
      await request(app.server).post('/api/auth/google').send({ idToken }).expect(200);

      // Attempt password login — must fail with 400
      const res = await request(app.server)
        .post('/api/auth/login')
        .send({ email, password: 'AnyPassword1!' })
        .expect(400);

      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(res.body.error.message).toMatch(/Google\/Apple/i);
    });
  });
});
