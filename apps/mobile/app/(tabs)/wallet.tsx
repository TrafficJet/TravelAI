import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useWalletStore } from '../../stores/walletStore';
import { SkeletonWalletCard, Skeleton } from '../../components/ui/Skeleton';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Radius } from '../../constants/radius';
import { Spacing } from '../../constants/spacing';
import { toast } from '../../lib/toast';
import { sendPaymentConfirmation } from '../../services/notifications.service';
import type { WalletTransaction, TransactionType } from '../../types';

// ── Transaction filter tabs ───────────────────────────────────────────────────

type FilterTab = 'all' | 'income' | 'expense';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'income', label: 'Доходы' },
  { key: 'expense', label: 'Расходы' },
];

// ── Transaction icon map ──────────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = {
  RUB: '₽',
  USD: '$',
  EUR: '€',
  KZT: '₸',
  UAH: '₴',
};

function getTransactionIcon(type: TransactionType, description: string): string {
  const lower = description.toLowerCase();
  if (type === 'TOPUP') return '💰';
  if (lower.includes('возврат') || lower.includes('refund') || lower.includes('return')) return '↩️';
  if (lower.includes('отель') || lower.includes('hotel') || lower.includes('гостиница')) return '🏨';
  if (
    lower.includes('рейс') ||
    lower.includes('flight') ||
    lower.includes('авиа') ||
    lower.includes('билет')
  ) return '✈️';
  return '💳';
}

// ── Transaction item ──────────────────────────────────────────────────────────

interface TransactionItemProps {
  transaction: WalletTransaction;
}

function EnhancedTransactionItem({ transaction }: TransactionItemProps) {
  const isIncoming = transaction.type === 'TOPUP';
  const amountColor = isIncoming ? Colors.success : Colors.error;
  const amountPrefix = isIncoming ? '+' : '-';
  const icon = getTransactionIcon(transaction.type, transaction.description);
  const currencySymbol = CURRENCY_SYMBOLS[transaction.currency] ?? transaction.currency;

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <View style={txStyles.row}>
      <View style={[txStyles.iconContainer, { backgroundColor: `${amountColor}20` }]}>
        <Text style={txStyles.iconEmoji}>{icon}</Text>
      </View>
      <View style={txStyles.info}>
        <Text style={txStyles.label} numberOfLines={1}>{transaction.description}</Text>
        <Text style={txStyles.date}>{formatDate(transaction.createdAt)}</Text>
      </View>
      <Text style={[txStyles.amount, { color: amountColor }]}>
        {amountPrefix}
        {parseFloat(transaction.amount).toLocaleString('ru-RU', {
          maximumFractionDigits: 2,
        })}{' '}
        {currencySymbol}
      </Text>
    </View>
  );
}

const txStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: Radius.avatar,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconEmoji: {
    fontSize: 20,
  },
  info: {
    flex: 1,
    marginRight: 8,
  },
  label: {
    color: Colors.text,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  date: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    marginTop: 2,
  },
  amount: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
});

// ── Top-up modal ──────────────────────────────────────────────────────────────

const PRESETS = [50, 100, 200, 500];

interface TopUpModalProps {
  visible: boolean;
  onClose: () => void;
}

function TopUpModal({ visible, onClose }: TopUpModalProps) {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { topup, load } = useWalletStore();

  function handlePreset(value: number) {
    setAmount(String(value));
  }

  async function handleTopUp() {
    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Ошибка', 'Введите корректную сумму');
      return;
    }
    if (numAmount < 1) {
      Alert.alert('Ошибка', 'Минимальная сумма пополнения — $1');
      return;
    }

    setIsLoading(true);
    try {
      const result = await topup(numAmount);

      if (result?.paymentUrl) {
        await Linking.openURL(result.paymentUrl);
        toast.info('Завершите оплату в браузере, затем вернитесь в приложение');
        onClose();
      } else {
        await load();
        await sendPaymentConfirmation(numAmount);
        toast.success(`Кошелёк пополнен на $${numAmount.toLocaleString('ru-RU')}`);
        setAmount('');
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка пополнения';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }

  function handleClose() {
    setAmount('');
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={modalStyles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={modalStyles.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={modalStyles.sheet}>
          {/* Handle */}
          <View style={modalStyles.handle} />

          <Text style={modalStyles.title}>Пополнение кошелька</Text>

          {/* Amount input */}
          <Text style={modalStyles.label}>Сумма</Text>
          <View style={modalStyles.inputWrapper}>
            <Text style={modalStyles.currencyPrefix}>$</Text>
            <TextInput
              value={amount}
              onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))}
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
              style={modalStyles.input}
              keyboardType="decimal-pad"
              maxLength={10}
              autoFocus
            />
          </View>

          {/* Quick presets */}
          <View style={modalStyles.presetsRow}>
            {PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset}
                style={[
                  modalStyles.presetBtn,
                  Number(amount) === preset && modalStyles.presetBtnActive,
                ]}
                onPress={() => handlePreset(preset)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    modalStyles.presetText,
                    Number(amount) === preset && modalStyles.presetTextActive,
                  ]}
                >
                  ${preset}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Confirm button */}
          <TouchableOpacity
            style={[modalStyles.confirmBtn, isLoading && modalStyles.confirmBtnDisabled]}
            onPress={handleTopUp}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            <Text style={modalStyles.confirmBtnText}>
              {isLoading ? 'Обработка...' : 'Пополнить баланс'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.modal,
    borderTopRightRadius: Radius.modal,
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    color: Colors.text,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.lg,
  },
  label: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.input,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  currencyPrefix: {
    color: Colors.textMuted,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.medium,
    marginRight: 6,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    paddingVertical: 14,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Spacing.xl,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: Colors.card,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  presetBtnActive: {
    backgroundColor: `${Colors.primary}20`,
    borderColor: Colors.primary,
  },
  presetText: {
    color: Colors.text,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  presetTextActive: {
    color: Colors.primary,
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: Radius.button,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
});

// ── Hero balance card ─────────────────────────────────────────────────────────

interface HeroCardProps {
  balance: number;
  currency: string;
  onTopUp: () => void;
}

function HeroBalanceCard({ balance, currency, onTopUp }: HeroCardProps) {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;

  const formatted = balance.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <LinearGradient
      colors={['#1C1C2E', '#2D1A0A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={heroStyles.card}
    >
      <Text style={heroStyles.label}>Баланс кошелька</Text>
      <Text style={heroStyles.amount}>
        {symbol}{formatted}
      </Text>
      <View style={heroStyles.actionsRow}>
        <TouchableOpacity
          style={heroStyles.topUpBtn}
          onPress={onTopUp}
          activeOpacity={0.8}
        >
          <Text style={heroStyles.topUpBtnText}>💳  Пополнить</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={heroStyles.withdrawBtn}
          activeOpacity={0.8}
        >
          <Text style={heroStyles.withdrawBtnText}>📤  Вывести</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const heroStyles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    borderRadius: Radius.cardLg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  label: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: Typography.weights.medium,
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  amount: {
    color: Colors.text,
    fontSize: 36,
    fontWeight: Typography.weights.bold,
    letterSpacing: -0.5,
    marginBottom: Spacing.lg,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  topUpBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: Radius.button,
    alignItems: 'center',
  },
  topUpBtnText: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  withdrawBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.button,
    borderWidth: 1.5,
    borderColor: Colors.text,
    alignItems: 'center',
  },
  withdrawBtnText: {
    color: Colors.text,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function WalletScreen() {
  const { balance, currency, transactions, isLoading, load } = useWalletStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [topUpVisible, setTopUpVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

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

  const filteredTransactions = (transactions ?? []).filter((tx) => {
    if (activeFilter === 'income') return tx.type === 'TOPUP';
    if (activeFilter === 'expense') return tx.type === 'DEBIT';
    return true;
  });

  if (isLoading && (transactions ?? []).length === 0) {
    return (
      <View style={styles.container}>
        <SafeAreaView>
          <View style={styles.customHeader}>
            <Text style={styles.headerTitle}>Кошелёк</Text>
            <Text style={styles.headerSubtitle}>Управление балансом</Text>
          </View>
        </SafeAreaView>
        <SkeletonWalletCard />
        <Skeleton width="40%" height={44} borderRadius={12} style={styles.skeletonBtn} />
        <Skeleton width="60%" height={12} borderRadius={6} style={styles.skeletonLabel} />
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={styles.skeletonRow}>
            <Skeleton width={44} height={44} borderRadius={22} />
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
      <StatusBar barStyle="light-content" />

      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EnhancedTransactionItem transaction={item} />}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
        ListHeaderComponent={
          <View>
            {/* Custom header */}
            <SafeAreaView style={styles.safeHeader}>
              <View style={styles.customHeader}>
                <Text style={styles.headerTitle}>Кошелёк</Text>
                <Text style={styles.headerSubtitle}>Управление балансом</Text>
              </View>
            </SafeAreaView>

            {/* Hero balance card */}
            <HeroBalanceCard
              balance={balance}
              currency={currency}
              onTopUp={() => setTopUpVisible(true)}
            />

            {/* Filter tabs */}
            <View style={styles.tabsContainer}>
              {FILTER_TABS.map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tabBtn,
                    activeFilter === tab.key && styles.tabBtnActive,
                  ]}
                  onPress={() => setActiveFilter(tab.key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeFilter === tab.key && styles.tabTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {filteredTransactions.length > 0 && (
              <Text style={styles.sectionTitle}>История транзакций</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyTransactions}>
            <Text style={styles.emptyIcon}>💳</Text>
            <Text style={styles.emptyText}>Транзакций пока нет</Text>
            <Text style={styles.emptySubtext}>
              Пополните кошелёк, чтобы начать бронировать
            </Text>
          </View>
        }
      />

      <TopUpModal
        visible={topUpVisible}
        onClose={() => setTopUpVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeHeader: {
    backgroundColor: Colors.background,
  },
  customHeader: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    letterSpacing: Typography.letterSpacing.tight,
  },
  headerSubtitle: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  tabBtnActive: {
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: Typography.weights.semibold,
  },
  sectionTitle: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    letterSpacing: Typography.letterSpacing.wide,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  emptyTransactions: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.lg,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyText: {
    color: Colors.text,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    marginBottom: 6,
  },
  emptySubtext: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.base,
    textAlign: 'center',
    lineHeight: 20,
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
