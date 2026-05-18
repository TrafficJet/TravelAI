import { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken, getRefreshExpiresAt } from '../lib/jwt';
import { Errors } from '../lib/errors';
import { emailService } from '../lib/email';

const BCRYPT_ROUNDS = 10;

interface RegisterBody {
  email: string;
  password: string;
  name: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface RefreshBody {
  refreshToken: string;
}

interface LogoutBody {
  refreshToken: string;
}

// Build user profile DTO (no password)
function buildUserProfile(user: { id: string; email: string; name: string; phone: string | null; createdAt: Date }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    createdAt: user.createdAt.toISOString(),
  };
}

// Generate token pair and persist refresh token
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

// POST /api/auth/register — create user + wallet + subscription in one transaction
export async function register(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { email, password, name } = request.body as RegisterBody;

    // Check if email is already taken
    let existing: Awaited<ReturnType<typeof prisma.user.findUnique>>;
    try {
      existing = await prisma.user.findUnique({ where: { email } });
    } catch (dbErr) {
      console.error('[register] prisma.user.findUnique failed — possible schema mismatch or DB error:', dbErr);
      throw dbErr;
    }
    if (existing) {
      throw Errors.conflict('Пользователь с таким email уже зарегистрирован');
    }

    let hashedPassword: string;
    try {
      hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    } catch (bcryptErr) {
      console.error('[register] bcrypt.hash failed:', bcryptErr);
      throw bcryptErr;
    }

    // Smoke-test JWT signing BEFORE the transaction so a missing secret
    // surfaces as a clear console.error rather than a silent transaction abort
    try {
      signAccessToken({ sub: '__probe__', email });
    } catch (jwtErr) {
      console.error('[register] JWT signing failed — check JWT_ACCESS_SECRET / JWT_REFRESH_SECRET env vars:', jwtErr);
      throw jwtErr;
    }

    // Create user, wallet, subscription and refresh token atomically
    const { user, tokens } = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
        },
      });

      await tx.wallet.create({
        data: { userId: newUser.id, balance: 0, currency: 'USD' },
      });

      await tx.subscription.create({
        data: { userId: newUser.id, plan: 'FREE', status: 'ACTIVE' },
      });

      // Re-sign tokens with the real userId now that we have it
      const realJti = uuidv4();
      const realAccessToken = signAccessToken({ sub: newUser.id, email: newUser.email });
      const realRefreshToken = signRefreshToken({ sub: newUser.id, jti: realJti });

      await tx.refreshToken.create({
        data: {
          id: realJti,
          token: realRefreshToken,
          userId: newUser.id,
          expiresAt: getRefreshExpiresAt(),
        },
      });

      return { user: newUser, tokens: { accessToken: realAccessToken, refreshToken: realRefreshToken } };
    }).catch((txErr) => {
      console.error('[register] prisma.$transaction failed:', txErr);
      throw txErr;
    });

    // Fire-and-forget — welcome email should not block the response
    emailService.sendWelcome(email, name).catch(() => {});

    return reply.status(201).send({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: buildUserProfile(user),
    });
  } catch (err) {
    // Re-throw AppErrors as-is so the error handler can format them correctly
    const { AppError } = await import('../lib/errors');
    if (err instanceof AppError) {
      throw err;
    }
    console.error('[register] unexpected error:', err);
    throw err;
  }
}

// POST /api/auth/login
export async function login(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { email, password } = request.body as LoginBody;

    let user: Awaited<ReturnType<typeof prisma.user.findUnique>>;
    try {
      user = await prisma.user.findUnique({ where: { email } });
    } catch (dbErr) {
      // Surface DB errors explicitly so Railway logs show the real cause
      // (e.g. missing columns due to unapplied migrations)
      console.error('[login] prisma.user.findUnique failed — possible schema mismatch or DB error:', dbErr);
      throw dbErr;
    }

    if (!user || user.deletedAt !== null) {
      throw Errors.unauthorized('Неверный email или пароль');
    }

    // OAuth users cannot log in via email/password — guide them to the correct method
    if (user.provider !== 'email') {
      throw Errors.badRequest('Используйте вход через Google/Apple');
    }

    // Guard against null password (OAuth users have no password set)
    if (!user.password) {
      throw Errors.badRequest('Используйте вход через Google/Apple');
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      throw Errors.unauthorized('Неверный email или пароль');
    }

    let tokens: { accessToken: string; refreshToken: string };
    try {
      tokens = await generateTokenPair(user.id, user.email);
    } catch (err) {
      console.error('[login] generateTokenPair failed:', err);
      throw err;
    }

    return reply.send({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: buildUserProfile(user),
    });
  } catch (err) {
    const { AppError } = await import('../lib/errors');
    if (err instanceof AppError) {
      throw err;
    }
    console.error('[login] unexpected error:', err);
    throw err;
  }
}

// POST /api/auth/refresh — rotate refresh token
export async function refresh(request: FastifyRequest, reply: FastifyReply) {
  const { refreshToken } = request.body as RefreshBody;

  let payload: { sub: string; jti: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw Errors.unauthorized('Токен обновления недействителен или истёк');
  }

  const storedToken = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
    throw Errors.unauthorized('Токен обновления отозван или истёк');
  }

  // Revoke old token
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revoked: true },
  });

  // Issue new token pair
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.deletedAt !== null) {
    throw Errors.unauthorized('Пользователь не найден или удалён');
  }

  const tokens = await generateTokenPair(user.id, user.email);

  return reply.send({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
}

// POST /api/auth/forgot-password — request a password reset link (always 200 to avoid email enumeration)
export async function forgotPassword(request: FastifyRequest, reply: FastifyReply) {
  const { email } = request.body as { email: string };

  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    // Fire-and-forget
    emailService.sendPasswordReset(email, token).catch(() => {});
  }

  return reply.send({ message: 'Если email существует, письмо отправлено' });
}

// POST /api/auth/reset-password — apply a password reset token
export async function resetPassword(request: FastifyRequest, reply: FastifyReply) {
  const { token, newPassword } = request.body as { token: string; newPassword: string };

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!resetToken) {
    throw Errors.badRequest('Токен недействителен или не существует');
  }

  if (resetToken.used) {
    throw Errors.badRequest('Токен уже был использован');
  }

  if (resetToken.expiresAt < new Date()) {
    throw Errors.badRequest('Срок действия токена истёк');
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    }),
  ]);

  return reply.send({ message: 'Пароль обновлён' });
}

// POST /api/auth/logout — revoke refresh token
export async function logout(request: FastifyRequest, reply: FastifyReply) {
  const { refreshToken } = request.body as LogoutBody;

  const storedToken = await prisma.refreshToken.findFirst({
    where: { token: refreshToken, userId: request.userId },
  });

  if (storedToken && !storedToken.revoked) {
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });
  }

  return reply.send({ success: true });
}
