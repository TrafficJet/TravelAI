import api from './api';
import type { WalletTransaction, PaginatedResponse } from '../types';

export interface WalletData {
  balance: number;
  currency: string;
  transactions: WalletTransaction[];
}

export interface TopupResponse {
  balance: number;
  newBalance?: number;
  status?: string;
  paymentUrl?: string;
}

export const walletService = {
  async getWallet(): Promise<WalletData> {
    const { data } = await api.get<WalletData>('/wallet');
    return data;
  },

  async topup(amount: number, paymentMethod: string = 'CARD'): Promise<TopupResponse> {
    const { data } = await api.post<TopupResponse>('/wallet/topup', { amount, paymentMethod });
    return data;
  },

  async getTransactions(): Promise<PaginatedResponse<WalletTransaction>> {
    const { data } = await api.get<PaginatedResponse<WalletTransaction>>(
      '/wallet/transactions',
    );
    return data;
  },
};
