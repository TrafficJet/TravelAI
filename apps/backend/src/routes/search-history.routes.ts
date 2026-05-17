import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import { Errors } from '../lib/errors';

// Search history routes — all require authentication
export async function searchHistoryRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // GET /api/search-history — last 20 searches for the authenticated user (newest first)
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.userId;

    const history = await prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        query: true,
        type: true,
        results: true,
        createdAt: true,
      },
    });

    return reply.send({ data: history });
  });

  // GET /api/search-history/:id — details of a single search record
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.userId;
    const { id } = request.params as { id: string };

    const record = await prisma.searchHistory.findUnique({
      where: { id },
      select: {
        id: true,
        query: true,
        type: true,
        results: true,
        createdAt: true,
        userId: true,
      },
    });

    if (!record) throw Errors.notFound('Запись истории поиска');
    if (record.userId !== userId) throw Errors.forbidden('Запись не принадлежит пользователю');

    // Strip internal userId from the response
    const { userId: _uid, ...data } = record;
    return reply.send({ data });
  });

  // DELETE /api/search-history/:id — delete a single search history record
  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.userId;
    const { id } = request.params as { id: string };

    const record = await prisma.searchHistory.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!record) throw Errors.notFound('Запись истории поиска');
    if (record.userId !== userId) throw Errors.forbidden('Запись не принадлежит пользователю');

    await prisma.searchHistory.delete({ where: { id } });

    return reply.send({ success: true });
  });

  // DELETE /api/search-history — clear all search history for the authenticated user
  fastify.delete('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.userId;

    const { count } = await prisma.searchHistory.deleteMany({ where: { userId } });

    return reply.send({ success: true, deleted: count });
  });
}
