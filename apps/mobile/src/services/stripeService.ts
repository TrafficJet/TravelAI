import api from '../../services/api';

export interface StripePaymentIntentResponse {
  clientSecret: string;
  publishableKey: string;
  transactionId: string;
  checkoutUrl?: string;
}

/**
 * Creates a Stripe PaymentIntent on the backend.
 * POST /api/stripe/create-intent
 * Body: { amount: number }  — amount in USD
 */
export async function createStripePaymentIntent(
  amountUsd: number,
): Promise<StripePaymentIntentResponse> {
  const response = await api.post<StripePaymentIntentResponse>(
    '/stripe/create-intent',
    { amount: amountUsd },
  );
  return response.data;
}
