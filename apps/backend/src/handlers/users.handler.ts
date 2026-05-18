import { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { Errors } from '../lib/errors';

interface UpdateProfileBody {
  name?: string;
  phone?: string;
  dateOfBirth?: string;       // ISO date string, e.g. "1990-05-17"
  nationality?: string;
  passportNumber?: string;
  passportExpiry?: string;    // ISO date string
  emergencyName?: string;
  emergencyPhone?: string;
  preferredLang?: string;
}

interface DeleteMeBody {
  password: string;
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: 'ru' | 'en';
  notifications: {
    priceAlerts: boolean;
    bookings: boolean;
    system: boolean;
  };
}

interface PreferencesBody {
  theme?: 'light' | 'dark' | 'auto';
  language?: 'ru' | 'en';
  notifications?: {
    priceAlerts?: boolean;
    bookings?: boolean;
    system?: boolean;
  };
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'auto',
  language: 'ru',
  notifications: {
    priceAlerts: true,
    bookings: true,
    system: true,
  },
};

// GET /api/users/me — return profile + wallet balance + subscription
export async function getMe(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      wallet: true,
      subscription: true,
    },
  });

  if (!user) {
    throw Errors.notFound('Пользователь');
  }

  return reply.send({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth?.toISOString() ?? null,
      nationality: user.nationality,
      passportNumber: user.passportNumber,
      passportExpiry: user.passportExpiry?.toISOString() ?? null,
      emergencyName: user.emergencyName,
      emergencyPhone: user.emergencyPhone,
      preferredLang: user.preferredLang,
      createdAt: user.createdAt.toISOString(),
    },
    wallet: {
      balance: user.wallet?.balance.toString() ?? '0.00',
      currency: user.wallet?.currency ?? 'RUB',
    },
    subscription: {
      plan: user.subscription?.plan ?? 'FREE',
      status: user.subscription?.status ?? 'ACTIVE',
      expiresAt: user.subscription?.expiresAt?.toISOString() ?? null,
    },
  });
}

// GET /api/users/me/stats — aggregated booking stats: counts, total spend, bonus balance, member since
export async function getMeStats(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId;

  // Fetch all bookings and wallet info in parallel
  const [bookings, wallet, user] = await Promise.all([
    prisma.booking.findMany({
      where: { userId },
      select: { type: true, totalPrice: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.wallet.findUnique({ where: { userId }, select: { balance: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } }),
  ]);

  if (!user) {
    throw Errors.notFound('Пользователь');
  }

  const totalBookings = bookings.length;
  const totalFlights = bookings.filter((b) => b.type === 'FLIGHT').length;
  const totalSpent = bookings.reduce(
    (acc, b) => acc + parseFloat(b.totalPrice.toString()),
    0,
  );
  // Bonus balance: 1% of total spent, rounded to integer rubles
  const bonusBalance = Math.round(totalSpent * 0.01);

  return reply.send({
    totalBookings,
    totalSpent: Math.round(totalSpent),
    totalFlights,
    bonusBalance,
    memberSince: user.createdAt.toISOString().slice(0, 10),
  });
}

// PATCH /api/users/me — update profile fields; email changes require a separate flow
export async function updateMe(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId;
  const body = request.body as UpdateProfileBody;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      ...(body.dateOfBirth !== undefined
        ? { dateOfBirth: new Date(body.dateOfBirth) }
        : {}),
      ...(body.nationality !== undefined ? { nationality: body.nationality } : {}),
      ...(body.passportNumber !== undefined
        ? { passportNumber: body.passportNumber }
        : {}),
      ...(body.passportExpiry !== undefined
        ? { passportExpiry: new Date(body.passportExpiry) }
        : {}),
      ...(body.emergencyName !== undefined
        ? { emergencyName: body.emergencyName }
        : {}),
      ...(body.emergencyPhone !== undefined
        ? { emergencyPhone: body.emergencyPhone }
        : {}),
      ...(body.preferredLang !== undefined
        ? { preferredLang: body.preferredLang }
        : {}),
    },
  });

  return reply.send({
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      phone: updatedUser.phone,
      dateOfBirth: updatedUser.dateOfBirth?.toISOString() ?? null,
      nationality: updatedUser.nationality,
      passportNumber: updatedUser.passportNumber,
      passportExpiry: updatedUser.passportExpiry?.toISOString() ?? null,
      emergencyName: updatedUser.emergencyName,
      emergencyPhone: updatedUser.emergencyPhone,
      preferredLang: updatedUser.preferredLang,
      createdAt: updatedUser.createdAt.toISOString(),
    },
  });
}

// DELETE /api/users/me — soft-delete the current user after password verification
export async function deleteMe(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId;
  const { password } = request.body as DeleteMeBody;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw Errors.notFound('Пользователь');
  }

  // OAuth-only accounts have no password — instruct user to use OAuth login
  if (user.provider !== 'email' && user.password === null) {
    throw Errors.badRequest('Используйте вход через Google/Apple');
  }

  const passwordValid = await bcrypt.compare(password, user.password as string);
  if (!passwordValid) {
    throw Errors.unauthorized('Неверный пароль');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date() },
  });

  return reply.send({ success: true, message: 'Аккаунт удалён' });
}

// GET /api/users/me/preferences — return current user preferences
export async function getPreferences(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });

  if (!user) {
    throw Errors.notFound('Пользователь');
  }

  // Merge stored preferences with defaults so missing keys are filled in
  const stored = (user.preferences as Partial<UserPreferences>) ?? {};
  const preferences: UserPreferences = {
    ...DEFAULT_PREFERENCES,
    ...(stored.theme !== undefined ? { theme: stored.theme } : {}),
    ...(stored.language !== undefined ? { language: stored.language } : {}),
    notifications: {
      ...DEFAULT_PREFERENCES.notifications,
      ...(stored.notifications ?? {}),
    },
  };

  return reply.send({ preferences });
}

const savePushTokenSchema = z.object({
  token: z.string().min(1).nullable(),
});

// POST /api/users/me/push-token — save or clear Expo push token for the current user
// Pass { token: "ExponentPushToken[...]" } to register, { token: null } to clear on logout
export async function savePushToken(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId;

  const parsed = savePushTokenSchema.safeParse(request.body);
  if (!parsed.success) {
    throw Errors.validation('Поле token должно быть строкой или null');
  }

  const { token } = parsed.data;

  await prisma.user.update({
    where: { id: userId },
    data: { pushToken: token ?? null },
  });

  return reply.send({ success: true });
}

// PATCH /api/users/me/preferences — update user preferences (partial merge)
export async function updatePreferences(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId;
  const body = request.body as PreferencesBody;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });

  if (!user) {
    throw Errors.notFound('Пользователь');
  }

  const stored = (user.preferences as Partial<UserPreferences>) ?? {};
  const merged: UserPreferences = {
    ...DEFAULT_PREFERENCES,
    ...(stored.theme !== undefined ? { theme: stored.theme } : {}),
    ...(stored.language !== undefined ? { language: stored.language } : {}),
    notifications: {
      ...DEFAULT_PREFERENCES.notifications,
      ...(stored.notifications ?? {}),
    },
  };

  // Apply partial update from request body
  if (body.theme !== undefined) merged.theme = body.theme;
  if (body.language !== undefined) merged.language = body.language;
  if (body.notifications !== undefined) {
    merged.notifications = { ...merged.notifications, ...body.notifications };
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { preferences: merged as unknown as Prisma.InputJsonValue },
    select: { preferences: true },
  });

  return reply.send({ preferences: updatedUser.preferences });
}
