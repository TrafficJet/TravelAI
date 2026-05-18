import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';
import { Errors } from '../lib/errors';

// FREE tier limits
const FREE_MESSAGES_PER_DAY = 200; // generous for demo
const FREE_ACTIVE_SESSIONS = 100; // generous demo limit
const FREE_BOOKINGS_PER_MONTH = 2;

// ---------------------------------------------------------------------------
// In-memory per-user per-minute rate limiter for chat messages
// ---------------------------------------------------------------------------

const CHAT_RATE_LIMIT = 30; // messages per minute
const CHAT_RATE_WINDOW_MS = 60 * 1000; // 1 minute

interface RateBucket {
  count: number;
  resetAt: number;
}

// Exported so tests can inspect / reset state
export const chatRateBuckets = new Map<string, RateBucket>();

/**
 * Allows up to 30 messages per user per minute (in-memory bucket).
 * Returns 429 when exceeded.
 */
export async function checkChatRateLimit(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = request.userId;
  const now = Date.now();

  let bucket = chatRateBuckets.get(userId);

  if (!bucket || now >= bucket.resetAt) {
    // Start a new window
    bucket = { count: 1, resetAt: now + CHAT_RATE_WINDOW_MS };
    chatRateBuckets.set(userId, bucket);
    return;
  }

  bucket.count += 1;

  if (bucket.count > CHAT_RATE_LIMIT) {
    reply.status(429).send({ error: 'Too many messages, please slow down' });
    return;
  }
}

// Check daily message limit for chat (FREE tier: 10 messages/day)
export async function checkChatLimit(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const userId = request.userId;

  const subscription = await prisma.subscription.findUnique({ where: { userId } });

  // PREMIUM users have no limit
  if (subscription?.plan === 'PREMIUM' && subscription.status === 'ACTIVE') {
    return;
  }

  // Count messages sent today by this user
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todayMessageCount = await prisma.message.count({
    where: {
      role: 'USER',
      createdAt: { gte: startOfDay },
      session: { userId },
    },
  });

  if (todayMessageCount >= FREE_MESSAGES_PER_DAY) {
    const err = Errors.limitReached(
      `Превышен дневной лимит сообщений (${FREE_MESSAGES_PER_DAY} для бесплатного тарифа). Перейдите на Premium.`,
    );
    reply.status(err.statusCode).send(err.toJSON());
    return;
  }
}

// Check active sessions limit for FREE tier (max 3 active sessions)
export async function checkSessionLimit(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = request.userId;

  const subscription = await prisma.subscription.findUnique({ where: { userId } });

  // No subscription record at all — new user, no limits yet
  if (!subscription) {
    return;
  }

  if (subscription.plan === 'PREMIUM' && subscription.status === 'ACTIVE') {
    return;
  }

  const sessionCount = await prisma.chatSession.count({ where: { userId } });

  if (sessionCount >= FREE_ACTIVE_SESSIONS) {
    const err = Errors.limitReached(
      `Превышен лимит активных сессий (${FREE_ACTIVE_SESSIONS} для бесплатного тарифа). Перейдите на Premium или удалите старые чаты.`,
    );
    reply.status(err.statusCode).send(err.toJSON());
    return;
  }
}

// Check monthly booking limit for FREE tier (max 2 bookings/month)
export async function checkBookingLimit(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = request.userId;

  const subscription = await prisma.subscription.findUnique({ where: { userId } });

  if (subscription?.plan === 'PREMIUM' && subscription.status === 'ACTIVE') {
    return;
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthlyBookings = await prisma.booking.count({
    where: {
      userId,
      createdAt: { gte: startOfMonth },
      status: { in: ['CONFIRMED', 'PENDING'] },
    },
  });

  if (monthlyBookings >= FREE_BOOKINGS_PER_MONTH) {
    const err = Errors.limitReached(
      `Превышен лимит бронирований в месяц (${FREE_BOOKINGS_PER_MONTH} для бесплатного тарифа). Перейдите на Premium.`,
    );
    reply.status(err.statusCode).send(err.toJSON());
    return;
  }
}

// Helper to count today's messages for usage stats (no side effects)
export async function getTodayMessageCount(userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return prisma.message.count({
    where: {
      role: 'USER',
      createdAt: { gte: startOfDay },
      session: { userId },
    },
  });
}

// Helper to count this month's bookings for usage stats
export async function getMonthlyBookingCount(userId: string): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  return prisma.booking.count({
    where: {
      userId,
      createdAt: { gte: startOfMonth },
      status: { in: ['CONFIRMED', 'PENDING'] },
    },
  });
}
