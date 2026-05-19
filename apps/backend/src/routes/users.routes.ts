import { FastifyInstance } from 'fastify';
import { getMe, updateMe, getMeStats, deleteMe, getPreferences, updatePreferences, savePushToken, deletePushToken } from '../handlers/users.handler';
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

  // PATCH /api/users/me — update profile (name, phone, passport, emergency contact, etc.)
  fastify.patch('/me', {
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100 },
          phone: { type: 'string', maxLength: 30 },
          dateOfBirth: { type: 'string', format: 'date' },
          nationality: { type: 'string', maxLength: 100 },
          passportNumber: { type: 'string', maxLength: 50 },
          passportExpiry: { type: 'string', format: 'date' },
          emergencyName: { type: 'string', maxLength: 100 },
          emergencyPhone: { type: 'string', maxLength: 30 },
          preferredLang: { type: 'string', enum: ['ru', 'en'] },
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

  // POST /api/users/me/push-token — register Expo push token for the current user
  fastify.post('/me/push-token', {
    schema: {
      body: {
        type: 'object',
        required: ['token'],
        properties: {
          token: { type: 'string', minLength: 1 },
        },
        additionalProperties: false,
      },
    },
    handler: savePushToken,
  });

  // DELETE /api/users/me/push-token — clear push token on logout
  fastify.delete('/me/push-token', { handler: deletePushToken });

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
