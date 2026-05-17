import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import { Errors } from '../lib/errors';

const MAX_ALERTS_PER_USER = 5;

const createAlertSchema = z.object({
  origin: z.string().min(2).max(10).toUpperCase(),
  destination: z.string().min(2).max(10).toUpperCase(),
  maxPrice: z.number().positive(),
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

    const { origin, destination, maxPrice } = parsed.data;

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
      data: { userId, origin, destination, maxPrice, active: true },
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
