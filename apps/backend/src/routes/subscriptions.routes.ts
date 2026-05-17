import { FastifyInstance } from 'fastify';
import { getPlans, subscribe, getCurrentSubscription } from '../handlers/subscriptions.handler';
import { authenticate } from '../middleware/auth.middleware';

// Subscription routes
export async function subscriptionsRoutes(fastify: FastifyInstance) {
  // GET /api/subscriptions/plans — public, no auth required
  fastify.get('/plans', { handler: getPlans });

  // Authenticated routes
  fastify.get('/current', { preHandler: authenticate, handler: getCurrentSubscription });

  fastify.post('/subscribe', {
    preHandler: authenticate,
    schema: {
      body: {
        type: 'object',
        required: ['plan'],
        properties: {
          plan: { type: 'string', enum: ['FREE', 'PREMIUM'] },
        },
      },
    },
    handler: subscribe,
  });
}
