import { FastifyInstance, FastifyRequest } from 'fastify';
import { yookassaWebhook } from '../handlers/payment.handler';

// Payment routes — public (no auth): YooKassa calls this from their servers
export async function paymentRoutes(fastify: FastifyInstance) {
  // Override JSON content-type parser in this scope to capture raw bytes.
  // This allows HMAC-SHA256 verification of the original YooKassa payload,
  // because JSON.stringify(parsed) can differ in key order / whitespace.
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
   * POST /api/payments/yookassa/webhook
   * YooKassa notifies us of payment status changes.
   * Authentication is done via HMAC-SHA256 signature in X-Payment-Signature header.
   */
  fastify.post('/yookassa/webhook', {
    schema: {
      body: {
        type: 'object',
        required: ['type', 'event', 'object'],
        properties: {
          type: { type: 'string' },
          event: { type: 'string' },
          object: { type: 'object' },
        },
      },
    },
    handler: yookassaWebhook,
  });
}
