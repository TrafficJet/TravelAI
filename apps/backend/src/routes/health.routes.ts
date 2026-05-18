import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { getActiveConnectionCount } from '../plugins/websocket.plugin';
import { searchCache } from '../lib/searchCache';

// Health check routes — no auth middleware
export async function healthRoutes(fastify: FastifyInstance) {
  // GET /health — full liveness check with DB probe, WS stats, and cache metrics
  fastify.get('/', async (_request, reply) => {
    let dbStatus: 'ok' | 'error' = 'error';
    let activeAlerts = 0;

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'ok';
    } catch {
      dbStatus = 'error';
    }

    // Count active price alerts in the DB (best-effort; 0 on DB error)
    try {
      activeAlerts = await prisma.priceAlert.count({ where: { active: true } });
    } catch {
      activeAlerts = 0;
    }

    const body = {
      status: 'ok' as const,
      db: dbStatus,
      version: '2.1.0',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus === 'ok' ? 'connected' : 'error',
        ai: process.env.ANTHROPIC_API_KEY ? 'available' : 'unconfigured',
        cache: searchCache.size >= 0 ? 'active' : 'error',
      },
      // Extended metrics for internal monitoring
      uptime: process.uptime(),
      websocketConnections: getActiveConnectionCount(),
      cacheSize: searchCache.size,
      activeAlerts,
    };

    const statusCode = dbStatus === 'ok' ? 200 : 503;
    return reply.status(statusCode).send(body);
  });

  // GET /health/ready — minimal readiness probe for Railway / K8s; checks DB connectivity
  fastify.get('/ready', async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return reply.send({ ready: true });
    } catch (error) {
      return reply.status(503).send({ ready: false, error: 'Database unavailable' });
    }
  });

  // GET /health/providers — diagnostic endpoint: which 3rd-party integrations are configured
  // Returns whether each provider key is present in env and which mode (real/mock) is active.
  fastify.get('/providers', async (_request, reply) => {
    const duffelKey = process.env.DUFFEL_API_KEY;
    const aviasalesToken = process.env.AVIASALES_TOKEN;
    const yookassaShopId = process.env.YOOKASSA_SHOP_ID;
    const yookassaSecret = process.env.YOOKASSA_SECRET_KEY;
    const stripeKey = process.env.STRIPE_SECRET_KEY;

    return reply.send({
      duffel: {
        configured: Boolean(duffelKey),
        mode: duffelKey ? 'real' : 'mock',
      },
      aviasales: {
        configured: Boolean(aviasalesToken),
      },
      yookassa: {
        configured: Boolean(yookassaShopId && yookassaSecret),
      },
      stripe: {
        configured: Boolean(stripeKey),
        mode: stripeKey ? 'real' : 'mock',
      },
    });
  });
}
