import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import type { WalletTransaction, TransactionType } from '../../types';

interface Props {
  transaction: WalletTransaction;
}

const TYPE_ICONS: Record<TransactionType, string> = {
  TOPUP: '↓',
  DEBIT: '↑',
};

const TYPE_LABELS: Record<TransactionType, string> = {
  TOPUP: 'Пополнение',
  DEBIT: 'Списание',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TransactionItem({ transaction }: Props) {
  const isIncoming = transaction.type === 'TOPUP';
  const amountColor = isIncoming ? Colors.success : Colors.error;
  const amountPrefix = isIncoming ? '+' : '-';
  const icon = TYPE_ICONS[transaction.type];

  return (
    <View style={styles.row}>
      <View style={[styles.iconContainer, { backgroundColor: `${amountColor}20` }]}>
        <Text style={[styles.icon, { color: amountColor }]}>{icon}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.label}>{transaction.description}</Text>
        <Text style={styles.type}>
          {TYPE_LABELS[transaction.type]} · {formatDate(transaction.createdAt)}
        </Text>
      </View>
      <Text style={[styles.amount, { color: amountColor }]}>
        {amountPrefix}
        {parseFloat(transaction.amount).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} {transaction.currency}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  info: {
    flex: 1,
  },
  label: {
    color: Colors.text,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  type: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  amount: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
});
