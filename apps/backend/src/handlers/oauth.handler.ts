import { FastifyRequest, FastifyReply } from 'fastify';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
import { prisma } from '../lib/prisma';
import { signAccessToken, signRefreshToken, getRefreshExpiresAt } from '../lib/jwt';
import { Errors, AppError } from '../lib/errors';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Generate token pair and persist refresh token in DB
async function generateTokenPair(userId: string, email: string) {
  const jti = uuidv4();
  const accessToken = signAccessToken({ sub: userId, email });
  const refreshToken = signRefreshToken({ sub: userId, jti });

  await prisma.refreshToken.create({
    data: {
      id: jti,
      token: refreshToken,
      userId,
      expiresAt: getRefreshExpiresAt(),
    },
  });

  return { accessToken, refreshToken };
}

// Build user profile DTO — no password field in response
function buildUserProfile(user: { id: string; email: string; name: string; phone: string | null; createdAt: Date }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    createdAt: user.createdAt.toISOString(),
  };
}

// Ensure the user has a wallet and subscription (idempotent)
async function ensureWalletAndSubscription(userId: string) {
  const [wallet, subscription] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId } }),
    prisma.subscription.findUnique({ where: { userId } }),
  ]);

  const ops: Promise<unknown>[] = [];
  if (!wallet) {
    ops.push(prisma.wallet.create({ data: { userId, balance: 0, currency: 'RUB' } }));
  }
  if (!subscription) {
    ops.push(prisma.subscription.create({ data: { userId, plan: 'FREE', status: 'ACTIVE' } }));
  }
  if (ops.length > 0) {
    await Promise.all(ops);
  }
}

// Determine if we are running in test mode without real OAuth credentials
function isTestMode(): boolean {
  if (process.env.NODE_ENV === 'test') return true;
  if (!process.env.GOOGLE_CLIENT_ID) {
    // In production, missing credentials is a configuration error
    if (process.env.NODE_ENV === 'production') {
      throw Errors.internal('GOOGLE_CLIENT_ID не задан — OAuth недоступен');
    }
    // In development, allow mock tokens for local testing
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Google OAuth payload shape
// ---------------------------------------------------------------------------
interface GooglePayload {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

// ---------------------------------------------------------------------------
// POST /api/auth/google
// Body: { idToken: string }
// Verifies a Google ID token and returns JWT tokens for the user.
// ---------------------------------------------------------------------------
export async function googleAuth(request: FastifyRequest, reply: FastifyReply) {
  const { idToken } = request.body as { idToken: string };

  if (!idToken) {
    throw Errors.badRequest('idToken обязателен');
  }

  let payload: GooglePayload;

  if (isTestMode()) {
    // In test/dev mode — decode without verifying signature to allow mock tokens
    const decoded = jwt.decode(idToken) as GooglePayload | null;
    if (!decoded || !decoded.sub || !decoded.email) {
      throw Errors.unauthorized('Невалидный Google ID token');
    }
    payload = decoded;
  } else {
    // Production — verify with Google's public keys
    try {
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const raw = ticket.getPayload();
      if (!raw || !raw.sub || !raw.email) {
        throw Errors.unauthorized('Невалидный Google ID token');
      }
      payload = { sub: raw.sub, email: raw.email, name: raw.name, picture: raw.picture };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw Errors.unauthorized('Невалидный Google ID token');
    }
  }

  const { sub: googleId, email, name } = payload;

  // 1. Search by provider + providerId
  let user = await prisma.user.findFirst({
    where: { provider: 'google', providerId: googleId },
  });

  // 2. No Google record — try to find by email (existing email-registered user)
  if (!user) {
    const emailUser = await prisma.user.findUnique({ where: { email } });
    if (emailUser) {
      // Link Google account to existing user
      user = await prisma.user.update({
        where: { id: emailUser.id },
        data: { provider: 'google', providerId: googleId },
      });
    }
  }

  // 3. Brand new user — create with no password
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: name ?? email.split('@')[0],
        password: null,
        provider: 'google',
        providerId: googleId,
      },
    });
  }

  await ensureWalletAndSubscription(user.id);
  const tokens = await generateTokenPair(user.id, user.email);

  return reply.send({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: buildUserProfile(user),
  });
}

// ---------------------------------------------------------------------------
// Apple OAuth payload shape
// ---------------------------------------------------------------------------
interface ApplePayload {
  sub: string;
  email?: string;
}

// Fetch Apple's JWKS and return a signing key for the given kid
function getAppleSigningKey(kid: string): Promise<string> {
  const client = jwksRsa({
    jwksUri: 'https://appleid.apple.com/auth/keys',
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 60 * 60 * 1000, // 1 hour
  });

  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err, key) => {
      if (err || !key) return reject(err ?? new Error('Signing key not found'));
      resolve(key.getPublicKey());
    });
  });
}

// ---------------------------------------------------------------------------
// POST /api/auth/apple
// Body: { identityToken: string, user?: { name?: string, email?: string } }
// Verifies an Apple identity token and returns JWT tokens for the user.
// ---------------------------------------------------------------------------
export async function appleAuth(request: FastifyRequest, reply: FastifyReply) {
  const { identityToken, user: appleUserData } = request.body as {
    identityToken: string;
    user?: { name?: string; email?: string };
  };

  if (!identityToken) {
    throw Errors.badRequest('identityToken обязателен');
  }

  let payload: ApplePayload;

  if (isTestMode()) {
    // In test/dev mode — decode without signature verification
    const decoded = jwt.decode(identityToken) as ApplePayload | null;
    if (!decoded || !decoded.sub) {
      throw Errors.unauthorized('Невалидный Apple identity token');
    }
    payload = decoded;
  } else {
    // Production — verify with Apple's public keys
    try {
      const decoded = jwt.decode(identityToken, { complete: true });
      if (!decoded || typeof decoded === 'string') {
        throw Errors.unauthorized('Невалидный Apple identity token');
      }
      const kid = (decoded.header as { kid?: string }).kid;
      if (!kid) throw Errors.unauthorized('Apple token не содержит kid');

      const publicKey = await getAppleSigningKey(kid);
      const verified = jwt.verify(identityToken, publicKey, {
        algorithms: ['RS256'],
        issuer: 'https://appleid.apple.com',
      }) as ApplePayload;

      payload = verified;
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw Errors.unauthorized('Невалидный Apple identity token');
    }
  }

  const { sub: appleId } = payload;
  // Apple sends email only on first login; fall back to appleUserData or generate placeholder
  const email: string =
    payload.email ??
    appleUserData?.email ??
    `apple-${appleId}@privaterelay.appleid.com`;

  const name: string = appleUserData?.name ?? email.split('@')[0];

  // 1. Search by provider + providerId
  let user = await prisma.user.findFirst({
    where: { provider: 'apple', providerId: appleId },
  });

  // 2. No Apple record — try to find by email
  if (!user) {
    const emailUser = await prisma.user.findUnique({ where: { email } });
    if (emailUser) {
      user = await prisma.user.update({
        where: { id: emailUser.id },
        data: { provider: 'apple', providerId: appleId },
      });
    }
  }

  // 3. Brand new user
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name,
        password: null,
        provider: 'apple',
        providerId: appleId,
      },
    });
  }

  await ensureWalletAndSubscription(user.id);
  const tokens = await generateTokenPair(user.id, user.email);

  return reply.send({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: buildUserProfile(user),
  });
}
