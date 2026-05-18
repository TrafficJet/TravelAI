import 'dotenv/config';
import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';

// Plugins
import prismaPlugin from './plugins/prisma.plugin';
import corsPlugin from './plugins/cors.plugin';
import { registerErrorHandler } from './plugins/error-handler.plugin';
import websocketPlugin from './plugins/websocket.plugin';

// Routes
import { authRoutes } from './routes/auth.routes';
import { usersRoutes } from './routes/users.routes';
import { walletRoutes } from './routes/wallet.routes';
import { subscriptionsRoutes } from './routes/subscriptions.routes';
import { chatRoutes } from './routes/chat.routes';
import { bookingsRoutes } from './routes/bookings.routes';
import { searchRoutes } from './routes/search.routes';
import { flightsRoutes } from './routes/flights.routes';
import { hotelsRoutes } from './routes/hotels.routes';
import { paymentRoutes } from './routes/payment.routes';
import { adminRoutes } from './routes/admin.routes';
import { analyticsRoutes } from './routes/analytics.routes';
import { healthRoutes } from './routes/health.routes';
import { searchHistoryRoutes } from './routes/search-history.routes';
import { priceAlertsRoutes } from './routes/price-alerts.routes';
import { notificationsRoutes } from './routes/notifications.routes';
import { integrationsRoutes } from './routes/integrations.routes';
import { favoritesRoutes } from './routes/favorites.routes';
import { stripeRoutes } from './routes/stripe.routes';

// Workers
import { registerPriceAlertWorker } from './workers/priceAlert.worker';

// Seed
import { ensureDemoUser } from './lib/seedDemo';
import { prisma } from './lib/prisma';

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

// ── Global crash guards — must be registered before any async work ────────────
// These ensure every unhandled error is visible in Railway logs regardless of
// pino log level, then exit with a non-zero code so Railway marks the deploy
// as failed and shows the error in the dashboard.

process.on('uncaughtException', (err) => {
  console.error('[FATAL] uncaughtException:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] unhandledRejection:', reason);
  process.exit(1);
});

async function buildServer() {
  console.error('[STARTUP] Creating Fastify instance...');
  const fastify = Fastify({
    logger: {
      transport:
        process.env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
      // Use 'info' even in production so startup messages are visible
      level: 'info',
    },
    // Increase body limit for chat messages
    bodyLimit: 1048576, // 1MB
  });

  console.error('[STARTUP] Registering rate-limit plugin...');
  // Rate limiting: global 100 req/min, stricter 10 req/min for /auth/*
  await fastify.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: 60_000, // 1 minute
    keyGenerator: (req) => req.ip,
    errorResponseBuilder: (_req, context) => ({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests. Please retry after ${context.after}.`,
      },
    }),
  });

  console.error('[STARTUP] Registering helmet plugin...');
  // Security headers via Helmet
  await fastify.register(helmet, {
    // Allow SSE connections from mobile app (cross-origin)
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  console.error('[STARTUP] Registering prisma plugin...');
  await fastify.register(prismaPlugin);

  console.error('[STARTUP] Registering cors plugin...');
  await fastify.register(corsPlugin);

  console.error('[STARTUP] Registering websocket plugin...');
  await fastify.register(websocketPlugin);

  console.error('[STARTUP] Registering error handler...');
  // Global error handler: convert AppError to structured JSON response
  registerErrorHandler(fastify);

  console.error('[STARTUP] Registering routes...');
  // Register all route groups under /api prefix
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(usersRoutes, { prefix: '/api/users' });
  await fastify.register(walletRoutes, { prefix: '/api/wallet' });
  await fastify.register(subscriptionsRoutes, { prefix: '/api/subscriptions' });
  await fastify.register(chatRoutes, { prefix: '/api/chat' });
  await fastify.register(bookingsRoutes, { prefix: '/api/bookings' });
  await fastify.register(searchRoutes, { prefix: '/api/search' });
  await fastify.register(flightsRoutes, { prefix: '/api/flights' });
  await fastify.register(hotelsRoutes, { prefix: '/api/hotels' });
  await fastify.register(paymentRoutes, { prefix: '/api/payments' });
  await fastify.register(adminRoutes, { prefix: '/admin' });
  await fastify.register(analyticsRoutes, { prefix: '/api/analytics' });
  await fastify.register(searchHistoryRoutes, { prefix: '/api/search-history' });
  // Alias: mobile client uses /api/search/history — serve the same handler
  await fastify.register(searchHistoryRoutes, { prefix: '/api/search/history' });
  await fastify.register(priceAlertsRoutes, { prefix: '/api/price-alerts' });
  await fastify.register(notificationsRoutes, { prefix: '/api/notifications' });
  await fastify.register(favoritesRoutes, { prefix: '/api/users/me/favorites' });

  // Stripe webhook — public (no auth), raw body for signature verification
  await fastify.register(stripeRoutes, { prefix: '/api/stripe' });

  // Integration status — public monitoring endpoint
  await fastify.register(integrationsRoutes, { prefix: '/api/integrations' });

  // Health check — registered WITHOUT auth middleware
  await fastify.register(healthRoutes, { prefix: '/health' });

  console.error('[STARTUP] All plugins and routes registered.');
  return fastify;
}

async function start() {
  try {
    console.error('[STARTUP] Building server...');
    const fastify = await buildServer();

    console.error(`[STARTUP] Starting listener on ${HOST}:${PORT}...`);
    await fastify.listen({ port: PORT, host: HOST });
    console.error(`[STARTUP] Server is up and listening on http://${HOST}:${PORT}`);

    // Seed demo user with PREMIUM subscription on every startup (idempotent)
    await ensureDemoUser(prisma);

    // Start background workers after server is listening
    registerPriceAlertWorker();

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      fastify.log.info(`Received ${signal}, shutting down gracefully...`);
      await fastify.close();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('[FATAL] Server failed to start:', err);
    process.exit(1);
  }
}

start();
