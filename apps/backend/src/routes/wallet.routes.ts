import { FastifyInstance } from 'fastify';
import { getWallet, topupWallet, getTransactions, getPaymentStatus } from '../handlers/wallet.handler';
import { authenticate } from '../middleware/auth.middleware';

// Wallet routes — all require authentication
export async function walletRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // GET /api/wallet — balance and last 10 transactions
  fastify.get('/', { handler: getWallet });

  // POST /api/wallet/topup — add funds; amount must be one of [500, 1000, 2000, 5000]
  fastify.post('/topup', {
    schema: {
      body: {
        type: 'object',
        required: ['amount', 'paymentMethod'],
        properties: {
          amount: { type: 'number', enum: [500, 1000, 2000, 5000] },
          paymentMethod: { type: 'string', enum: ['CARD'] },
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
}
