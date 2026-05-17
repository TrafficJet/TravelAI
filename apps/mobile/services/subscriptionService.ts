import api from './api';
import type { SubscriptionPlan, UserSubscription } from '../types';

export const subscriptionService = {
  async getPlans(): Promise<SubscriptionPlan[]> {
    const { data } = await api.get<SubscriptionPlan[]>('/subscriptions/plans');
    return data;
  },

  async subscribe(planId: 'PRO' | 'PREMIUM'): Promise<UserSubscription> {
    const { data } = await api.post<UserSubscription>('/subscriptions/subscribe', {
      planId,
    });
    return data;
  },

  async getCurrent(): Promise<UserSubscription> {
    const { data } = await api.get<UserSubscription>('/subscriptions/current');
    return data;
  },
};
