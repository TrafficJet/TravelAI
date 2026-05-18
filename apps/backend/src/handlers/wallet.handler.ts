import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';
import { Errors } from '../lib/errors';
import { processCardTopup, createStripeTopup, isStripeConfigured } from '../services/payment.service';

const ALLOWED_TOPUP_AMOUNTS = [500, 1000, 2000, 5000] as const;
type AllowedTopupAmount = (typeof ALLOWED_TOPUP_AMOUNTS)[number];

interface TopupBody {
  amount: AllowedTopupAmount;
  paymentMethod: 'CARD';
}

interface TransactionsQuery {
  page?: number;
  limit?: number;
  type?: 'TOPUP' | 'DEBIT';
}

function formatTransaction(tx: {
  id: string;
  amount: { toString: () => string };
  type: string;
  status: string;
  description: string;
  bookingId: string | null;
  createdAt: Date;
}) {
  return {
    id: tx.id,
    amount: tx.amount.toString(),
    type: tx.type,
    status: tx.status,
    description: tx.description,
    bookingId: tx.bookingId,
    createdAt: tx.createdAt.toISOString(),
  };
}

// GET /api/wallet — current balance and last 10 transactions
export async function getWallet(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId;

  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!wallet) {
    throw Errors.notFound('Кошелёк');
  }

  // Normalize legacy RUB wallets to USD — all prices in app are in USD
  const normalizedCurrency = wallet.currency === 'RUB' ? 'USD' : wallet.currency;

  return reply.send({
    balance: wallet.balance.toString(),
    currency: normalizedCurrency,
    transactions: wallet.transactions.map(formatTransaction),
  });
}

/**
 * POST /api/wallet/topup — initiate a funds top-up.
 *
 * Three flows (checked in priority order):
 *   1. Stripe configured (STRIPE_SECRET_KEY set) →
 *        create pending WalletTransaction, return { status: 'pending', mode: 'stripe', clientSecret, paymentIntentId }.
 *        Funds are credited by POST /api/stripe/webhook after payment_intent.succeeded.
 *
 *   2. YooKassa configured (YOOKASSA_SHOP_ID + YOOKASSA_SECRET_KEY set) →
 *        create pending WalletTransaction, return { status: 'pending', mode: 'yookassa', paymentUrl, paymentId }.
 *        Funds are credited by POST /api/payments/yookassa/webhook after payment.succeeded.
 *
 *   3. Mock mode (no payment keys) →
 *        atomically credit the wallet immediately, return new balance.
 */
export async function topupWallet(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId;
  const { amount } = request.body as TopupBody;

  if (!(ALLOWED_TOPUP_AMOUNTS as readonly number[]).includes(amount)) {
    return reply.status(400).send({
      error: {
        code: 'BAD_REQUEST',
        message: 'Недопустимая сумма пополнения',
        allowedAmounts: ALLOWED_TOPUP_AMOUNTS,
      },
    });
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    throw Errors.notFound('Кошелёк');
  }

  // ── Flow 1: Stripe ─────────────────────────────────────────────────────────
  if (isStripeConfigured()) {
    // Step 1: create a PENDING transaction record
    const pendingTx = await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount,
        type: 'TOPUP',
        status: 'PENDING',
        description: `Wallet top-up ${amount} ${wallet.currency} (awaiting payment)`,
      },
    });

    // Step 2: create the Payment Intent in Stripe
    let stripeResult;
    try {
      stripeResult = await createStripeTopup({
        amount,
        currency: wallet.currency.toLowerCase() === 'rub' ? 'usd' : wallet.currency.toLowerCase(),
        userId,
        walletTransactionId: pendingTx.id,
      });
    } catch (err) {
      await prisma.walletTransaction.delete({ where: { id: pendingTx.id } });
      request.log.error({ err }, '[Stripe] createPaymentIntent failed');
      throw Errors.internal('Не удалось создать платёж. Попробуйте позже.');
    }

    return reply.send({
      status: 'pending',
      mode: 'stripe',
      clientSecret: stripeResult.clientSecret,
      paymentIntentId: stripeResult.paymentIntentId,
      amount,
      currency: stripeResult.currency,
      allowedAmounts: ALLOWED_TOPUP_AMOUNTS,
    });
  }

  // ── Flow 2: YooKassa ───────────────────────────────────────────────────────
  const yookassaEnabled =
    Boolean(process.env.YOOKASSA_SHOP_ID) && Boolean(process.env.YOOKASSA_SECRET_KEY);

  if (yookassaEnabled) {
    // Step 1: create a PENDING transaction record
    const pendingTx = await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount,
        type: 'TOPUP',
        status: 'PENDING',
        description: `Пополнение кошелька на ${amount} ₽ (ожидает оплаты)`,
      },
    });

    // Step 2: create the payment in YooKassa
    let paymentResult;
    try {
      paymentResult = await processCardTopup({
        amount,
        currency: wallet.currency,
        userId,
        internalTransactionId: pendingTx.id,
      });
    } catch (err) {
      // Roll back the pending record so the user can retry
      await prisma.walletTransaction.delete({ where: { id: pendingTx.id } });
      request.log.error({ err }, '[Payment] YooKassa createPayment failed');
      throw Errors.internal('Не удалось создать платёж. Попробуйте позже.');
    }

    return reply.send({
      status: 'pending',
      mode: 'yookassa',
      paymentUrl: paymentResult.confirmationUrl,
      paymentId: paymentResult.yookassaPaymentId,
      amount,
      allowedAmounts: ALLOWED_TOPUP_AMOUNTS,
    });
  }

  // ── Flow 3: Mock mode — atomic credit + transaction record ─────────────────
  const paymentResult = await processCardTopup({
    amount,
    currency: wallet.currency,
    userId,
    internalTransactionId: `mock_${Date.now()}`,
  });

  const [updatedWallet, transaction] = await prisma.$transaction([
    prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: amount } },
    }),
    prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount,
        type: 'TOPUP',
        status: 'COMPLETED',
        description: `Пополнение кошелька на ${amount} ₽`,
      },
    }),
  ]);

  const newBalance = updatedWallet.balance.toString();
  return reply.send({
    message: 'Кошелёк пополнен',
    balance: newBalance,
    newBalance: newBalance, // keep for backward compat
    transaction: formatTransaction(transaction),
    allowedAmounts: ALLOWED_TOPUP_AMOUNTS,
    _mockPaymentId: paymentResult.yookassaPaymentId,
  });
}

interface PaymentStatusParams {
  paymentId: string;
}

// GET /api/wallet/payment-status/:paymentId — look up a WalletTransaction by externalId
export async function getPaymentStatus(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId;
  const { paymentId } = request.params as PaymentStatusParams;

  // Resolve the wallet owned by this user
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) throw Errors.notFound('Кошелёк');

  // Find transaction by externalId scoped to this wallet
  const tx = await prisma.walletTransaction.findFirst({
    where: { walletId: wallet.id, externalId: paymentId },
  });

  if (!tx) throw Errors.notFound('Транзакция');

  return reply.send({
    id: tx.id,
    status: tx.status,
    amount: tx.amount.toString(),
    createdAt: tx.createdAt.toISOString(),
  });
}

// GET /api/wallet/transactions — paginated transaction history
export async function getTransactions(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId;
  const query = request.query as TransactionsQuery;

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    throw Errors.notFound('Кошелёк');
  }

  const where = {
    walletId: wallet.id,
    ...(query.type ? { type: query.type } : {}),
  };

  const [transactions, total] = await Promise.all([
    prisma.walletTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.walletTransaction.count({ where }),
  ]);

  return reply.send({
    data: transactions.map(formatTransaction),
    pagination: {
      total,
      page,
      limit,
      hasNext: skip + limit < total,
    },
  });
}
