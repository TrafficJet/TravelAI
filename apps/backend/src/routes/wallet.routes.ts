import { FastifyInstance } from 'fastify';
import { getWallet, topupWallet, getTransactions, getPaymentStatus } from '../handlers/wallet.handler';
import { initCryptoDeposit, getCryptoDepositStatus } from '../handlers/crypto-deposit.handler';
import { authenticate } from '../middleware/auth.middleware';

// Wallet routes — all require authentication
export async function walletRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // GET /api/wallet — balance and last 10 transactions
  fastify.get('/', { handler: getWallet });

  // POST /api/wallet/topup — add funds; amount must be one of [50, 100, 200, 500]
  fastify.post('/topup', {
    schema: {
      body: {
        type: 'object',
        required: ['amount'],
        properties: {
          amount: { type: 'number', enum: [50, 100, 200, 500] },
          paymentMethod: { type: 'string', enum: ['CARD'], default: 'CARD' },
        },
      },
    },
    handler: topupWallet,
  });

  // GET /api/wallet/payment-status/:paymentId — deep-link return status check
  fastify.get('/payment-status/:paymentId', { handler: getPaymentStatus });

  // GET /api/wallet/transactions — paginated transaction history
  fastify.get('/transactions', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 50 },
          type: { type: 'string', enum: ['TOPUP', 'DEBIT'] },
        },
      },
    },
    handler: getTransactions,
  });

  // POST /api/wallet/crypto-deposit — initiate a crypto top-up via NOWPayments
  fastify.post('/crypto-deposit', {
    schema: {
      body: {
        type: 'object',
        required: ['amount', 'currency'],
        properties: {
          amount:   { type: 'number', minimum: 2, maximum: 10000 },
          currency: { type: 'string', enum: ['BTC', 'ETH', 'USDT', 'USDC', 'TON', 'LTC'] },
          network:  { type: 'string' },
        },
      },
    },
    handler: initCryptoDeposit,
  });

  // GET /api/wallet/crypto-deposit/:depositId — poll deposit status
  fastify.get('/crypto-deposit/:depositId', { handler: getCryptoDepositStatus });
}
