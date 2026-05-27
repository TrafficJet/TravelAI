import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';
import { Errors } from '../lib/errors';
import {
  createPayment,
  verifyWebhookSignature,
  buildPayCurrency,
  buildCryptoUri,
  normalizeDepositStatus,
  isDepositFinalized,
} from '../services/nowpayments.service';

const SUPPORTED_CURRENCIES = ['BTC', 'ETH', 'USDT', 'USDC', 'TON', 'LTC'] as const;
const NETWORK_DEFAULTS: Record<string, string> = {
  USDT: 'TRC20',
  USDC: 'ERC20',
  BTC:  'BTC',
  ETH:  'ERC20',
  TON:  'TON',
  LTC:  'LTC',
};

// POST /api/wallet/crypto-deposit — initiate a crypto top-up
export async function initCryptoDeposit(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId;
  const body = request.body as { amount: number; currency: string; network?: string };

  const { amount, currency, network } = body;

  if (!amount || amount < 2 || amount > 10000) {
    return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Сумма: $2 — $10,000' });
  }
  if (!SUPPORTED_CURRENCIES.includes(currency as (typeof SUPPORTED_CURRENCIES)[number])) {
    return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Неподдерживаемая валюта' });
  }

  const payCurrency = buildPayCurrency(currency, network);
  const payNetwork  = network ?? NETWORK_DEFAULTS[currency] ?? currency;

  // Create a PENDING record first so we have an orderId before calling NOWPayments
  const deposit = await prisma.cryptoDeposit.create({
    data: {
      userId,
      priceAmount:   amount,
      priceCurrency: 'USD',
      payCurrency,
      payNetwork,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  // No API key — return a mock response for local development
  if (!process.env.NOWPAYMENTS_API_KEY) {
    const mockAddress = 'MOCK_ADDRESS_' + deposit.id.slice(0, 8).toUpperCase();
    await prisma.cryptoDeposit.update({
      where: { id: deposit.id },
      data: {
        nowPaymentId: 'mock_' + deposit.id,
        payAddress:   mockAddress,
        payAmount:    amount * 1.01,
        status:       'WAITING',
      },
    });
    return reply.status(201).send({
      depositId:     deposit.id,
      payAddress:    mockAddress,
      payAmount:     amount * 1.01,
      payCurrency:   currency,
      priceAmount:   amount,
      priceCurrency: 'USD',
      expiresAt:     deposit.expiresAt.toISOString(),
      qrData:        mockAddress,
      _mock:         true,
    });
  }

  try {
    const callbackUrl = `${process.env.API_BASE_URL ?? 'https://localhost:3000'}/api/webhooks/nowpayments`;
    const payment = await createPayment({
      priceAmount:  amount,
      payCurrency,
      orderId:      deposit.id,
      callbackUrl,
    });

    const updated = await prisma.cryptoDeposit.update({
      where: { id: deposit.id },
      data: {
        nowPaymentId: payment.payment_id,
        payAddress:   payment.pay_address,
        payAmount:    payment.pay_amount,
        status:       'WAITING',
        expiresAt:    new Date(payment.expiration_estimate_date),
      },
    });

    return reply.status(201).send({
      depositId:     updated.id,
      payAddress:    payment.pay_address,
      payAmount:     payment.pay_amount,
      payCurrency:   payment.pay_currency.toUpperCase(),
      priceAmount:   amount,
      priceCurrency: 'USD',
      expiresAt:     payment.expiration_estimate_date,
      qrData:        buildCryptoUri(currency, payment.pay_address, payment.pay_amount),
    });
  } catch (err: unknown) {
    await prisma.cryptoDeposit.update({
      where: { id: deposit.id },
      data: { status: 'FAILED' },
    });
    request.log.error({ err, depositId: deposit.id }, 'NOWPayments createPayment failed');
    throw Errors.internal('Не удалось создать платёж. Попробуйте позже.');
  }
}

// GET /api/wallet/crypto-deposit/:depositId — poll deposit status
export async function getCryptoDepositStatus(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId;
  const { depositId } = request.params as { depositId: string };

  const deposit = await prisma.cryptoDeposit.findFirst({
    where: { id: depositId, userId },
    select: {
      id:          true,
      status:      true,
      payAddress:  true,
      payAmount:   true,
      payCurrency: true,
      priceAmount: true,
      expiresAt:   true,
      confirmedAt: true,
      txHash:      true,
    },
  });

  if (!deposit) throw Errors.notFound('Депозит');

  return reply.send(deposit);
}

// POST /api/webhooks/nowpayments — IPN callback (no auth, HMAC-verified)
export async function nowpaymentsWebhook(request: FastifyRequest, reply: FastifyReply) {
  const signature = request.headers['x-nowpayments-sig'] as string | undefined;

  if (!signature) {
    request.log.warn('nowpayments webhook: missing signature');
    return reply.status(401).send({ error: 'MISSING_SIGNATURE' });
  }

  const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody;
  if (rawBody && !verifyWebhookSignature(rawBody, signature)) {
    request.log.warn('nowpayments webhook: invalid signature');
    return reply.status(401).send({ error: 'INVALID_SIGNATURE' });
  }

  const payload = request.body as {
    payment_id:     string;
    payment_status: string;
    price_amount:   number;
    order_id:       string;
    payin_hash?:    string;
  };

  const { payment_id, payment_status, order_id, price_amount, payin_hash } = payload;

  request.log.info({ payment_id, payment_status, order_id }, 'nowpayments webhook received');

  const deposit = await prisma.cryptoDeposit.findUnique({ where: { id: order_id } });

  if (!deposit) {
    // Unknown order — return 200 so NOWPayments does not retry indefinitely
    return reply.status(200).send({ ok: true });
  }

  // Idempotency guard: ignore callbacks for already-finalized deposits
  if (deposit.status === 'CONFIRMED' || deposit.status === 'FINISHED') {
    return reply.status(200).send({ ok: true });
  }

  const normalizedStatus = normalizeDepositStatus(payment_status);

  await prisma.cryptoDeposit.update({
    where: { id: order_id },
    data: {
      status:       normalizedStatus as Parameters<typeof prisma.cryptoDeposit.update>[0]['data']['status'],
      txHash:       payin_hash ?? deposit.txHash,
      confirmedAt:  isDepositFinalized(normalizedStatus) ? new Date() : undefined,
      nowPaymentId: payment_id,
    },
  });

  if (isDepositFinalized(normalizedStatus)) {
    const wallet = await prisma.wallet.findUnique({ where: { userId: deposit.userId } });
    if (wallet) {
      await prisma.$transaction([
        prisma.wallet.update({
          where: { userId: deposit.userId },
          data:  { balance: { increment: price_amount } },
        }),
        prisma.walletTransaction.create({
          data: {
            walletId:    wallet.id,
            amount:      price_amount,
            type:        'TOPUP',
            status:      'COMPLETED',
            description: `Crypto deposit (${deposit.payCurrency})`,
            externalId:  payment_id,
          },
        }),
      ]);

      request.log.info(
        { userId: deposit.userId, amount: price_amount },
        'wallet credited from crypto deposit',
      );
    }
  }

  return reply.status(200).send({ ok: true });
}
