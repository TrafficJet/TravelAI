import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { notifyUser } from '../plugins/websocket.plugin';
import pino from 'pino';

const logger = pino({ name: 'priceAlert.worker' });

/**
 * Mock price check: returns a random price between 70% and 130% of the target.
 * Triggers (price <= target) roughly 20% of the time by biasing the range.
 */
function mockCheckPrice(targetPrice: number): number {
  const roll = Math.random();
  if (roll < 0.2) {
    // 20% chance: generate price AT or BELOW target (50%–100% of target)
    return targetPrice * (0.5 + Math.random() * 0.5);
  }
  // 80% chance: price above target (100%–150% of target)
  return targetPrice * (1.0 + Math.random() * 0.5);
}

/**
 * Single run of the price-alert check loop.
 * Exported so it can be called directly in tests or manually.
 *
 * Batching logic: if multiple alerts for the same user+route trigger in the
 * same cycle, they are grouped into a single notification to reduce noise.
 */
export async function runPriceAlertCheck(): Promise<void> {
  logger.info('Price alert worker: starting check cycle');

  const activeAlerts = await prisma.priceAlert.findMany({
    where: { active: true, triggeredAt: null },
  });

  logger.info({ count: activeAlerts.length }, 'Price alert worker: active alerts found');

  // Collect triggered alerts grouped by userId → Map<route, triggeredAlerts[]>
  type TriggeredItem = {
    alert: (typeof activeAlerts)[number];
    currentPrice: number;
  };
  const triggeredByUser = new Map<string, Map<string, TriggeredItem[]>>();

  for (const alert of activeAlerts) {
    try {
      const currentPrice = mockCheckPrice(alert.maxPrice);
      logger.debug(
        { alertId: alert.id, targetPrice: alert.maxPrice, currentPrice },
        'Price alert worker: checking alert',
      );

      if (currentPrice <= alert.maxPrice) {
        // Mark alert as triggered immediately
        await prisma.priceAlert.update({
          where: { id: alert.id },
          data: { triggeredAt: new Date() },
        });

        const routeKey = `${alert.origin}→${alert.destination}`;
        if (!triggeredByUser.has(alert.userId)) {
          triggeredByUser.set(alert.userId, new Map());
        }
        const userRoutes = triggeredByUser.get(alert.userId)!;
        if (!userRoutes.has(routeKey)) {
          userRoutes.set(routeKey, []);
        }
        userRoutes.get(routeKey)!.push({ alert, currentPrice });

        logger.info(
          { alertId: alert.id, userId: alert.userId, currentPrice },
          'Price alert worker: alert triggered, queued for batch notification',
        );
      }
    } catch (err) {
      logger.error({ err, alertId: alert.id }, 'Price alert worker: error processing alert');
    }
  }

  // Create notifications — one per user, batched when multiple routes triggered
  for (const [userId, routeMap] of triggeredByUser.entries()) {
    try {
      const routes = Array.from(routeMap.entries());
      const totalRoutes = routes.length;

      let title: string;
      let body: string;

      if (totalRoutes === 1) {
        // Single route — specific message
        const [routeKey, items] = routes[0];
        const lowestPrice = Math.min(...items.map((i) => i.currentPrice));
        const maxThreshold = Math.max(...items.map((i) => i.alert.maxPrice));
        title = `Цена снизилась: ${routeKey}`;
        body = `Текущая цена $${Math.round(lowestPrice)} не превышает ваш порог $${maxThreshold}. Бронируйте сейчас!`;
      } else {
        // Multiple routes — batch message
        title = `Цены изменились на ${totalRoutes} направлениях`;
        const routeList = routes
          .map(([routeKey, items]) => {
            const lowestPrice = Math.min(...items.map((i) => i.currentPrice));
            return `${routeKey}: от $${Math.round(lowestPrice)}`;
          })
          .join(', ');
        body = `Найдены выгодные цены: ${routeList}. Бронируйте сейчас!`;
      }

      const notification = await prisma.notification.create({
        data: {
          userId,
          type: 'PRICE_ALERT',
          title,
          body,
        },
      });

      // Push real-time notification via WebSocket (if connected)
      notifyUser(userId, notification);

      logger.info(
        { userId, routeCount: totalRoutes },
        'Price alert worker: batch notification created',
      );
    } catch (err) {
      logger.error({ err, userId }, 'Price alert worker: error creating batch notification');
    }
  }

  logger.info('Price alert worker: check cycle complete');
}

/**
 * Register the cron job on the Fastify instance lifecycle.
 * Schedule: every 30 minutes.
 */
export function registerPriceAlertWorker(): void {
  const task = cron.schedule('*/30 * * * *', async () => {
    await runPriceAlertCheck();
  });

  logger.info('Price alert worker: cron job registered (every 30 minutes)');

  // Graceful shutdown: stop cron when process terminates
  const stop = () => {
    task.stop();
    logger.info('Price alert worker: cron job stopped');
  };

  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}
