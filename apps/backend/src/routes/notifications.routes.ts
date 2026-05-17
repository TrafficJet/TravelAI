import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.middleware';
import {
  listNotifications,
  markOneRead,
  markAllRead,
  deleteNotification,
  unreadCount,
} from '../handlers/notifications.handler';

// Notification routes — all require JWT authentication
export async function notificationsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // GET /api/notifications — paginated list of user's notifications
  // ?page defaults to 1; ?limit defaults to 20 (max 50); ?grouped=true enables grouping
  fastify.get('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 50 },
          grouped: { type: 'string', enum: ['true', 'false'] },
        },
      },
    },
    handler: listNotifications,
  });

  // GET /api/notifications/unread-count — number of unread notifications
  // Must be declared BEFORE /:id to avoid route conflict
  fastify.get('/unread-count', unreadCount);

  // PATCH /api/notifications/read-all — mark all notifications as read
  fastify.patch('/read-all', markAllRead);

  // PATCH /api/notifications/:id/read — mark a single notification as read
  fastify.patch('/:id/read', markOneRead);

  // DELETE /api/notifications/:id — delete a notification
  fastify.delete('/:id', deleteNotification);
}
