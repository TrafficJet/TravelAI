// Stripe webhook route — public, no auth middleware, raw body required for signature verification
// POST /api/stripe/webhook

import { FastifyInstance, FastifyRequest } from 'fastify';
import { stripeWebhookHandler } from '../handlers/stripe-webhook.handler';

/**
 * Stripe routes plugin.
 *
 * Registers a custom content-type parser that captures the raw request bytes
 * alongside the parsed JSON body.  Stripe's signature verification requires
 * the exact raw bytes — re-serialising the parsed object would cause a mismatch.
 *
 * NOTE: No authentication middleware is applied here — Stripe calls this
 * endpoint from their servers.  Security is handled by HMAC-SHA256 signature
 * verification inside stripeWebhookHandler.
 */
export async function stripeRoutes(fastify: FastifyInstance) {
  // Buffer the raw body so the webhook handler can verify the Stripe signature
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req: FastifyRequest & { rawBody?: Buffer }, body: Buffer, done) => {
      try {
        req.rawBody = body;
        done(null, JSON.parse(body.toString('utf8')));
      } catch (err) {
        done(err as Error);
      }
    },
  );

  /**
   * POST /api/stripe/webhook
   * Stripe notifies us of payment status changes.
   * Authentication is done via HMAC-SHA256 signature in the stripe-signature header.
   */
  // Disable Fastify JSON schema validation — Stripe event shapes are complex and
  // not worth duplicating here; the handler validates what it needs.
  fastify.post('/webhook', stripeWebhookHandler);
}
