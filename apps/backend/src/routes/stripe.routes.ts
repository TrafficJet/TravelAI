// Stripe routes:
//   POST /api/stripe/webhook      — public, Stripe HMAC-verified
//   POST /api/stripe/create-intent — auth required, creates PaymentIntent for wallet top-up

import { FastifyInstance, FastifyRequest } from 'fastify';
import { stripeWebhookHandler } from '../handlers/stripe-webhook.handler';
import { createPaymentIntent } from '../handlers/stripe-topup.handler';
import { authenticate } from '../middleware/auth.middleware';

/**
 * Stripe routes plugin.
 *
 * Registers a custom content-type parser that captures the raw request bytes
 * alongside the parsed JSON body.  Stripe's signature verification requires
 * the exact raw bytes — re-serialising the parsed object would cause a mismatch.
 *
 * NOTE: The webhook route has no authentication middleware — Stripe calls it
 * from their servers.  Security is handled by HMAC-SHA256 signature verification
 * inside stripeWebhookHandler.
 *
 * The create-intent route uses JWT authenticate middleware.
 */
export async function stripeRoutes(fastify: FastifyInstance) {
  // Buffer the raw body so the webhook handler can verify the Stripe signature.
  // This parser is scoped to this plugin only.
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
  fastify.post('/webhook', stripeWebhookHandler);

  /**
   * Protected sub-scope — requires valid JWT.
   * POST /api/stripe/create-intent — create PaymentIntent for wallet top-up.
   */
  fastify.register(async (protectedScope) => {
    protectedScope.addHook('preHandler', authenticate);

    // POST /api/stripe/create-intent
    // Body: { amount: number } — amount in USD (min 1, max 10 000)
    // Returns: { clientSecret, publishableKey, transactionId }
    protectedScope.post('/create-intent', {
      schema: {
        body: {
          type: 'object',
          required: ['amount'],
          properties: {
            amount: { type: 'number', minimum: 1, maximum: 10000 },
          },
          additionalProperties: false,
        },
      },
      handler: createPaymentIntent,
    });
  });
}
