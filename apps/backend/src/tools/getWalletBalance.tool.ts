import type Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/prisma';

// Claude tool definition for fetching wallet balance
export const getWalletBalanceTool: Anthropic.Tool = {
  name: 'get_wallet_balance',
  description: 'Получить текущий баланс кошелька пользователя. Используй перед подтверждением бронирования чтобы проверить достаточность средств.',
  input_schema: {
    type: 'object' as const,
    properties: {},
    required: [],
  },
};

// Executor: fetches wallet balance from DB
export async function executeGetWalletBalance(userId: string) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });

  if (!wallet) {
    return { balance: '0.00', currency: 'USD', available: false };
  }

  return {
    balance: wallet.balance.toString(),
    currency: wallet.currency,
    available: true,
  };
}
