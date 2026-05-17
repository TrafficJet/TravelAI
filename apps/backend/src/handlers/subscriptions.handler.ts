import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';
import { Errors } from '../lib/errors';
import { getTodayMessageCount, getMonthlyBookingCount } from '../middleware/rateLimiter';

const PREMIUM_PRICE = 999; // RUB per month
const PREMIUM_DURATION_DAYS = 30;

interface SubscribeBody {
  plan: 'FREE' | 'PREMIUM';
}

// GET /api/subscriptions/plans — public list of available plans
export async function getPlans(_request: FastifyRequest, reply: FastifyReply) {
  return reply.send({
    plans: [
      {
        id: 'FREE',
        name: 'Базовый',
        price: 0,
        currency: 'RUB',
        billingPeriod: null,
        features: [
          'До 10 сообщений в день',
          'До 3 активных сессий',
          'До 2 бронирований в месяц',
          'Поиск рейсов и отелей',
        ],
        limits: {
          messagesPerDay: 10,
          activeSessions: 3,
          bookingsPerMonth: 2,
        },
      },
      {
        id: 'PREMIUM',
        name: 'Премиум',
        price: PREMIUM_PRICE,
        currency: 'RUB',
        billingPeriod: 'MONTHLY',
        features: [
          'Безлимитные сообщения',
          'До 50 активных сессий',
          'Безлимитные бронирования',
          'Приоритетный AI ответ',
          'Уведомления об изменении цен',
        ],
        limits: {
          messagesPerDay: null,
          activeSessions: 50,
          bookingsPerMonth: null,
        },
      },
    ],
  });
}

// POST /api/subscriptions/subscribe — activate PREMIUM (deducts from wallet)
export async function subscribe(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId;
  const { plan } = request.body as SubscribeBody;

  if (plan !== 'PREMIUM') {
    throw Errors.badRequest('Можно оформить только план PREMIUM');
  }

  // Check current subscription
  const existing = await prisma.subscription.findUnique({ where: { userId } });
  if (existing?.plan === 'PREMIUM' && existing.status === 'ACTIVE') {
    throw Errors.conflict('Подписка PREMIUM уже активна');
  }

  // Check wallet balance
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet || Number(wallet.balance) < PREMIUM_PRICE) {
    throw Errors.paymentRequired(
      `Недостаточно средств. Необходимо ${PREMIUM_PRICE} ₽, на кошельке: ${wallet?.balance ?? 0} ₽`,
    );
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + PREMIUM_DURATION_DAYS);

  // Debit wallet and update subscription atomically
  const [updatedWallet, subscription] = await prisma.$transaction([
    prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { decrement: PREMIUM_PRICE } },
    }),
    prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        plan: 'PREMIUM',
        status: 'ACTIVE',
        expiresAt,
      },
      update: {
        plan: 'PREMIUM',
        status: 'ACTIVE',
        expiresAt,
      },
    }),
    prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount: PREMIUM_PRICE,
        type: 'DEBIT',
        description: 'Оформление подписки Premium на 30 дней',
      },
    }),
  ]);

  return reply.send({
    subscription: {
      plan: subscription.plan,
      status: subscription.status,
      expiresAt: subscription.expiresAt?.toISOString(),
    },
    newBalance: updatedWallet.balance.toString(),
  });
}

// GET /api/subscriptions/current — current subscription with usage stats
export async function getCurrentSubscription(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId;

  const subscription = await prisma.subscription.findUnique({ where: { userId } });

  if (!subscription) {
    return reply.send({
      subscription: { plan: 'FREE', status: 'ACTIVE', expiresAt: null },
      usage: { messagesUsedToday: 0, bookingsUsedThisMonth: 0 },
    });
  }

  const [messagesUsedToday, bookingsUsedThisMonth] = await Promise.all([
    getTodayMessageCount(userId),
    getMonthlyBookingCount(userId),
  ]);

  return reply.send({
    subscription: {
      plan: subscription.plan,
      status: subscription.status,
      expiresAt: subscription.expiresAt?.toISOString() ?? null,
    },
    usage: {
      messagesUsedToday,
      bookingsUsedThisMonth,
    },
  });
}
