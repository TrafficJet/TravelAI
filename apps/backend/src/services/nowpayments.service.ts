import axios from 'axios';
import crypto from 'crypto';

const SANDBOX = process.env.NOWPAYMENTS_SANDBOX === 'true';
const BASE_URL = SANDBOX
  ? 'https://api.sandbox.nowpayments.io/v1'
  : 'https://api.nowpayments.io/v1';

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'x-api-key': process.env.NOWPAYMENTS_API_KEY ?? '' },
  timeout: 15000,
});

export interface CreatePaymentParams {
  priceAmount: number;
  payCurrency: string;
  orderId: string;
  callbackUrl: string;
}

export interface NowPaymentsPayment {
  payment_id: string;
  pay_address: string;
  pay_amount: number;
  pay_currency: string;
  price_amount: number;
  price_currency: string;
  expiration_estimate_date: string;
  payment_status: string;
}

// Create a new crypto payment via NOWPayments API
export async function createPayment(params: CreatePaymentParams): Promise<NowPaymentsPayment> {
  const { data } = await client.post<NowPaymentsPayment>('/payment', {
    price_amount: params.priceAmount,
    price_currency: 'usd',
    pay_currency: params.payCurrency.toLowerCase(),
    order_id: params.orderId,
    ipn_callback_url: params.callbackUrl,
    is_fixed_rate: false,
    is_fee_paid_by_user: false,
  });
  return data;
}

// Verify HMAC-SHA512 signature from NOWPayments IPN webhook
export function verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
  const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET ?? '';
  if (!ipnSecret) return false;

  const body = rawBody.toString();
  const parsed = JSON.parse(body);
  const sorted = JSON.stringify(parsed, Object.keys(parsed).sort());

  const expected = crypto
    .createHmac('sha512', ipnSecret)
    .update(sorted)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex'),
    );
  } catch {
    return false;
  }
}

// Build the pay_currency string expected by NOWPayments (e.g. usdttrc20, usdcerc20)
export function buildPayCurrency(currency: string, network?: string): string {
  if (!network) return currency.toLowerCase();
  const networkMap: Record<string, string> = {
    TRC20: 'trc20',
    ERC20: 'erc20',
    BEP20: 'bsc',
    TON: 'ton',
  };
  const suffix = networkMap[network.toUpperCase()] ?? network.toLowerCase();
  return `${currency.toLowerCase()}${suffix}`;
}

// Build a deep-link URI for wallet apps (used as QR code data)
export function buildCryptoUri(currency: string, address: string, amount: number): string {
  switch (currency.toUpperCase()) {
    case 'BTC':  return `bitcoin:${address}?amount=${amount}`;
    case 'ETH':  return `ethereum:${address}?value=${amount}`;
    case 'TON':  return `ton://transfer/${address}?amount=${amount}`;
    default:     return address;
  }
}

// Map NOWPayments payment_status string to our CryptoDepositStatus enum value
export function normalizeDepositStatus(nowStatus: string): string {
  const map: Record<string, string> = {
    waiting:        'WAITING',
    confirming:     'CONFIRMING',
    confirmed:      'CONFIRMED',
    finished:       'FINISHED',
    partially_paid: 'PARTIALLY_PAID',
    expired:        'EXPIRED',
    failed:         'FAILED',
  };
  return map[nowStatus] ?? 'PENDING';
}

// Returns true when a deposit has been fully credited and wallet should be topped up
export function isDepositFinalized(status: string): boolean {
  return status === 'CONFIRMED' || status === 'FINISHED';
}
