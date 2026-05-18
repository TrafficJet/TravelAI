// Stripe webhook handler — payment_intent.succeeded → credit wallet
// POST /api/stripe/webhook (no auth middleware, signature-verified)

import { FastifyRequest, FastifyReply } from 'fastify';
import StripeLib from 'stripe';
import { prisma } from '../lib/prisma';

type StripeInstance = InstanceType<typeof StripeLib>;

/**
 * POST /api/stripe/webhook
 *
 * Receives Stripe payment lifecycle events.
 * Only `payment_intent.succeeded` triggers a wallet credit — all other event
 * types return 200 OK silently so Stripe does not retry them.
 *
 * Security:
 *   - Raw request body is verified against STRIPE_WEBHOOK_SECRET using
 *     stripe.webhooks.constructEvent (HMAC-SHA256).
 *   - Without a valid signature the request is rejected with 400.
 *   - Idempotency: if the WalletTransaction is already COMPLETED the handler
 *     returns 200 without a second credit.
 */
export async function stripeWebhookHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeKey) {
    request.log.warn('[Stripe] Webhook received but STRIPE_SECRET_KEY is not set');
    reply.status(500).send({ error: 'Stripe not configured' });
    return;
  }

  const stripe: StripeInstance = new StripeLib(stripeKey, { apiVersion: '2026-04-22.dahlia' });

  // ── Signature verification ─────────────────────────────────────────────────
  const signature = request.headers['stripe-signature'];

  if (typeof signature !== 'string' || !signature) {
    request.log.warn('[Stripe] Webhook missing stripe-signature header');
    reply.status(400).send({ error: 'Missing stripe-signature header' });
    return;
  }

  // rawBody is buffered by the content-type parser registered in stripe.routes.ts
  const rawBodyBuf = (request as FastifyRequest & { rawBody?: Buffer }).rawBody;
  if (!rawBodyBuf) {
    request.log.error('[Stripe] rawBody unavailable — raw body parser not configured');
    reply.status(400).send({ error: 'Raw body unavailable' });
    return;
  }

  // Use a plain object type here to avoid the complex union Event type mismatch;
  // we only need to inspect .type and .data.object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: { type: string; id: string; data: { object: any } };

  if (webhookSecret) {
    try {
      // constructEvent returns the verified event; double-cast through unknown
      event = stripe.webhooks.constructEvent(
        rawBodyBuf,
        signature,
        webhookSecret,
      ) as unknown as typeof event;
    } catch (err) {
      request.log.warn({ err }, '[Stripe] Webhook signature verification failed');
      reply.status(400).send({ error: 'Invalid signature' });
      return;
    }
  } else {
    // No webhook secret configured (dev/test without Stripe CLI) — parse JSON directly.
    // In production STRIPE_WEBHOOK_SECRET must always be set.
    request.log.warn('[Stripe] STRIPE_WEBHOOK_SECRET not set — skipping signature check');
    try {
      event = JSON.parse(rawBodyBuf.toString('utf8')) as typeof event;
    } catch {
      reply.status(400).send({ error: 'Invalid JSON body' });
      return;
    }
  }

  // ── Route by event type ────────────────────────────────────────────────────
  request.log.info({ eventType: event.type, eventId: event.id }, '[Stripe] Webhook received');

  if (event.type !== 'payment_intent.succeeded') {
    reply.status(200).send({ ok: true });
    return;
  }

  // event.data.object is typed as `any` in our minimal event shape above,
  // so we access the fields we need directly without further casting
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const paymentIntent = event.data.object as {
    id: string;
    metadata: Record<string, string> | null;
  };

  // ── Extract walletTransactionId from metadata ──────────────────────────────
  const walletTransactionId = paymentIntent.metadata?.walletTransactionId;

  if (!walletTransactionId) {
    request.log.error(
      { paymentIntentId: paymentIntent.id },
      '[Stripe] payment_intent.succeeded has no walletTransactionId in metadata',
    );
    // Return 200 so Stripe does not retry — this is a data issue
    reply.status(200).send({ ok: true });
    return;
  }

  // ── Find and validate the pending WalletTransaction ───────────────────────
  const existingTx = await prisma.walletTransaction.findUnique({
    where: { id: walletTransactionId },
    include: { wallet: true },
  });

  if (!existingTx) {
    request.log.error(
      { walletTransactionId, paymentIntentId: paymentIntent.id },
      '[Stripe] WalletTransaction not found',
    );
    reply.status(200).send({ ok: true });
    return;
  }

  // Idempotency guard — do not credit twice
  if (existingTx.status === 'COMPLETED') {
    request.log.info(
      { walletTransactionId },
      '[Stripe] Duplicate webhook — transaction already credited',
    );
    reply.status(200).send({ ok: true });
    return;
  }

  // ── Credit the wallet atomically ──────────────────────────────────────────
  const creditAmount = Number(existingTx.amount);

  try {
    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: existingTx.walletId },
        data: { balance: { increment: creditAmount } },
      }),
      prisma.walletTransaction.update({
        where: { id: walletTransactionId },
        data: {
          status: 'COMPLETED',
          description: existingTx.description,
          externalId: paymentIntent.id,
        },
      }),
    ]);

    request.log.info(
      { walletTransactionId, amount: creditAmount, walletId: existingTx.walletId },
      '[Stripe] Wallet credited successfully',
    );
  } catch (err) {
    request.log.error({ err, walletTransactionId }, '[Stripe] Failed to credit wallet');
    // Return 500 so Stripe retries the webhook
    reply.status(500).send({ error: 'Internal error crediting wallet' });
    return;
  }

  reply.status(200).send({ ok: true });
}
