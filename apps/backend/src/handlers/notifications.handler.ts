import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { Errors } from '../lib/errors';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
// Threshold: 3+ notifications of the same type within this window get grouped
const GROUP_THRESHOLD = 3;
const GROUP_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_PAGE_SIZE)
    .optional()
    .default(DEFAULT_PAGE_SIZE),
  grouped: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
});

// Grouped notification shape
interface GroupedNotification {
  type: string;
  grouped: true;
  count: number;
  latestMessage: string;
  latestId: string;
  latestCreatedAt: string;
  isRead: boolean;
}

type NotifRecord = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: Date;
};

// Apply grouping logic: types with 3+ items in the last 24h are collapsed
function applyGrouping(notifications: NotifRecord[]): Array<NotifRecord | GroupedNotification> {
  const now = Date.now();
  const windowStart = new Date(now - GROUP_WINDOW_MS);

  // Separate recent notifications from older ones
  const recent = notifications.filter((n) => n.createdAt >= windowStart);
  const older = notifications.filter((n) => n.createdAt < windowStart);

  // Group recent by type
  const byType = new Map<string, NotifRecord[]>();
  for (const n of recent) {
    if (!byType.has(n.type)) byType.set(n.type, []);
    byType.get(n.type)!.push(n);
  }

  const result: Array<NotifRecord | GroupedNotification> = [];

  for (const [type, items] of byType.entries()) {
    if (items.length >= GROUP_THRESHOLD) {
      // Collapse into a group — latest item first
      const sorted = [...items].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
      const latest = sorted[0];
      const extraCount = items.length - 1;
      result.push({
        type,
        grouped: true,
        count: items.length,
        latestMessage: `${latest.body}${extraCount > 0 ? ` и ещё ${extraCount}` : ''}`,
        latestId: latest.id,
        latestCreatedAt: latest.createdAt.toISOString(),
        isRead: items.every((n) => n.isRead),
      });
    } else {
      // Below threshold — keep individual records
      result.push(...items);
    }
  }

  // Append older notifications unchanged
  result.push(...older);

  // Re-sort the final list: grouped items use latestCreatedAt, individual items use createdAt
  result.sort((a, b) => {
    const aTime =
      'grouped' in a
        ? new Date(a.latestCreatedAt).getTime()
        : a.createdAt.getTime();
    const bTime =
      'grouped' in b
        ? new Date(b.latestCreatedAt).getTime()
        : b.createdAt.getTime();
    return bTime - aTime;
  });

  return result;
}

// GET /api/notifications — paginated list of user's notifications
// Query params: page (int, default 1), limit (int, default 20, max 50), grouped (bool, default false)
// When grouped=true and 3+ notifications of the same type exist in the last 24h,
// they are returned as a single grouped entry with count and latestMessage.
export async function listNotifications(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId;

  const parsed = listQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    throw Errors.validation('Некорректные параметры запроса');
  }

  const { page, limit, grouped } = parsed.data;
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where: { userId } }),
  ]);

  const data = grouped ? applyGrouping(notifications as NotifRecord[]) : notifications;

  return reply.send({
    data,
    meta: { page, pageSize: limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// PATCH /api/notifications/:id/read — mark one notification as read
export async function markOneRead(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId;
  const { id } = request.params as { id: string };

  const notification = await prisma.notification.findUnique({ where: { id } });

  if (!notification) throw Errors.notFound('Уведомление');
  if (notification.userId !== userId) throw Errors.forbidden('Нет доступа к уведомлению');

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });

  return reply.send({ notification: updated });
}

// PATCH /api/notifications/read-all — mark all notifications of the user as read
export async function markAllRead(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId;

  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return reply.send({ updated: result.count });
}

// DELETE /api/notifications/:id — delete a single notification
export async function deleteNotification(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId;
  const { id } = request.params as { id: string };

  const notification = await prisma.notification.findUnique({ where: { id } });

  if (!notification) throw Errors.notFound('Уведомление');
  if (notification.userId !== userId) throw Errors.forbidden('Нет доступа к уведомлению');

  await prisma.notification.delete({ where: { id } });

  return reply.send({ success: true });
}

// GET /api/notifications/unread-count — number of unread notifications
export async function unreadCount(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId;

  const count = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  return reply.send({ count });
}
