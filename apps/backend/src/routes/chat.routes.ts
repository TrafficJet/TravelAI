import { FastifyInstance } from 'fastify';
import {
  createSession,
  getSessions,
  getMessages,
  sendMessage,
  deleteSession,
} from '../handlers/chat.handler';
import { authenticate } from '../middleware/auth.middleware';
import { checkChatLimit, checkChatRateLimit } from '../middleware/rateLimiter';

// Chat routes — all require authentication
export async function chatRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // POST /api/chat/sessions — create new session (no session count limit)
  // Optional contextData enriches the Claude system prompt for this session.
  fastify.post('/sessions', {
    preHandler: [],
    schema: {
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', maxLength: 100 },
          contextData: {
            type: 'object',
            properties: {
              walletBalance: { type: 'number' },
              priceAlerts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    origin: { type: 'string' },
                    destination: { type: 'string' },
                    maxPrice: { type: 'number' },
                    active: { type: 'boolean' },
                  },
                },
              },
              recentSearches: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    query: { type: 'string' },
                    type: { type: 'string' },
                    createdAt: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    handler: createSession,
  });

  // GET /api/chat/sessions — list sessions
  fastify.get('/sessions', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 50 },
        },
      },
    },
    handler: getSessions,
  });

  // DELETE /api/chat/sessions/:id — delete session with all its messages
  fastify.delete('/sessions/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
    handler: deleteSession,
  });

  // GET /api/chat/sessions/:id/messages — message history
  fastify.get('/sessions/:id/messages', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100 },
        },
      },
    },
    handler: getMessages,
  });

  // POST /api/chat/sessions/:id/messages — SSE stream (daily limit + per-minute rate limit)
  // Note: schema validation is minimal here — SSE response bypasses Fastify's serializer
  fastify.post('/sessions/:id/messages', {
    preHandler: [authenticate, checkChatRateLimit, checkChatLimit],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string', minLength: 1, maxLength: 4000 },
        },
      },
    },
    handler: sendMessage,
  });
}
