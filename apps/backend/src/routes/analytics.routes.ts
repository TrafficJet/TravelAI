import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { verifyAccessToken } from '../lib/jwt';
import { authenticate } from '../middleware/auth.middleware';

// Zod schema for a single analytics event
const analyticsEventSchema = z.object({
  event: z.string().min(1).max(200),
  properties: z.record(z.unknown()).optional(),
  sessionId: z.string().optional(),
  platform: z.string().optional(),
  appVersion: z.string().optional(),
  timestamp: z.string().optional(),
});

// Batch body schema — max 50 events per request
const batchBodySchema = z.object({
  events: z.array(analyticsEventSchema).min(1).max(50),
});

// Try to extract userId from Bearer token if present (optional auth)
function tryGetUserId(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const payload = verifyAccessToken(authHeader.slice(7));
    return payload.sub;
  } catch {
    return null;
  }
}

export async function analyticsRoutes(fastify: FastifyInstance) {
  // POST /api/analytics/events — batch-insert analytics events (auth optional)
  fastify.post('/events', async (request, reply) => {
    const parseResult = batchBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(422).send({
        error: { code: 'VALIDATION_ERROR', message: parseResult.error.message },
      });
    }

    const userId = tryGetUserId(request);
    const { events } = parseResult.data;

    // Build records for createMany
    const data = events.map((e) => ({
      event: e.event,
      properties: (e.properties ?? {}) as object,
      sessionId: e.sessionId ?? null,
      platform: e.platform ?? 'mobile',
      appVersion: e.appVersion ?? null,
      userId,
      // Use provided timestamp as createdAt if given, otherwise default(now()) takes over
      ...(e.timestamp ? { createdAt: new Date(e.timestamp) } : {}),
    }));

    await prisma.analyticsEvent.createMany({ data });

    return reply.code(201).send({ ok: true, inserted: data.length });
  });

  // GET /api/analytics/events — list events for the authenticated user (pagination)
  fastify.get(
    '/events',
    { preHandler: authenticate },
    async (request, reply) => {
      const query = request.query as { limit?: string; offset?: string };
      const limit = Math.min(Number(query.limit ?? 50), 200);
      const offset = Number(query.offset ?? 0);

      const userId = request.userId;

      const [events, total] = await Promise.all([
        prisma.analyticsEvent.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.analyticsEvent.count({ where: { userId } }),
      ]);

      return reply.send({ events, total, limit, offset });
    },
  );
}
