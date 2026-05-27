/**
 * priceAlertChecker.ts
 *
 * Background job that runs every 6 hours and checks all active price alerts.
 * For each triggered alert it sends an Expo push notification to the user.
 *
 * MVP: prices are mocked via Math.random() — replace with real API calls later.
 */

import pino from 'pino';
import { prisma } from '../lib/prisma';
import { sendExpoPush } from '../services/push.service';

const log = pino({ name: 'priceAlertChecker' });

const INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const RETRIGGER_AFTER_MS = 24 * 60 * 60 * 1000; // re-alert after 24 h

// ---------------------------------------------------------------------------
// Mock price generators (replace with real service calls in a later iteration)
// ---------------------------------------------------------------------------

/**
 * Mock flight price check.
 * Returns Math.random() * maxPrice * 1.2 so ~50 % of calls are below threshold.
 */
function mockFlightPrice(maxPrice: number): number {
  return Math.random() * maxPrice * 1.2;
}

/**
 * Mock hotel price check (price per night).
 */
function mockHotelPrice(maxPrice: number): number {
  return Math.random() * maxPrice * 1.2;
}

// ---------------------------------------------------------------------------
// Core check logic — exported for direct use in tests / manual invocations
// ---------------------------------------------------------------------------

export async function runPriceAlertCheckerOnce(): Promise<void> {
  log.info('priceAlertChecker: starting check cycle');

  const now = new Date();
  const retriggerCutoff = new Date(now.getTime() - RETRIGGER_AFTER_MS);

  // Fetch all active alerts that have never been triggered OR were triggered
  // more than 24 hours ago (so the user gets re-notified after a day).
  const alerts = await prisma.priceAlert.findMany({
    where: {
      active: true,
      OR: [
        { triggeredAt: null },
        { triggeredAt: { lt: retriggerCutoff } },
      ],
    },
    include: {
      user: {
        select: { pushToken: true },
      },
    },
  });

  log.info({ count: alerts.length }, 'priceAlertChecker: active alerts fetched');

  for (const alert of alerts) {
    try {
      const foundPrice =
        alert.type === 'hotel'
          ? mockHotelPrice(alert.maxPrice)
          : mockFlightPrice(alert.maxPrice);

      log.debug(
        { alertId: alert.id, type: alert.type, foundPrice, maxPrice: alert.maxPrice },
        'priceAlertChecker: checked alert',
      );

      if (foundPrice <= alert.maxPrice) {
        // Mark as triggered
        await prisma.priceAlert.update({
          where: { id: alert.id },
          data: { triggeredAt: now },
        });

        // Build notification text based on alert type
        let title: string;
        let body: string;

        if (alert.type === 'hotel') {
          title = `Цена упала! Отели в ${alert.city ?? 'выбранном городе'}`;
          body = `Нашли отель за $${Math.round(foundPrice)}/ночь — это ниже вашего лимита $${alert.maxPrice}!`;
        } else {
          title = `Цена упала! ${alert.origin} → ${alert.destination}`;
          body = `Нашли рейс за $${Math.round(foundPrice)} — это ниже вашего лимита $${alert.maxPrice}!`;
        }

        // Persist in-app notification
        await prisma.notification.create({
          data: {
            userId: alert.userId,
            type: 'PRICE_ALERT',
            title,
            body,
          },
        });

        // Send Expo push notification if the user has a valid push token
        const pushToken = alert.user?.pushToken;
        if (pushToken) {
          await sendExpoPush({
            pushToken,
            title,
            body,
            data: {
              alertId: alert.id,
              type: alert.type,
              foundPrice: Math.round(foundPrice),
              maxPrice: alert.maxPrice,
            },
          });
        }

        log.info(
          { alertId: alert.id, userId: alert.userId, foundPrice: Math.round(foundPrice) },
          'priceAlertChecker: alert triggered, notification sent',
        );
      }
    } catch (err) {
      log.error({ err, alertId: alert.id }, 'priceAlertChecker: error processing alert');
    }
  }

  log.info('priceAlertChecker: check cycle complete');
}

// ---------------------------------------------------------------------------
// Scheduler — wraps the check in a repeating setInterval
// ---------------------------------------------------------------------------

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export const priceAlertChecker = {
  /**
   * Start the background job.
   * Runs immediately on start, then every 6 hours.
   * Safe to call multiple times — duplicate calls are ignored.
   */
  start(): void {
    if (intervalHandle !== null) {
      log.warn('priceAlertChecker: already running, ignoring duplicate start()');
      return;
    }

    log.info('priceAlertChecker: starting (interval = 6 h)');

    // Run immediately on startup, then on each interval
    runPriceAlertCheckerOnce().catch((err) => {
      log.error({ err }, 'priceAlertChecker: initial run failed');
    });

    intervalHandle = setInterval(() => {
      runPriceAlertCheckerOnce().catch((err) => {
        log.error({ err }, 'priceAlertChecker: scheduled run failed');
      });
    }, INTERVAL_MS);

    // Graceful shutdown
    const stop = () => this.stop();
    process.once('SIGTERM', stop);
    process.once('SIGINT', stop);
  },

  /** Stop the background job and clear the interval. */
  stop(): void {
    if (intervalHandle !== null) {
      clearInterval(intervalHandle);
      intervalHandle = null;
      log.info('priceAlertChecker: stopped');
    }
  },
};
