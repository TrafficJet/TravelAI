import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { Errors } from '../lib/errors';

// Validation schema for flight-status webhook payload
const flightStatusSchema = z.object({
  bookingId: z.string().uuid('bookingId must be a valid UUID'),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'FAILED'], {
    errorMap: () => ({
      message: 'status must be one of: PENDING, CONFIRMED, CANCELLED, FAILED',
    }),
  }),
  details: z.record(z.unknown()).optional().default({}),
});

type FlightStatusBody = z.infer<typeof flightStatusSchema>;

// Map booking status to human-readable notification text
function statusLabel(status: FlightStatusBody['status']): { title: string; body: string } {
  switch (status) {
    case 'CONFIRMED':
      return {
        title: 'Бронирование подтверждено',
        body: 'Ваш рейс успешно забронирован и подтверждён авиакомпанией.',
      };
    case 'CANCELLED':
      return {
        title: 'Бронирование отменено',
        body: 'Ваш рейс был отменён. Обратитесь в поддержку за деталями.',
      };
    case 'FAILED':
      return {
        title: 'Ошибка бронирования',
        body: 'При обработке бронирования произошла ошибка. Попробуйте снова или обратитесь в поддержку.',
      };
    default:
      return {
        title: 'Статус бронирования обновлён',
        body: `Статус вашего бронирования изменён на: ${status}.`,
      };
  }
}

// POST /api/webhooks/flight-status
// Receives a flight-status update from an external provider or internal job.
// Updates the booking record and creates a Notification for the booking owner.
// No authentication: caller identity is verified by the WEBHOOK_SECRET header.
async function handleFlightStatus(request: FastifyRequest, reply: FastifyReply) {
  // Verify shared secret to prevent unauthenticated calls
  const secret = process.env.WEBHOOK_SECRET;
  if (secret) {
    const provided = request.headers['x-webhook-secret'];
    if (provided !== secret) {
      return reply.status(401).send({ error: 'Invalid webhook secret' });
    }
  }

  const parsed = flightStatusSchema.safeParse(request.body);
  if (!parsed.success) {
    throw Errors.validation('Некорректный payload webhook', parsed.error.flatten());
  }

  const { bookingId, status, details } = parsed.data;

  // Find the booking
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    throw Errors.notFound('Booking');
  }

  // Update booking status and merge extra details into the stored JSON
  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status,
      details: {
        ...(booking.details as Record<string, unknown>),
        ...details,
        lastWebhookAt: new Date().toISOString(),
      },
    },
  });

  // Create a notification for the user
  const { title, body } = statusLabel(status);
  const notification = await prisma.notification.create({
    data: {
      userId: booking.userId,
      type: 'BOOKING_UPDATE',
      title,
      body,
    },
  });

  return reply.status(200).send({
    ok: true,
    bookingId: updatedBooking.id,
    status: updatedBooking.status,
    notificationId: notification.id,
  });
}

// Webhooks routes — public endpoints called by external systems
export async function webhooksRoutes(fastify: FastifyInstance) {
  // POST /api/webhooks/flight-status — receive flight/booking status update
  fastify.post('/flight-status', {
    schema: {
      body: {
        type: 'object',
        required: ['bookingId', 'status'],
        properties: {
          bookingId: { type: 'string', format: 'uuid' },
          status: {
            type: 'string',
            enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'FAILED'],
          },
          details: { type: 'object' },
        },
      },
    },
    handler: handleFlightStatus,
  });
}
