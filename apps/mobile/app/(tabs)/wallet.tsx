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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useWalletStore } from '../../stores/walletStore';
import { SkeletonWalletCard, Skeleton } from '../../components/ui/Skeleton';
import { Typography } from '../../constants/typography';
import { Radius } from '../../constants/radius';
import { Spacing } from '../../constants/spacing';
import { toast } from '../../lib/toast';
import { sendPaymentConfirmation } from '../../services/notifications.service';
import { useTheme } from '../../src/theme/ThemeContext';
import type { WalletTransaction, TransactionType } from '../../types';

// ── Transaction filter tabs ───────────────────────────────────────────────────

type FilterTab = 'all' | 'income' | 'expense';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'income', label: 'Пополнения' },
  { key: 'expense', label: 'Расходы' },
];

// ── Transaction icon map ──────────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  KZT: '₸',
  UAH: '₴',
};

function getTransactionIconName(type: TransactionType, description: string): React.ComponentProps<typeof Ionicons>['name'] {
  const lower = description.toLowerCase();
  if (type === 'TOPUP') return 'arrow-down-circle-outline';
  if (lower.includes('возврат') || lower.includes('refund')) return 'refresh-outline';
  if (lower.includes('отель') || lower.includes('hotel')) return 'bed-outline';
  if (
    lower.includes('рейс') ||
    lower.includes('flight') ||
    lower.includes('авиа') ||
    lower.includes('билет')
  ) return 'airplane-outline';
  return 'card-outline';
}

// ── Transaction item ──────────────────────────────────────────────────────────

interface TransactionItemProps {
  transaction: WalletTransaction;
}

function getTransactionIconBg(type: TransactionType, description: string): string {
  const lower = description.toLowerCase();
  if (type === 'TOPUP') return 'rgba(16,185,129,0.1)';
  if (lower.includes('отель') || lower.includes('hotel')) return 'rgba(245,158,11,0.1)';
  if (lower.includes('рейс') || lower.includes('flight') || lower.includes('авиа') || lower.includes('билет')) {
    return 'rgba(20,184,166,0.1)';
  }
  return 'rgba(244,63,94,0.15)';
}

function getTransactionIconColor(type: TransactionType, description: string): string {
  const lower = description.toLowerCase();
  if (type === 'TOPUP') return '#10B981';
  if (lower.includes('отель') || lower.includes('hotel')) return '#F59E0B';
  if (lower.includes('рейс') || lower.includes('flight') || lower.includes('авиа') || lower.includes('билет')) {
    return '#14B8A6';
  }
  return '#F43F5E';
}

function EnhancedTransactionItem({ transaction }: TransactionItemProps) {
  const { colors } = useTheme();
  const isIncoming = transaction.type === 'TOPUP';
  const amountColor = isIncoming ? colors.success : colors.error;
  const amountPrefix = isIncoming ? '+' : '-';
  const currencySymbol = CURRENCY_SYMBOLS[transaction.currency] ?? transaction.currency;

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const iconBg = getTransactionIconBg(transaction.type, transaction.description);
  const iconColor = getTransactionIconColor(transaction.type, transaction.description);

  return (
    <View style={[txStyles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: iconBg,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Ionicons name={getTransactionIconName(transaction.type, transaction.description)} size={18} color={iconColor} />
      </View>
      <View style={txStyles.info}>
        <Text style={[txStyles.label, { color: colors.text }]} numberOfLines={1}>{transaction.description}</Text>
        <Text style={[txStyles.date, { color: colors.textMuted }]}>{formatDate(transaction.createdAt)}</Text>
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
    paddingVertical: Spacing.itemGap,
    paddingHorizontal: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: Radius.card,
    borderWidth: 1,
  },
  info: {
    flex: 1,
    marginRight: Spacing.sm,
    marginLeft: 10,
  },
  label: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  date: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    marginTop: 2,
  },
  amount: {
    fontFamily: 'Inter',
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
  const { colors } = useTheme();
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
        toast.success(`Кошелёк пополнен на $${numAmount.toFixed(2)}`);
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
        <View style={[modalStyles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Handle */}
          <View style={[modalStyles.handle, { backgroundColor: colors.border }]} />

          <Text style={[modalStyles.title, { color: colors.text }]}>Пополнение кошелька</Text>

          {/* Amount input */}
          <Text style={[modalStyles.label, { color: colors.textMuted }]}>Сумма</Text>
          <View style={[modalStyles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[modalStyles.currencyPrefix, { color: colors.textMuted }]}>$</Text>
            <TextInput
              value={amount}
              onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              style={[modalStyles.input, { color: colors.text }]}
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
                  { backgroundColor: colors.card, borderColor: colors.border },
                  Number(amount) === preset && { backgroundColor: `${colors.primary}20`, borderColor: colors.primary },
                ]}
                onPress={() => handlePreset(preset)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    modalStyles.presetText,
                    { color: colors.text },
                    Number(amount) === preset && { color: colors.primary },
                  ]}
                >
                  ${preset}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Confirm button */}
          <TouchableOpacity
            style={[
              modalStyles.confirmBtn,
              { backgroundColor: colors.primary },
              isLoading && modalStyles.confirmBtnDisabled,
            ]}
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
    borderTopLeftRadius: Radius.modal,
    borderTopRightRadius: Radius.modal,
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
    paddingBottom: 40,
    borderTopWidth: 1,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Sora',
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.lg,
  },
  label: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.input,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  currencyPrefix: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.medium,
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter',
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
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  presetText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  confirmBtn: {
    paddingVertical: 16,
    borderRadius: Radius.button,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    color: '#fff',
    fontFamily: 'Inter',
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
      colors={['#E8A020', '#7C5CFC']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={heroStyles.card}
    >
      {/* Label */}
      <Text style={heroStyles.balanceLabel}>БАЛАНС SVIT</Text>

      {/* Amount */}
      <Text style={heroStyles.amount}>
        <Text style={heroStyles.currencySymbol}>{symbol}</Text>
        {formatted}
      </Text>

      {/* Action buttons */}
      <View style={heroStyles.actionsRow}>
        <TouchableOpacity
          style={heroStyles.actionBtn}
          onPress={onTopUp}
          activeOpacity={0.8}
        >
          <Text style={heroStyles.actionBtnText}>Пополнить</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={heroStyles.actionBtn}
          activeOpacity={0.8}
          onPress={() => {}}
        >
          <Text style={heroStyles.actionBtnText}>Вывести</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={heroStyles.actionBtn}
          activeOpacity={0.8}
          onPress={() => {}}
        >
          <Text style={heroStyles.actionBtnText}>Перевод</Text>
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
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  balanceLabel: {
    fontFamily: 'Inter',
    fontSize: 9,
    fontWeight: '600' as const,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: 'rgba(10,10,20,0.5)',
    marginBottom: 6,
  },
  amount: {
    fontFamily: 'Sora',
    fontSize: 30,
    fontWeight: '700' as const,
    color: '#0A0A14',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  currencySymbol: {
    fontSize: 30,
    fontWeight: '700' as const,
    color: '#0A0A14',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    backgroundColor: 'rgba(10,10,20,0.15)',
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 6,
    alignItems: 'center',
  },
  actionBtnText: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    fontWeight: '600' as const,
    color: '#0A0A14',
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function WalletScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
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
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <SkeletonWalletCard />
        <Skeleton width="40%" height={44} borderRadius={12} style={styles.skeletonBtn} />
        <Skeleton width="60%" height={12} borderRadius={6} style={styles.skeletonLabel} />
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={[styles.skeletonRow, { borderBottomColor: colors.border }]}>
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
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EnhancedTransactionItem transaction={item} />}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View>
            {/* Design header: "Кошелёк" Sora bold 22px */}
            <View style={styles.screenHeader}>
              <Text style={styles.screenTitle}>Кошелёк</Text>
              <Text style={[styles.screenSub, { color: colors.textMuted }]}>Оплачивай поездки прямо здесь</Text>
            </View>

            {/* Hero gradient balance card + payment methods */}
            <HeroBalanceCard
              balance={balance}
              currency={currency}
              onTopUp={() => setTopUpVisible(true)}
            />

            {/* Payment methods row (design: 4 tiles — Visa, Bitcoin, USDT, Apple Pay) */}
            <View style={styles.pmRow}>
              <View style={[styles.pmTile]}>
                <Ionicons name="card" size={18} color={colors.textMuted} />
                <Text style={[styles.pmLabel, { color: colors.textMuted }]}>Visa ••4821</Text>
              </View>
              <View style={styles.pmTile}>
                <Ionicons name="logo-bitcoin" size={18} color="#F7931A" />
                <Text style={[styles.pmLabel, { color: colors.textMuted }]}>Bitcoin</Text>
              </View>
              <View style={styles.pmTile}>
                <Ionicons name="cash-outline" size={18} color="#26A17B" />
                <Text style={[styles.pmLabel, { color: colors.textMuted }]}>USDT</Text>
              </View>
              <TouchableOpacity style={[styles.pmTile]} activeOpacity={0.7} onPress={() => {}}>
                <Ionicons name="logo-apple" size={18} color={colors.text} />
                <Text style={[styles.pmLabel, { color: colors.textMuted }]}>Apple Pay</Text>
              </TouchableOpacity>
            </View>

            {/* Transaction section label */}
            {filteredTransactions.length > 0 && (
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>История транзакций</Text>
            )}

            {/* Filter tabs */}
            <View style={[styles.tabsContainer, { backgroundColor: colors.card }]}>
              {FILTER_TABS.map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tabBtn,
                    activeFilter === tab.key && styles.tabBtnActive,
                    activeFilter === tab.key && { backgroundColor: colors.surface },
                  ]}
                  onPress={() => setActiveFilter(tab.key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.tabText,
                      { color: colors.textMuted },
                      activeFilter === tab.key && { color: colors.primary, fontWeight: Typography.weights.semibold },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyTransactions}>
            <Ionicons name="card-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.text }]}>Транзакций пока нет</Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
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
  },
  // Design header
  screenHeader: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    paddingTop: 4,
  },
  screenTitle: {
    fontFamily: 'Sora',
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#F4F4F8',
  },
  screenSub: {
    fontSize: 10,
    marginTop: 2,
  },
  // Payment methods row (4 tiles)
  pmRow: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    gap: 7,
  },
  pmTile: {
    flex: 1,
    backgroundColor: '#1E1C2C',
    borderWidth: 1,
    borderColor: '#2E2B42',
    borderRadius: 11,
    paddingVertical: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: 4,
  },
  pmTileActive: {
    borderColor: 'rgba(232,160,32,0.4)',
  },
  pmLabel: {
    fontSize: 8.5,
    textAlign: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  sectionTitle: {
    fontFamily: 'Inter',
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
  emptyText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    marginBottom: 6,
  },
  emptySubtext: {
    fontFamily: 'Inter',
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
  },
  skeletonRowContent: {
    flex: 1,
    marginHorizontal: 12,
  },
  skeletonRowSub: {
    marginTop: 5,
  },
});
