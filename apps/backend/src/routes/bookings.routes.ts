import { FastifyInstance } from 'fastify';
import { getBookings, getBookingById, cancelBooking, confirmBooking } from '../handlers/bookings.handler';
import { authenticate } from '../middleware/auth.middleware';
import { checkBookingLimit } from '../middleware/rateLimiter';

// Bookings routes — all require authentication
export async function bookingsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // GET /api/bookings — list user bookings
  fastify.get('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100 },
          type: { type: 'string', enum: ['FLIGHT', 'HOTEL'] },
          status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'FAILED'] },
          from: { type: 'string' },
          to: { type: 'string' },
        },
      },
    },
    handler: getBookings,
  });

  // GET /api/bookings/:id — booking details
  fastify.get('/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
    handler: getBookingById,
  });

  // POST /api/bookings/:id/cancel — cancel a PENDING booking
  fastify.post('/:id/cancel', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
    handler: cancelBooking,
  });

  // POST /api/bookings/confirm — confirm and pay for a PENDING booking
  fastify.post('/confirm', {
    preHandler: [authenticate, checkBookingLimit],
    schema: {
      body: {
        type: 'object',
        required: ['bookingId', 'payFromWallet'],
        properties: {
          bookingId: { type: 'string', format: 'uuid' },
          payFromWallet: { type: 'boolean' },
        },
      },
    },
    handler: confirmBooking,
  });
}
