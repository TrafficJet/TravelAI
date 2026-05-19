import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { Typography } from '../../constants/typography';

interface Props {
  balance: number;
  currency: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  KZT: '₸',
  UAH: '₴',
};

export function BalanceDisplay({ balance, currency }: Props) {
  const { colors } = useTheme();
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textMuted }]}>Баланс кошелька</Text>
      <View style={styles.amountRow}>
        <Text style={[styles.amount, { color: colors.text }]}>{balance.toLocaleString('ru-RU')}</Text>
        <Text style={[styles.currency, { color: colors.textMuted }]}>{symbol}</Text>
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
    fontFamily: 'Sora',
    fontSize: 48,
    fontWeight: Typography.weights.bold,
    letterSpacing: -1,
  },
  currency: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.medium,
    paddingBottom: 6,
  },
});
