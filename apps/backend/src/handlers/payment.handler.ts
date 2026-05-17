// Webhook handler for YooKassa payment events
// POST /api/payments/yookassa/webhook

import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';

// ─── YooKassa webhook payload shape ──────────────────────────────────────────

interface YooKassaAmount {
  value: string;
  currency: string;
}

interface YooKassaPaymentObject {
  id: string;
  status: string;
  paid: boolean;
  amount: YooKassaAmount;
  metadata?: {
    internalTransactionId?: string;
    userId?: string;
    [key: string]: string | undefined;
  };
}

interface YooKassaWebhookBody {
  type: string;
  event: string;
  object: YooKassaPaymentObject;
}

// ─── Signature verification ───────────────────────────────────────────────────

/**
 * Verify the HMAC-SHA256 signature sent by YooKassa.
 * YooKassa signs the raw request body with the shop's secret key.
 * Header: X-Payment-Signature
 */
function verifyWebhookSignature(
  rawBody: Buffer | string,
  signature: string,
  secretKey: string,
): boolean {
  const expected = crypto
    .createHmac('sha256', secretKey)
    .update(rawBody)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex'),
    );
  } catch {
    // Buffer lengths differ → invalid signature
    return false;
  }
}

// ─── Webhook handler ──────────────────────────────────────────────────────────

/**
 * POST /api/payments/yookassa/webhook
 *
 * Receives payment lifecycle events from YooKassa.
 * Only `payment.succeeded` is acted on — all other events return 200 OK silently.
 *
 * On success:
 *   1. Verify HMAC-SHA256 signature.
 *   2. Find the pending WalletTransaction by metadata.internalTransactionId.
 *   3. Credit the wallet and mark the transaction description as completed.
 */
export async function yookassaWebhook(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const secretKey = process.env.YOOKASSA_SECRET_KEY;

  if (!secretKey) {
    request.log.warn('[Payment] Webhook received but YOOKASSA_SECRET_KEY is not set');
    reply.status(500).send({ error: 'Payment gateway not configured' });
    return;
  }

  // ── Signature check ────────────────────────────────────────────────────────
  const signature = request.headers['x-payment-signature'];

  if (typeof signature !== 'string' || !signature) {
    request.log.warn('[Payment] Webhook missing X-Payment-Signature header');
    reply.status(400).send({ error: 'Missing signature' });
    return;
  }

  // rawBody is the original request bytes buffered by fastify-raw-body (config.rawBody = true).
  // We must sign the raw bytes — not JSON.stringify(body) — because key order or
  // whitespace differences would cause signature mismatch with what YooKassa signed.
  const rawBodyBuf = (request as FastifyRequest & { rawBody: Buffer }).rawBody;
  if (!rawBodyBuf) {
    request.log.error('[Payment] rawBody unavailable — fastify-raw-body plugin may not be configured');
    reply.status(400).send({ error: 'Raw body unavailable' });
    return;
  }

  const signatureValid = verifyWebhookSignature(rawBodyBuf, signature, secretKey);
  if (!signatureValid) {
    request.log.warn('[Payment] Webhook signature mismatch');
    reply.status(401).send({ error: 'Invalid signature' });
    return;
  }

  // ── Parse event ────────────────────────────────────────────────────────────
  const body = request.body as YooKassaWebhookBody;

  request.log.info({ event: body.event, paymentId: body.object?.id }, '[Payment] Webhook received');

  // Only handle successful payments
  if (body.event !== 'payment.succeeded') {
    reply.status(200).send({ ok: true });
    return;
  }

  const paymentObject = body.object;

  if (!paymentObject || paymentObject.status !== 'succeeded') {
    reply.status(200).send({ ok: true });
    return;
  }

  // ── Find internal transaction ──────────────────────────────────────────────
  const internalTransactionId = paymentObject.metadata?.internalTransactionId;

  if (!internalTransactionId) {
    request.log.error(
      { yookassaPaymentId: paymentObject.id },
      '[Payment] Webhook payment.succeeded has no internalTransactionId in metadata',
    );
    // Return 200 so YooKassa does not retry — this is a data issue, not a server error
    reply.status(200).send({ ok: true });
    return;
  }

  const existingTx = await prisma.walletTransaction.findUnique({
    where: { id: internalTransactionId },
    include: { wallet: true },
  });

  if (!existingTx) {
    request.log.error(
      { internalTransactionId, yookassaPaymentId: paymentObject.id },
      '[Payment] WalletTransaction not found',
    );
    reply.status(200).send({ ok: true });
    return;
  }

  // Guard against double-credit (idempotency): rely on the status field,
  // not on a text substring, to avoid false negatives when description changes.
  if (existingTx.status === 'COMPLETED') {
    request.log.info(
      { internalTransactionId },
      '[Payment] Duplicate webhook — transaction already credited',
    );
    reply.status(200).send({ ok: true });
    return;
  }

  // ── Credit the wallet atomically ───────────────────────────────────────────
  const creditAmount = Number(existingTx.amount);

  try {
    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: existingTx.walletId },
        data: { balance: { increment: creditAmount } },
      }),
      prisma.walletTransaction.update({
        where: { id: internalTransactionId },
        data: {
          status: 'COMPLETED',
          description: existingTx.description,
        },
      }),
    ]);

    request.log.info(
      { internalTransactionId, amount: creditAmount, walletId: existingTx.walletId },
      '[Payment] Wallet credited successfully',
    );
  } catch (err) {
    request.log.error({ err, internalTransactionId }, '[Payment] Failed to credit wallet');
    // Return 500 so YooKassa retries the webhook
    reply.status(500).send({ error: 'Internal error crediting wallet' });
    return;
  }

  reply.status(200).send({ ok: true });
}
