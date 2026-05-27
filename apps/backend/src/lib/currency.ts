// Centralized currency rates — update periodically
export const CURRENCY_RATES = {
  RUB_TO_USD: 0.011, // 1 RUB ≈ $0.011
  EUR_TO_USD: 1.09,
  USD_TO_USD: 1.0,
} as const;

export function toUSD(amount: number, currency: string): number {
  switch (currency.toUpperCase()) {
    case 'RUB': return amount * CURRENCY_RATES.RUB_TO_USD;
    case 'EUR': return amount * CURRENCY_RATES.EUR_TO_USD;
    case 'USD': return amount;
    default: return amount;
  }
}
