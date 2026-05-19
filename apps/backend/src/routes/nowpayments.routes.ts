// NOWPayments routes:
//   POST /api/webhooks/nowpayments — public IPN callback, HMAC-verified via rawBody

import { FastifyInstance, FastifyRequest } from 'fastify';
import { nowpaymentsWebhook } from '../handlers/crypto-deposit.handler';

/**
 * NOWPayments IPN webhook route plugin.
 *
 * Registers a scoped content-type parser that captures the raw request bytes
 * alongside the parsed JSON body.  NOWPayments signature verification (HMAC-SHA512)
 * requires the exact raw bytes — re-serialising the parsed object would cause a
 * mismatch and signature check would always fail (or, without rawBody, be silently
 * skipped — the HIGH security bug this file fixes).
 *
 * The route has no JWT authentication: NOWPayments calls it from their servers.
 * Security is enforced by HMAC-SHA512 signature verification inside nowpaymentsWebhook.
 */
export async function nowpaymentsRoutes(fastify: FastifyInstance) {
  // Buffer the raw body so the webhook handler can verify the NOWPayments signature.
  // This parser is scoped to this plugin only and does not affect other routes.
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req: FastifyRequest & { rawBody?: Buffer }, body: Buffer, done: (err: Error | null, body?: unknown) => void) => {
      try {
        (req as FastifyRequest & { rawBody?: Buffer }).rawBody = body;
        done(null, JSON.parse(body.toString('utf8')));
      } catch (err) {
        done(err as Error);
      }
    },
  );

  /**
   * POST /api/webhooks/nowpayments
   * NOWPayments notifies us of payment status changes (IPN = Instant Payment Notification).
   * Authentication is done via HMAC-SHA512 signature in the x-nowpayments-sig header.
   */
  fastify.post('/nowpayments', nowpaymentsWebhook);
}
