import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';
import { AppError, Errors } from '../lib/errors';
import { emailService } from '../lib/email';
import { sendExpoPush } from '../services/push.service';

interface BookingsQuery {
  page?: number;
  limit?: number;
  type?: 'FLIGHT' | 'HOTEL';
  status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'FAILED';
  from?: string; // ISO date string — filter bookings created on or after this date
  to?: string;   // ISO date string — filter bookings created on or before this date
}

interface BookingParams {
  id: string;
}

interface ConfirmBookingBody {
  bookingId: string;
  payFromWallet: boolean;
}

// Derive a human-readable summary from booking details
function buildSummary(
  type: string,
  details: unknown,
): { title: string; subtitle: string } {
  const d = details as Record<string, unknown>;

  if (type === 'FLIGHT') {
    // Format 1: segments array (from real Duffel bookings)
    const segments = d.segments as Array<{ origin: string; destination: string; departureAt: string }> | undefined;
    if (segments && segments.length > 0) {
      const first = segments[0];
      return {
        title: `${first.origin} → ${first.destination}`,
        subtitle: new Date(first.departureAt).toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'long',
        }),
      };
    }
    // Format 2: flat origin/destination/departureDate (from seed or AI tool bookings)
    const origin = d.origin as string | undefined;
    const destination = d.destination as string | undefined;
    const departureDate = (d.departureDate ?? d.departureAt) as string | undefined;
    if (origin && destination) {
      const subtitleDate = departureDate
        ? new Date(departureDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
        : '';
      return {
        title: `${origin} → ${destination}`,
        subtitle: subtitleDate,
      };
    }
  }

  if (type === 'HOTEL') {
    return {
      title: (d.hotelName as string) ?? 'Отель',
      subtitle: d.checkIn && d.checkOut ? `${d.checkIn} – ${d.checkOut}` : '',
    };
  }

  return { title: 'Бронирование', subtitle: '' };
}

// GET /api/bookings — paginated list of user bookings with optional filters
export async function getBookings(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId;
  const query = request.query as BookingsQuery;

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  // Build date range filter for createdAt
  const createdAtFilter: { gte?: Date; lte?: Date } = {};
  if (query.from) {
    const d = new Date(query.from);
    if (!isNaN(d.getTime())) createdAtFilter.gte = d;
  }
  if (query.to) {
    // Inclusive end-of-day: advance to start of next day
    const d = new Date(query.to);
    if (!isNaN(d.getTime())) {
      d.setDate(d.getDate() + 1);
      createdAtFilter.lte = d;
    }
  }

  const where = {
    userId,
    ...(query.type ? { type: query.type } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(Object.keys(createdAtFilter).length > 0 ? { createdAt: createdAtFilter } : {}),
  };

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.booking.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return reply.send({
    bookings: bookings.map((b) => ({
      id: b.id,
      type: b.type,
      status: b.status,
      provider: b.provider,
      details: b.details,
      totalPrice: Number(b.totalPrice),
      currency: b.currency,
      createdAt: b.createdAt.toISOString(),
      summary: buildSummary(b.type, b.details),
    })),
    total,
    page,
    totalPages,
  });
}

// GET /api/bookings/:id — full booking details
export async function getBookingById(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId;
  const { id } = request.params as BookingParams;

  const booking = await prisma.booking.findUnique({ where: { id } });

  if (!booking) throw Errors.notFound('Бронирование');
  if (booking.userId !== userId) throw Errors.forbidden('Бронирование не принадлежит пользователю');

  return reply.send({
    booking: {
      id: booking.id,
      type: booking.type,
      status: booking.status,
      provider: booking.provider,
      externalId: booking.externalId,
      totalPrice: Number(booking.totalPrice),
      currency: booking.currency,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
      details: booking.details,
    },
  });
}

// POST /api/bookings/:id/cancel — cancel a PENDING booking owned by the current user
export async function cancelBooking(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId;
  const { id } = request.params as BookingParams;

  const booking = await prisma.booking.findUnique({ where: { id } });

  if (!booking || booking.userId !== userId) {
    // Return 404 regardless of ownership to avoid ID enumeration
    throw Errors.notFound('Бронирование');
  }

  if (booking.status === 'CANCELLED') {
    throw Errors.badRequest('Бронирование уже отменено');
  }

  if (booking.status === 'CONFIRMED') {
    throw Errors.badRequest('Нельзя отменить подтверждённое бронирование. Обратитесь в поддержку.');
  }

  // Only PENDING bookings can be cancelled
  const updated = await prisma.booking.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  return reply.send({
    booking: {
      id: updated.id,
      type: updated.type,
      status: updated.status,
      provider: updated.provider,
      externalId: updated.externalId,
      totalPrice: Number(updated.totalPrice),
      currency: updated.currency,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      details: updated.details,
    },
  });
}

// POST /api/bookings/confirm — confirm PENDING booking, deduct from wallet
export async function confirmBooking(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId;
  const { bookingId } = request.body as ConfirmBookingBody;

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, userId, status: 'PENDING' },
  });

  if (!booking) {
    throw Errors.notFound('Бронирование (должно быть в статусе PENDING)');
  }

  const price = Number(booking.totalPrice);

  // Интерактивная транзакция: атомарная проверка баланса + списание + создание записей.
  // Optimistic locking через updateMany(where: { balance: { gte: price } }) —
  // если баланс не достаточен в момент UPDATE, count === 0 и транзакция откатывается.
  // Два параллельных запроса не смогут оба списать средства.
  let updatedBooking: Awaited<ReturnType<typeof prisma.booking.update>>;
  let transaction: Awaited<ReturnType<typeof prisma.walletTransaction.create>>;
  let updatedWallet: Awaited<ReturnType<typeof prisma.wallet.findUnique>>;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Находим кошелёк внутри транзакции чтобы прочитать актуальный баланс
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw Errors.notFound('Кошелёк');

      // Атомарное списание только если баланс по-прежнему достаточен
      const debitResult = await tx.wallet.updateMany({
        where: { userId, balance: { gte: price } },
        data: { balance: { decrement: price } },
      });

      if (debitResult.count === 0) {
        // Баланс изменился между read и write — insufficient funds
        throw new AppError(402, 'INSUFFICIENT_FUNDS', 'Недостаточно средств на кошельке', {
          balance: Number(wallet.balance),
          required: price,
          currency: booking.currency,
        });
      }

      const [confirmedBooking, walletTx, newWallet] = await Promise.all([
        tx.booking.update({
          where: { id: booking.id },
          data: { status: 'CONFIRMED' },
        }),
        tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: price,
            type: 'DEBIT',
            description: `Оплата бронирования #${booking.id.slice(0, 8)}`,
            bookingId: booking.id,
          },
        }),
        tx.wallet.findUnique({ where: { userId } }),
      ]);

      return { confirmedBooking, walletTx, newWallet };
    });

    updatedBooking = result.confirmedBooking;
    transaction = result.walletTx;
    updatedWallet = result.newWallet;
  } catch (err) {
    // Прокидываем AppError (402 insufficient funds) как есть, остальное — наверх
    throw err;
  }

  // Fire-and-forget — send booking confirmation email without blocking the response
  prisma.user.findUnique({ where: { id: userId }, select: { email: true } }).then((u) => {
    if (u) {
      emailService.sendBookingConfirmation(u.email, {
        bookingId: updatedBooking.id,
        type: updatedBooking.type as 'FLIGHT' | 'HOTEL',
        totalPrice: Number(updatedBooking.totalPrice),
        currency: updatedBooking.currency,
        details: updatedBooking.details as object,
      }).catch(() => {});
    }
  }).catch(() => {});

  // Fire-and-forget — send push notification and create in-app notification record
  const bookingRef = updatedBooking.id.slice(0, 8).toUpperCase();
  const notifTitle = 'Бронирование подтверждено';
  const notifBody = `Рейс забронирован. Номер: ${bookingRef}`;

  prisma.user.findUnique({ where: { id: userId }, select: { pushToken: true } }).then(async (u) => {
    if (u?.pushToken) {
      await sendExpoPush({
        pushToken: u.pushToken,
        title: notifTitle,
        body: notifBody,
        data: { bookingId: updatedBooking.id, type: 'booking_confirmed' },
      });
    }
  }).catch(() => {});

  // Create in-app notification record (non-blocking)
  prisma.notification.create({
    data: {
      userId,
      type: 'BOOKING_CONFIRMED',
      title: notifTitle,
      body: notifBody,
    },
  }).catch(() => {});

  return reply.send({
    booking: {
      id: updatedBooking.id,
      type: updatedBooking.type,
      status: updatedBooking.status,
      provider: updatedBooking.provider,
      externalId: updatedBooking.externalId,
      totalPrice: Number(updatedBooking.totalPrice),
      currency: updatedBooking.currency,
      createdAt: updatedBooking.createdAt.toISOString(),
      updatedAt: updatedBooking.updatedAt.toISOString(),
      details: updatedBooking.details,
    },
    transaction: {
      id: transaction.id,
      amount: transaction.amount.toString(),
      type: transaction.type,
      description: transaction.description,
      bookingId: transaction.bookingId,
      createdAt: transaction.createdAt.toISOString(),
    },
    newBalance: updatedWallet ? Number(updatedWallet.balance) : 0,
  });
}
