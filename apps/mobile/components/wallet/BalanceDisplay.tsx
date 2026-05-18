import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

interface Props {
  balance: number;
  currency: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  RUB: '₽',
  USD: '$',
  EUR: '€',
  KZT: '₸',
  UAH: '₴',
};

export function BalanceDisplay({ balance, currency }: Props) {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Баланс кошелька</Text>
      <View style={styles.amountRow}>
        <Text style={styles.amount}>{balance.toLocaleString('ru-RU')}</Text>
        <Text style={styles.currency}>{symbol}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  label: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  amount: {
    color: Colors.text,
    fontFamily: 'Sora',
    fontSize: 48,
    fontWeight: Typography.weights.bold,
    letterSpacing: -1,
  },
  currency: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.medium,
    paddingBottom: 6,
  },
});
