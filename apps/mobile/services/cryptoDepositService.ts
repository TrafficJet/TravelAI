import api from './api';

export type CryptoCurrency = 'BTC' | 'ETH' | 'USDT' | 'TON';
export type UsdtNetwork = 'TRC20' | 'ERC20' | 'TON';

export type DepositStatus =
  | 'WAITING'
  | 'CONFIRMING'
  | 'CONFIRMED'
  | 'SENDING'
  | 'FINISHED'
  | 'FAILED'
  | 'EXPIRED';

export interface CreateDepositRequest {
  amount: number;
  currency: CryptoCurrency;
  network?: UsdtNetwork;
}

export interface CreateDepositResponse {
  depositId: string;
  payAddress: string;
  payAmount: number;
  payCurrency: string;
  priceAmount: number;
  expiresAt: string;
  qrData: string;
}

export interface DepositStatusResponse {
  id: string;
  status: DepositStatus;
  payAddress: string;
  payAmount: number;
  payCurrency: string;
  priceAmount: number;
  expiresAt: string;
  confirmedAt?: string;
  txHash?: string;
}

export const cryptoDepositService = {
  async createDeposit(
    params: CreateDepositRequest,
  ): Promise<CreateDepositResponse> {
    const { data } = await api.post<CreateDepositResponse>(
      '/wallet/crypto-deposit',
      params,
    );
    return data;
  },

  async getDepositStatus(depositId: string): Promise<DepositStatusResponse> {
    const { data } = await api.get<DepositStatusResponse>(
      `/wallet/crypto-deposit/${depositId}`,
    );
    return data;
  },
};
