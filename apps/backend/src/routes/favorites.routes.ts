import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Prisma } from '@prisma/client';
import { authenticate } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import { Errors } from '../lib/errors';

interface FavoriteBody {
  type: string;
  itemId: string;
  itemData: Prisma.InputJsonValue;
}

interface FavoriteParams {
  itemId: string;
}

interface FavoriteQuery {
  type?: string;
}

// Favorites routes — all require JWT authentication
export async function favoritesRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // GET /api/users/me/favorites — список избранного текущего пользователя
  // Query: ?type=hotel|flight (необязательный фильтр по типу)
  fastify.get('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['hotel', 'flight'] },
        },
      },
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!;
      const { type } = request.query as FavoriteQuery;

      const favorites = await prisma.favorite.findMany({
        where: {
          userId,
          ...(type ? { type } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({ favorites, total: favorites.length });
    },
  });

  // POST /api/users/me/favorites — добавить элемент в избранное
  // Body: { type: 'hotel'|'flight', itemId: string, itemData: object }
  fastify.post('/', {
    schema: {
      body: {
        type: 'object',
        required: ['type', 'itemId', 'itemData'],
        properties: {
          type: { type: 'string', enum: ['hotel', 'flight'] },
          itemId: { type: 'string', minLength: 1 },
          itemData: { type: 'object' },
        },
      },
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!;
      const { type, itemId, itemData } = request.body as FavoriteBody;

      // Проверяем, не существует ли уже такая запись
      const existing = await prisma.favorite.findUnique({
        where: { userId_type_itemId: { userId, type, itemId } },
      });

      if (existing) {
        throw Errors.conflict('Элемент уже добавлен в избранное');
      }

      const favorite = await prisma.favorite.create({
        data: { userId, type, itemId, itemData },
      });

      return reply.status(201).send({ favorite });
    },
  });

  // DELETE /api/users/me/favorites/:itemId — удалить из избранного
  // Query: ?type=hotel|flight (обязательный параметр)
  fastify.delete('/:itemId', {
    schema: {
      params: {
        type: 'object',
        required: ['itemId'],
        properties: {
          itemId: { type: 'string', minLength: 1 },
        },
      },
      querystring: {
        type: 'object',
        required: ['type'],
        properties: {
          type: { type: 'string', enum: ['hotel', 'flight'] },
        },
      },
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!;
      const { itemId } = request.params as FavoriteParams;
      const { type } = request.query as FavoriteQuery;

      if (!type) {
        throw Errors.validation('Параметр type обязателен (hotel или flight)');
      }

      const favorite = await prisma.favorite.findUnique({
        where: { userId_type_itemId: { userId, type, itemId } },
      });

      if (!favorite) {
        throw Errors.notFound('Избранное');
      }

      if (favorite.userId !== userId) {
        throw Errors.forbidden('Нет доступа к этому элементу избранного');
      }

      await prisma.favorite.delete({
        where: { userId_type_itemId: { userId, type, itemId } },
      });

      return reply.send({ success: true });
    },
  });

  // GET /api/users/me/favorites/check/:itemId — проверить наличие в избранном
  // Query: ?type=hotel|flight (обязательный параметр)
  // Должен быть объявлен ПЕРЕД /:itemId чтобы не конфликтовать
  fastify.get('/check/:itemId', {
    schema: {
      params: {
        type: 'object',
        required: ['itemId'],
        properties: {
          itemId: { type: 'string', minLength: 1 },
        },
      },
      querystring: {
        type: 'object',
        required: ['type'],
        properties: {
          type: { type: 'string', enum: ['hotel', 'flight'] },
        },
      },
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!;
      const { itemId } = request.params as FavoriteParams;
      const { type } = request.query as FavoriteQuery;

      if (!type) {
        throw Errors.validation('Параметр type обязателен (hotel или flight)');
      }

      const favorite = await prisma.favorite.findUnique({
        where: { userId_type_itemId: { userId, type, itemId } },
      });

      return reply.send({ isFavorite: favorite !== null });
    },
  });
}
