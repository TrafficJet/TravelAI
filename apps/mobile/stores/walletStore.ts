import { create } from 'zustand';
import { walletService } from '../services/walletService';
import type { TopupResponse } from '../services/walletService';
import type { WalletTransaction } from '../types';

interface WalletStore {
  balance: number;
  currency: string;
  transactions: WalletTransaction[];
  isLoading: boolean;
  load: () => Promise<void>;
  topup: (amount: number) => Promise<TopupResponse>;
}

export const useWalletStore = create<WalletStore>((set) => ({
  balance: 0,
  currency: 'USD',
  transactions: [],
  isLoading: false,

  load: async () => {
    set({ isLoading: true });
    try {
      const data = await walletService.getWallet();
      set({
        balance: data.balance,
        currency: data.currency === 'RUB' ? 'USD' : (data.currency || 'USD'),
        transactions: data.transactions ?? [],
      });
    } finally {
      set({ isLoading: false });
    }
  },

  topup: async (amount: number) => {
    const result = await walletService.topup(amount);
    // In mock mode the balance is already credited; in pending mode the
    // balance field may still reflect the old value — update only when
    // the payment is not pending.
    if (result.status !== 'pending') {
      set({ balance: result.balance });
    }
    return result;
  },
}));
