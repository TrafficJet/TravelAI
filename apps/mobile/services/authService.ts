import api from './api';
import type { AuthResponse, TokensResponse, UserProfile } from '../types';

export interface SocialAuthUserData {
  name?: string;
  email?: string;
}

export const authService = {
  async register(
    email: string,
    password: string,
    name: string,
  ): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/register', {
      email,
      password,
      name,
    });
    return data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    return data;
  },

  async refresh(refreshToken: string): Promise<TokensResponse> {
    const { data } = await api.post<TokensResponse>('/auth/refresh', {
      refreshToken,
    });
    return data;
  },

  async logout(refreshToken: string): Promise<void> {
    await api.post('/auth/logout', { refreshToken });
  },

  async getMe(skipAuthRetry = false): Promise<UserProfile> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: any = skipAuthRetry ? { _skipAuthRetry: true } : undefined;
    const { data } = await api.get<{
      user: { id: string; email: string; name: string; phone: string | null; createdAt: string };
      wallet: { balance: string; currency: string };
      subscription: { plan: 'FREE' | 'PREMIUM'; status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED'; expiresAt: string | null };
    }>('/users/me', config);
    return {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      phone: data.user.phone ?? undefined,
      createdAt: data.user.createdAt,
      wallet: {
        balance: parseFloat(data.wallet.balance),
        currency: data.wallet.currency,
      },
      subscription: {
        plan: data.subscription.plan,
        status: data.subscription.status,
        expiresAt: data.subscription.expiresAt ?? undefined,
      },
    };
  },

  async loginWithGoogle(idToken: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/google', { idToken });
    return data;
  },

  async loginWithApple(
    identityToken: string,
    userData?: SocialAuthUserData,
  ): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/apple', {
      identityToken,
      user: userData,
    });
    return data;
  },

  async updateMe(payload: { name?: string; phone?: string }): Promise<Omit<UserProfile, 'wallet' | 'subscription'>> {
    const { data } = await api.patch<{ user: { id: string; email: string; name: string; phone: string | null; createdAt: string } }>('/users/me', payload);
    return {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      phone: data.user.phone ?? undefined,
      createdAt: data.user.createdAt,
    };
  },
};
