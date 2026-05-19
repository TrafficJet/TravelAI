import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import { Errors } from '../lib/errors';

const MAX_ALERTS_PER_USER = 5;

const createAlertSchema = z.object({
  type: z.enum(['flight', 'hotel']).default('flight'),
  // flight fields
  origin: z.string().min(2).max(10).toUpperCase().optional(),
  destination: z.string().min(2).max(10).toUpperCase().optional(),
  // hotel fields
  city: z.string().min(1).max(100).optional(),
  maxPrice: z.number().positive(),
});

const toggleAlertSchema = z.object({
  active: z.boolean(),
});

// Price alert routes — all require authentication
export async function priceAlertsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // POST /api/price-alerts — create a new price alert (max 5 per user)
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.userId;

    const parsed = createAlertSchema.safeParse(request.body);
    if (!parsed.success) {
      throw Errors.validation('Некорректные данные алерта', parsed.error.flatten().fieldErrors);
    }

    const { type, origin, destination, city, maxPrice } = parsed.data;

    // Validate type-specific required fields
    if (type === 'flight') {
      if (!origin || !destination) {
        throw Errors.validation(
          'Для алерта на рейс обязательны поля origin и destination',
        );
      }
    } else {
      if (!city) {
        throw Errors.validation('Для алерта на отель обязательно поле city');
      }
    }

    // Enforce per-user limit
    const count = await prisma.priceAlert.count({
      where: { userId, active: true },
    });

    if (count >= MAX_ALERTS_PER_USER) {
      return reply.status(429).send({
        error: {
          code: 'LIMIT_REACHED',
          message: `Максимальное количество активных алертов — ${MAX_ALERTS_PER_USER}`,
        },
      });
    }

    const alert = await prisma.priceAlert.create({
      data: {
        userId,
        type,
        origin: origin ?? '',
        destination: destination ?? '',
        city: city ?? null,
        maxPrice,
        active: true,
      },
    });

    return reply.status(201).send({ alert });
  });

  // GET /api/price-alerts — list active price alerts for the authenticated user
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.userId;

    const alerts = await prisma.priceAlert.findMany({
      where: { userId, active: true },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ data: alerts });
  });

  // PATCH /api/price-alerts/:id — toggle active status of an alert
  fastify.patch('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.userId;
    const { id } = request.params as { id: string };

    const parsed = toggleAlertSchema.safeParse(request.body);
    if (!parsed.success) {
      throw Errors.validation('Некорректные данные', parsed.error.flatten().fieldErrors);
    }

    const { active } = parsed.data;

    const existing = await prisma.priceAlert.findUnique({ where: { id } });

    if (!existing) throw Errors.notFound('Алерт');
    if (existing.userId !== userId) throw Errors.forbidden('Изменение чужого алерта запрещено');

    const updated = await prisma.priceAlert.update({
      where: { id },
      data: { active },
    });

    return reply.send({ alert: updated });
  });

  // DELETE /api/price-alerts/:id — delete a specific alert (must belong to user)
  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.userId;
    const { id } = request.params as { id: string };

    const alert = await prisma.priceAlert.findUnique({ where: { id } });

    if (!alert) throw Errors.notFound('Алерт');
    if (alert.userId !== userId) throw Errors.forbidden('Удаление чужого алерта запрещено');

    // Soft-delete: deactivate instead of physically removing the record
    await prisma.priceAlert.update({
      where: { id },
      data: { active: false },
    });

    return reply.send({ success: true });
  });
}
