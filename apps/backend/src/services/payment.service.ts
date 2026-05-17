// Payment service — YooKassa integration with graceful mock fallback
// If YOOKASSA_SHOP_ID + YOOKASSA_SECRET_KEY are set → real payments via YooKassa
// Otherwise → mock mode (always succeeds, useful for local development)

import { YooCheckout } from '@a2seven/yoo-checkout';
import { v4 as uuidv4 } from 'uuid';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  amount: number;
  currency: string;
  message: string;
}

export interface TopupPaymentResult {
  success: boolean;
  transactionId: string;
  yookassaPaymentId: string;
  amount: number;
  currency: string;
  /** Present when YooKassa is configured — redirect user to this URL */
  confirmationUrl: string | null;
  /** true = money credited immediately (mock); false = pending webhook */
  immediate: boolean;
}

// ─── YooKassa client (lazy singleton) ────────────────────────────────────────

function getYooCheckout(): YooCheckout | null {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;

  if (!shopId || !secretKey) {
    return null;
  }

  return new YooCheckout({ shopId, secretKey });
}

function isYooKassaConfigured(): boolean {
  return Boolean(process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY);
}

// ─── Card top-up ─────────────────────────────────────────────────────────────

/**
 * Initiate a card top-up payment.
 *
 * YooKassa mode:  creates a pending payment and returns a redirect URL.
 *                 Money is NOT credited here — webhook handles that.
 * Mock mode:      immediately returns success (simulated network delay).
 */
export async function processCardTopup(params: {
  amount: number;
  currency: string;
  userId: string;
  /** Internal WalletTransaction.id — stored as metadata so webhook can find it */
  internalTransactionId: string;
}): Promise<TopupPaymentResult> {
  const checkout = getYooCheckout();

  if (!checkout) {
    // ── Mock fallback ──────────────────────────────────────────────────────
    console.info('[Payment] YooKassa not configured, using mock');
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      success: true,
      transactionId: params.internalTransactionId,
      yookassaPaymentId: `pay_mock_${Date.now()}`,
      amount: params.amount,
      currency: params.currency,
      confirmationUrl: null,
      immediate: true,
    };
  }

  // ── Real YooKassa integration ──────────────────────────────────────────────
  const returnUrl =
    process.env.YOOKASSA_RETURN_URL ?? 'http://localhost:3000/payment/return';

  const idempotenceKey = uuidv4();

  const payment = await checkout.createPayment(
    {
      amount: {
        value: params.amount.toFixed(2),
        currency: params.currency,
      },
      payment_method_data: { type: 'bank_card' },
      confirmation: {
        type: 'redirect',
        return_url: returnUrl,
      },
      description: 'Пополнение кошелька Travel AI',
      capture: true,
      metadata: {
        // used by webhook to credit the correct transaction
        internalTransactionId: params.internalTransactionId,
        userId: params.userId,
      },
    },
    idempotenceKey,
  );

  const confirmationUrl = payment.confirmation?.confirmation_url ?? null;

  return {
    success: true,
    transactionId: params.internalTransactionId,
    yookassaPaymentId: payment.id,
    amount: params.amount,
    currency: params.currency,
    confirmationUrl,
    immediate: false,
  };
}

// ─── Booking payment (stays as mock for now) ──────────────────────────────────

/**
 * Mock booking payment confirmation.
 * Booking payments are still processed via wallet debit — no redirect needed.
 */
export async function confirmBookingPayment(params: {
  bookingId: string;
  amount: number;
  currency: string;
  userId: string;
}): Promise<PaymentResult> {
  await new Promise((resolve) => setTimeout(resolve, 150));

  return {
    success: true,
    transactionId: `booking_pay_${params.bookingId}_${Date.now()}`,
    amount: params.amount,
    currency: params.currency,
    message: 'Бронирование оплачено успешно',
  };
}
