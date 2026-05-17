import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.middleware';
import { executeSearchFlights } from '../tools/searchFlights.tool';
import { executeSearchHotels } from '../tools/searchHotels.tool';

// Internal search routes — called by Claude tool handlers or directly by mobile client
// Rate-limited and auth-protected
export async function searchRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // POST /api/search/flights — direct flight search endpoint with optional filters
  fastify.post('/flights', {
    schema: {
      body: {
        type: 'object',
        required: ['origin', 'destination', 'departure_date'],
        properties: {
          origin: { type: 'string', minLength: 3, maxLength: 3 },
          destination: { type: 'string', minLength: 3, maxLength: 3 },
          departure_date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          return_date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          passengers: { type: 'integer', minimum: 1, maximum: 9 },
          cabin_class: { type: 'string', enum: ['economy', 'business', 'first'] },
          // Filters
          max_price: { type: 'number', minimum: 0 },
          max_stops: { type: 'integer', minimum: 0, maximum: 10 },
          departure_time_from: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
          departure_time_to: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
          sort_by: { type: 'string', enum: ['price', 'duration', 'departure'] },
          sort_order: { type: 'string', enum: ['asc', 'desc'] },
        },
      },
    },
    handler: async (request, reply) => {
      const body = request.body as {
        origin: string;
        destination: string;
        departure_date: string;
        return_date?: string;
        passengers?: number;
        cabin_class?: string;
        max_price?: number;
        max_stops?: number;
        departure_time_from?: string;
        departure_time_to?: string;
        sort_by?: 'price' | 'duration' | 'departure';
        sort_order?: 'asc' | 'desc';
      };
      const result = await executeSearchFlights(body);
      return reply.send(result);
    },
  });

  // POST /api/search/hotels — direct hotel search endpoint
  fastify.post('/hotels', {
    schema: {
      body: {
        type: 'object',
        required: ['city', 'check_in', 'check_out'],
        properties: {
          city: { type: 'string', minLength: 2 },
          check_in: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          check_out: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          guests: { type: 'integer', minimum: 1 },
          stars: { type: 'array', items: { type: 'integer', minimum: 1, maximum: 5 } },
          max_price_per_night: { type: 'number', minimum: 0 },
        },
      },
    },
    handler: async (request, reply) => {
      const body = request.body as {
        city: string;
        check_in: string;
        check_out: string;
        guests?: number;
        stars?: number[];
        max_price_per_night?: number;
      };
      const result = await executeSearchHotels(body);
      return reply.send(result);
    },
  });
}
