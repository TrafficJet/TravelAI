import { FastifyInstance } from 'fastify';
import { getMe, updateMe, getMeStats, deleteMe, getPreferences, updatePreferences } from '../handlers/users.handler';
import { authenticate } from '../middleware/auth.middleware';

// Users routes — all require authentication
export async function usersRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // GET /api/users/me — current user profile
  fastify.get('/me', { handler: getMe });

  // GET /api/users/me/stats — aggregated booking statistics for the current user
  fastify.get('/me/stats', { handler: getMeStats });

  // GET /api/users/me/preferences — retrieve user theme/language/notification settings
  fastify.get('/me/preferences', { handler: getPreferences });

  // PATCH /api/users/me — update name only (email changes are not allowed)
  fastify.patch('/me', {
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100 },
        },
        additionalProperties: false,
      },
    },
    handler: updateMe,
  });

  // PATCH /api/users/me/preferences — partially update user preferences
  fastify.patch('/me/preferences', {
    schema: {
      body: {
        type: 'object',
        properties: {
          theme: { type: 'string', enum: ['light', 'dark', 'auto'] },
          language: { type: 'string', enum: ['ru', 'en'] },
          notifications: {
            type: 'object',
            properties: {
              priceAlerts: { type: 'boolean' },
              bookings: { type: 'boolean' },
              system: { type: 'boolean' },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
    },
    handler: updatePreferences,
  });

  // DELETE /api/users/me — soft-delete account after password confirmation
  fastify.delete('/me', {
    schema: {
      body: {
        type: 'object',
        required: ['password'],
        properties: {
          password: { type: 'string', minLength: 1 },
        },
        additionalProperties: false,
      },
    },
    handler: deleteMe,
  });
}
