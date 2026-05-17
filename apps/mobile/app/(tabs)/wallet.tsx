import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useWalletStore } from '../../stores/walletStore';
import { BalanceDisplay } from '../../components/wallet/BalanceDisplay';
import { TransactionItem } from '../../components/wallet/TransactionItem';
import { SkeletonWalletCard, Skeleton } from '../../components/ui/Skeleton';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Radius } from '../../constants/radius';
import { Spacing } from '../../constants/spacing';
import { useTranslation } from 'react-i18next';

export default function WalletScreen() {
  const { balance, currency, transactions, isLoading, load } = useWalletStore();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const { t } = useTranslation();

  const fetchWallet = useCallback(async () => {
    try {
      await load();
    } catch {
      // Fail silently
    }
  }, [load]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  async function handleRefresh() {
    setIsRefreshing(true);
    await fetchWallet();
    setIsRefreshing(false);
  }

  if (isLoading && (transactions ?? []).length === 0) {
    return (
      <View style={styles.container}>
        <SkeletonWalletCard />
        <Skeleton width="40%" height={44} borderRadius={12} style={styles.skeletonBtn} />
        <Skeleton width="60%" height={12} borderRadius={6} style={styles.skeletonLabel} />
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={styles.skeletonRow}>
            <Skeleton width={36} height={36} borderRadius={18} />
            <View style={styles.skeletonRowContent}>
              <Skeleton width="55%" height={13} borderRadius={6} />
              <Skeleton width="35%" height={11} borderRadius={5} style={styles.skeletonRowSub} />
            </View>
            <Skeleton width={60} height={13} borderRadius={6} />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionItem transaction={item} />}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
        ListHeaderComponent={
          <View>
            <BalanceDisplay balance={balance} currency={currency} />
            <TouchableOpacity
              style={styles.topupBtn}
              onPress={() => router.push('/wallet/topup')}
              activeOpacity={0.8}
            >
              <Text style={styles.topupBtnText}>Пополнить кошелёк</Text>
            </TouchableOpacity>
            {(transactions ?? []).length > 0 && (
              <Text style={styles.sectionTitle}>История транзакций</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyTransactions}>
            <Text style={styles.emptyText}>{t('wallet.empty')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topupBtn: {
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderRadius: Radius.input,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  topupBtnText: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  sectionTitle: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    letterSpacing: Typography.letterSpacing.wide,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  emptyTransactions: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
  },
  skeletonBtn: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  skeletonLabel: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  skeletonRowContent: {
    flex: 1,
    marginHorizontal: 12,
  },
  skeletonRowSub: {
    marginTop: 5,
  },
});
