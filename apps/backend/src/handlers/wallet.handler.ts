import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';
import { Errors } from '../lib/errors';
import { processCardTopup } from '../services/payment.service';

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

  return reply.send({
    balance: wallet.balance.toString(),
    currency: wallet.currency,
    transactions: wallet.transactions.map(formatTransaction),
  });
}

/**
 * POST /api/wallet/topup — initiate a funds top-up.
 *
 * Two flows:
 *   1. YooKassa configured → create pending WalletTransaction (status PENDING),
 *      return { status: 'pending', paymentUrl, paymentId, amount }.
 *      Funds are credited by the webhook after payment.succeeded.
 *
 *   2. Mock mode → atomically credit the wallet immediately, return new balance.
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

  const yookassaEnabled =
    Boolean(process.env.YOOKASSA_SHOP_ID) && Boolean(process.env.YOOKASSA_SECRET_KEY);

  if (yookassaEnabled) {
    // ── Step 1: create a PENDING transaction record ──────────────────────────
    const pendingTx = await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount,
        type: 'TOPUP',
        status: 'PENDING',
        description: `Пополнение кошелька на ${amount} ₽ (ожидает оплаты)`,
      },
    });

    // ── Step 2: create the payment in YooKassa ───────────────────────────────
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
      paymentUrl: paymentResult.confirmationUrl,
      paymentId: paymentResult.yookassaPaymentId,
      amount,
      allowedAmounts: ALLOWED_TOPUP_AMOUNTS,
    });
  }

  // ── Mock mode: atomic credit + transaction record ────────────────────────────
  // SAFE IN MOCK MODE: processCardTopup returns mock data when YOOKASSA_SHOP_ID is not configured
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

  return reply.send({
    newBalance: updatedWallet.balance.toString(),
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
