// POST /api/stripe/create-intent — create Stripe PaymentIntent for wallet top-up
// Auth required. Body: { amount: number } — amount in USD (min 1, max 10 000)

import { FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';
import StripeLib from 'stripe';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { Errors } from '../lib/errors';

type StripeInstance = InstanceType<typeof StripeLib>;

const createIntentSchema = z.object({
  amount: z.number().min(1).max(10000),
});

/**
 * POST /api/stripe/create-intent
 *
 * Creates a Stripe PaymentIntent and a PENDING WalletTransaction.
 * The webhook handler (stripe-webhook.handler.ts) listens for
 * payment_intent.succeeded and credits the wallet.
 *
 * Mock mode (STRIPE_SECRET_KEY not set):
 *   Returns { clientSecret: 'mock_secret_test', publishableKey: 'pk_test_mock', transactionId: uuid }
 *   so the mobile app can work without a real Stripe account in development.
 */
export async function createPaymentIntent(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = request.userId;

  const parsed = createIntentSchema.safeParse(request.body);
  if (!parsed.success) {
    throw Errors.validation('amount должен быть числом от 1 до 10000 (USD)');
  }

  const { amount } = parsed.data;
  const amountInCents = Math.round(amount * 100);

  // Ensure user has a wallet (create if missing)
  let wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: { userId, balance: 0, currency: 'USD' },
    });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY ?? 'pk_test_mock';

  // ── Mock mode ─────────────────────────────────────────────────────────────
  if (!stripeKey) {
    request.log.warn('[Stripe] STRIPE_SECRET_KEY not set — returning mock PaymentIntent');

    const mockTransactionId = randomUUID();

    // Create a PENDING WalletTransaction so the webhook can locate it later
    await prisma.walletTransaction.create({
      data: {
        id: mockTransactionId,
        walletId: wallet.id,
        amount,
        type: 'TOPUP',
        status: 'PENDING',
        description: `Пополнение кошелька на $${amount} (mock)`,
      },
    });

    reply.status(200).send({
      clientSecret: 'mock_secret_test',
      publishableKey: 'pk_test_mock',
      transactionId: mockTransactionId,
    });
    return;
  }

  // ── Real Stripe mode ──────────────────────────────────────────────────────
  const stripe: StripeInstance = new StripeLib(stripeKey, { apiVersion: '2026-04-22.dahlia' });

  // Pre-generate UUID so we can store it in Stripe metadata before the DB write
  const transactionId = randomUUID();

  let clientSecret: string;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      metadata: {
        userId,
        walletTransactionId: transactionId,
      },
    });

    if (!paymentIntent.client_secret) {
      throw new Error('Stripe did not return a client_secret');
    }

    clientSecret = paymentIntent.client_secret;
  } catch (err) {
    request.log.error({ err }, '[Stripe] Failed to create PaymentIntent');
    throw Errors.internal('Не удалось создать платёж. Повторите позже.');
  }

  // Create PENDING WalletTransaction linked to this PaymentIntent
  await prisma.walletTransaction.create({
    data: {
      id: transactionId,
      walletId: wallet.id,
      amount,
      type: 'TOPUP',
      status: 'PENDING',
      description: `Пополнение кошелька на $${amount}`,
    },
  });

  request.log.info(
    { transactionId, amountInCents, userId },
    '[Stripe] PaymentIntent created',
  );

  reply.status(200).send({
    clientSecret,
    publishableKey,
    transactionId,
  });
}
