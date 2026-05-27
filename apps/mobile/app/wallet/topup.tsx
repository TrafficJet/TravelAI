import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Share,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { useWalletStore } from '../../stores/walletStore';
import { Button } from '../../components/ui/Button';
import { Typography } from '../../constants/typography';
import { sendPaymentConfirmation } from '../../services/notifications.service';
import { toast } from '../../lib/toast';
import { createStripePaymentIntent } from '../../src/services/stripeService';
import { useTheme } from '../../src/theme/ThemeContext';
import {
  cryptoDepositService,
  type CryptoCurrency,
  type UsdtNetwork,
  type CreateDepositResponse,
  type DepositStatusResponse,
  type DepositStatus,
} from '../../services/cryptoDepositService';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'card' | 'crypto';

interface CurrencyOption {
  id: CryptoCurrency;
  label: string;
  icon: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESETS = [10, 25, 50, 100];

const CURRENCIES: CurrencyOption[] = [
  { id: 'BTC', label: 'Bitcoin (BTC)', icon: '₿' },
  { id: 'ETH', label: 'Ethereum (ETH)', icon: 'Ξ' },
  { id: 'USDT', label: 'USDT', icon: '₮' },
  { id: 'TON', label: 'TON', icon: '💠' },
];

const USDT_NETWORKS: UsdtNetwork[] = ['TRC20', 'ERC20', 'TON'];

const POLLING_INTERVAL_MS = 10_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return '00:00:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function isTerminalStatus(status: DepositStatus): boolean {
  return ['CONFIRMED', 'FINISHED', 'FAILED', 'EXPIRED'].includes(status);
}

function isSuccessStatus(status: DepositStatus): boolean {
  return ['CONFIRMED', 'SENDING', 'FINISHED'].includes(status);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface AddressCardProps {
  deposit: CreateDepositResponse;
  depositStatus: DepositStatusResponse | null;
  onCopy: () => void;
}

function AddressCard({ deposit, depositStatus, onCopy }: AddressCardProps) {
  const { colors } = useTheme();
  const status = depositStatus?.status ?? 'WAITING';
  const expiresAt = new Date(deposit.expiresAt).getTime();
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)),
  );

  useEffect(() => {
    if (isTerminalStatus(status)) return;
    const interval = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, status]);

  const isSuccess = isSuccessStatus(status);
  const isExpired = status === 'EXPIRED' || secondsLeft <= 0;
  const isFailed = status === 'FAILED';

  let statusColor: string = colors.textMuted;
  let statusIcon = '';
  if (isSuccess) {
    statusColor = colors.success;
    statusIcon = 'Зачислено!';
  } else if (isExpired || isFailed) {
    statusColor = colors.error;
    statusIcon = isExpired ? 'Истекло' : 'Ошибка платежа';
  } else if (status === 'CONFIRMING') {
    statusColor = colors.warning;
    statusIcon = 'Подтверждение...';
  } else {
    statusColor = colors.textMuted;
    statusIcon = 'Ожидаем платёж...';
  }

  return (
    <View style={[addrStyles.card, { backgroundColor: colors.card }]}>
      {/* Title */}
      <Text style={[addrStyles.title, { color: colors.text }]}>
        Отправьте {deposit.payAmount} {deposit.payCurrency}
      </Text>
      <Text style={[addrStyles.subtitle, { color: colors.textMuted }]}>
        (≈ ${deposit.priceAmount} USD)
      </Text>

      {/* QR placeholder — large address in box */}
      <View style={[addrStyles.qrBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[addrStyles.qrHint, { color: colors.textMuted }]}>Адрес кошелька</Text>
        <Text style={[addrStyles.qrAddress, { color: colors.text }]} selectable>
          {deposit.payAddress}
        </Text>
      </View>

      {/* Copy button */}
      <TouchableOpacity
        style={[addrStyles.copyBtn, { backgroundColor: colors.primary }]}
        onPress={onCopy}
        activeOpacity={0.75}
      >
        <Text style={[addrStyles.copyBtnText, { color: colors.textInverse }]}>Скопировать адрес</Text>
      </TouchableOpacity>

      {/* Timer */}
      {!isTerminalStatus(status) && (
        <View style={addrStyles.timerRow}>
          <Text style={[addrStyles.timerLabel, { color: colors.textMuted }]}>Действителен:</Text>
          <Text style={[addrStyles.timer, { color: colors.primary }, isExpired && { color: colors.error }]}>
            {formatCountdown(secondsLeft)}
          </Text>
        </View>
      )}

      {/* Status */}
      <View style={[addrStyles.statusBadge, { borderColor: statusColor }]}>
        <Text style={[addrStyles.statusText, { color: statusColor }]}>
          {statusIcon}
        </Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TopupScreen() {
  const { colors } = useTheme();
  // Shared
  const [activeTab, setActiveTab] = useState<TabId>('card');

  // Card tab
  const [cardAmount, setCardAmount] = useState('');
  const [isCardLoading, setIsCardLoading] = useState(false);
  const { topup, load } = useWalletStore();

  // Crypto tab — step 1 (selection)
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<CryptoCurrency>('USDT');
  const [selectedNetwork, setSelectedNetwork] = useState<UsdtNetwork>('TRC20');
  const [isCryptoLoading, setIsCryptoLoading] = useState(false);

  // Crypto tab — step 2 (deposit info + polling)
  const [deposit, setDeposit] = useState<CreateDepositResponse | null>(null);
  const [depositStatus, setDepositStatus] = useState<DepositStatusResponse | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Card tab handlers ───────────────────────────────────────────────────────

  function handlePreset(value: number) {
    setCardAmount(String(value));
  }

  async function handleCardTopup() {
    const numAmount = Number(cardAmount);
    if (!cardAmount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Ошибка', 'Введите корректную сумму');
      return;
    }
    if (numAmount < 1) {
      Alert.alert('Ошибка', 'Минимальная сумма пополнения — $1');
      return;
    }

    setIsCardLoading(true);
    try {
      const intent = await createStripePaymentIntent(numAmount);

      if (intent.checkoutUrl) {
        Alert.alert(
          'Оплата картой',
          'Сейчас откроется страница Stripe для безопасного ввода данных карты. После оплаты вернитесь в приложение.',
          [
            { text: 'Отмена', style: 'cancel' },
            {
              text: 'Продолжить',
              onPress: async () => {
                await WebBrowser.openBrowserAsync(intent.checkoutUrl as string);
                // Refresh balance after browser closes — payment may have completed
                await load();
                toast.info('Проверьте баланс — оплата может занять несколько секунд');
              },
            },
          ],
        );
      } else {
        // Backend returned a clientSecret but no hosted URL — direct charge flow
        await load();
        await sendPaymentConfirmation(numAmount);
        toast.success(`Кошелёк пополнен на $${numAmount.toLocaleString('ru-RU')}`);
        router.back();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      // Stripe not configured on the backend yet
      if (
        msg.includes('stripe') ||
        msg.includes('Stripe') ||
        msg.includes('payment') ||
        msg.includes('404') ||
        msg.includes('501') ||
        msg.toLowerCase().includes('not configured') ||
        msg.toLowerCase().includes('not implemented')
      ) {
        Alert.alert(
          'Stripe не настроен',
          'Добавьте STRIPE_PUBLISHABLE_KEY и STRIPE_SECRET_KEY в Railway',
          [{ text: 'Понятно' }],
        );
      } else {
        // Generic network / server error
        toast.error('Ошибка оплаты. Попробуйте ещё раз. ' + msg);
      }
    } finally {
      setIsCardLoading(false);
    }
  }

  // ── Crypto tab handlers ─────────────────────────────────────────────────────

  function stopPolling() {
    if (pollingRef.current !== null) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  const pollStatus = useCallback(
    async (depositId: string, priceAmount: number) => {
      try {
        const status = await cryptoDepositService.getDepositStatus(depositId);
        setDepositStatus(status);

        if (isTerminalStatus(status.status)) {
          stopPolling();

          if (isSuccessStatus(status.status)) {
            await load();
            toast.success(`Кошелёк пополнен на $${priceAmount}`);
            setTimeout(() => {
              setDeposit(null);
              setDepositStatus(null);
              router.back();
            }, 2500);
          }
        }
      } catch {
        // Ignore polling errors; keep trying
      }
    },
    [load],
  );

  async function handleGetAddress() {
    const numAmount = Number(cryptoAmount);
    if (!cryptoAmount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Ошибка', 'Введите корректную сумму в USD');
      return;
    }
    if (numAmount < 1) {
      Alert.alert('Ошибка', 'Минимальная сумма — $1');
      return;
    }

    setIsCryptoLoading(true);
    try {
      const result = await cryptoDepositService.createDeposit({
        amount: numAmount,
        currency: selectedCurrency,
        network: selectedCurrency === 'USDT' ? selectedNetwork : undefined,
      });
      setDeposit(result);
      setDepositStatus(null);

      // Start polling
      stopPolling();
      pollingRef.current = setInterval(() => {
        pollStatus(result.depositId, result.priceAmount);
      }, POLLING_INTERVAL_MS);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка создания депозита';
      toast.error(msg);
    } finally {
      setIsCryptoLoading(false);
    }
  }

  async function handleCopyAddress() {
    if (!deposit) return;
    try {
      await Share.share({
        message: deposit.payAddress,
        title: 'Адрес кошелька',
      });
    } catch {
      Alert.alert('Адрес', deposit.payAddress);
    }
  }

  function handleCloseDeposit() {
    stopPolling();
    setDeposit(null);
    setDepositStatus(null);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero card */}
        <LinearGradient
          colors={[colors.card, colors.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.cardPreview, { borderColor: `${colors.primary}30`, shadowColor: colors.primary }]}
        >
          <Text style={[styles.cardLabel, { color: colors.textMuted }]}>ПОПОЛНЕНИЕ КОШЕЛЬКА</Text>
          <Text style={[styles.cardNumber, { color: colors.text }]}>**** **** **** 4242</Text>
          <View style={styles.cardDot}>
            <Text style={[styles.cardDotText, { color: colors.primary }]}>VISA</Text>
          </View>
        </LinearGradient>

        {/* Tab switcher */}
        <View style={[styles.tabBar, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'card' && { backgroundColor: colors.primary, shadowColor: colors.primary },
            ]}
            onPress={() => setActiveTab('card')}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.tabText,
              { color: colors.textMuted },
              activeTab === 'card' && { color: colors.textInverse, fontWeight: Typography.weights.bold },
            ]}>
              Карта
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'crypto' && { backgroundColor: colors.primary, shadowColor: colors.primary },
            ]}
            onPress={() => setActiveTab('crypto')}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.tabText,
              { color: colors.textMuted },
              activeTab === 'crypto' && { color: colors.textInverse, fontWeight: Typography.weights.bold },
            ]}>
              Крипто
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Card tab ── */}
        {activeTab === 'card' && (
          <View>
            <Text style={[styles.label, { color: colors.text }]}>Сумма пополнения</Text>
            <View style={[styles.amountInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                value={cardAmount}
                onChangeText={(v) => setCardAmount(v.replace(/[^0-9]/g, ''))}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                style={[styles.amountInput, { color: colors.text }]}
                keyboardType="numeric"
                maxLength={8}
              />
              <Text style={[styles.currencySymbol, { color: colors.textMuted }]}>$</Text>
            </View>

            <Text style={[styles.presetsLabel, { color: colors.textMuted }]}>Быстрый выбор</Text>
            <View style={styles.presetsRow}>
              {PRESETS.map((preset) => {
                const isActive = Number(cardAmount) === preset;
                return (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.presetBtn,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      isActive && { backgroundColor: `${colors.primary}20`, borderColor: colors.primary, shadowColor: colors.primary },
                    ]}
                    onPress={() => handlePreset(preset)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.presetText,
                      { color: colors.text },
                      isActive && { color: colors.primary, fontWeight: Typography.weights.bold },
                    ]}>
                      ${preset}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Button
              title="Оплатить картой"
              onPress={handleCardTopup}
              loading={isCardLoading}
              fullWidth
              style={styles.actionBtn}
            />

            <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
              Оплата проходит через Stripe. При нажатии откроется защищённая
              страница для ввода данных карты.
            </Text>
          </View>
        )}

        {/* ── Crypto tab ── */}
        {activeTab === 'crypto' && (
          <View>
            {/* Amount input */}
            <Text style={[styles.label, { color: colors.text }]}>Сумма в USD</Text>
            <View style={[styles.amountInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                value={cryptoAmount}
                onChangeText={(v) => setCryptoAmount(v.replace(/[^0-9.]/g, ''))}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                style={[styles.amountInput, { color: colors.text }]}
                keyboardType="decimal-pad"
                maxLength={10}
              />
              <Text style={[styles.currencySymbol, { color: colors.textMuted }]}>$</Text>
            </View>

            {/* Currency selector */}
            <Text style={[styles.presetsLabel, { color: colors.textMuted }]}>Валюта</Text>
            <View style={styles.currencyList}>
              {CURRENCIES.map((cur) => {
                const isActive = selectedCurrency === cur.id;
                return (
                  <TouchableOpacity
                    key={cur.id}
                    style={[
                      styles.currencyRow,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      isActive && { backgroundColor: `${colors.primary}15`, borderColor: colors.primary },
                    ]}
                    onPress={() => setSelectedCurrency(cur.id)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.currencyIcon}>{cur.icon}</Text>
                    <Text style={[
                      styles.currencyLabel,
                      { color: colors.text },
                      isActive && { color: colors.primary, fontWeight: Typography.weights.semibold },
                    ]}>
                      {cur.label}
                    </Text>
                    <View style={[
                      styles.radioCircle,
                      { borderColor: colors.border },
                      isActive && { borderColor: colors.primary },
                    ]}>
                      {isActive && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* USDT network chips */}
            {selectedCurrency === 'USDT' && (
              <View style={styles.networkSection}>
                <Text style={[styles.presetsLabel, { color: colors.textMuted }]}>Сеть</Text>
                <View style={styles.networkRow}>
                  {USDT_NETWORKS.map((net) => {
                    const isActive = selectedNetwork === net;
                    return (
                      <TouchableOpacity
                        key={net}
                        style={[
                          styles.networkChip,
                          { backgroundColor: colors.card, borderColor: colors.border },
                          isActive && { backgroundColor: `${colors.primary}20`, borderColor: colors.primary },
                        ]}
                        onPress={() => setSelectedNetwork(net)}
                        activeOpacity={0.75}
                      >
                        <Text style={[
                          styles.networkChipText,
                          { color: colors.textMuted },
                          isActive && { color: colors.primary },
                        ]}>
                          {net}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <Button
              title="Получить адрес"
              onPress={handleGetAddress}
              loading={isCryptoLoading}
              fullWidth
              style={styles.actionBtn}
            />

            <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
              Адрес генерируется разово. Отправляйте только выбранную валюту на
              указанную сеть.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Deposit modal ── */}
      <Modal
        visible={deposit !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseDeposit}
      >
        <View style={[modalStyles.root, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[modalStyles.header, { borderBottomColor: colors.border }]}>
            <Text style={[modalStyles.headerTitle, { color: colors.text }]}>Крипто-пополнение</Text>
            <TouchableOpacity
              style={[modalStyles.closeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={handleCloseDeposit}
              activeOpacity={0.7}
            >
              <Text style={[modalStyles.closeBtnText, { color: colors.textMuted }]}>Закрыть</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={modalStyles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            {deposit !== null && (
              <AddressCard
                deposit={deposit}
                depositStatus={depositStatus}
                onCopy={handleCopyAddress}
              />
            )}

            {/* Polling indicator */}
            {deposit !== null &&
              depositStatus === null && (
                <ActivityIndicator
                  color={colors.primary}
                  style={{ marginTop: 16 }}
                />
              )}

            <Text style={[modalStyles.hint, { color: colors.textMuted }]}>
              Мы проверяем транзакцию каждые 10 секунд. Не закрывайте экран до
              подтверждения.
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── Styles: main screen ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  cardPreview: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    minHeight: 130,
    justifyContent: 'space-between',
  },
  cardLabel: {
    fontSize: Typography.sizes.xs,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: Typography.weights.semibold,
  },
  cardNumber: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    letterSpacing: 3,
    marginTop: 16,
  },
  cardDot: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  cardDotText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    letterSpacing: 1,
  },
  // Tabs
  tabBar: {
    flexDirection: 'row',
    borderRadius: 32,
    padding: 4,
    marginBottom: 28,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 28,
  },
  tabText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  // Shared form elements
  label: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    marginBottom: 12,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  amountInput: {
    flex: 1,
    fontSize: Typography.sizes['3xl'],
    fontWeight: Typography.weights.bold,
    paddingVertical: 16,
  },
  currencySymbol: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.medium,
  },
  presetsLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 32,
  },
  presetBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 32,
    borderWidth: 1.5,
    flex: 1,
    alignItems: 'center',
  },
  presetText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  actionBtn: {
    marginBottom: 20,
  },
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  // Currency selector
  currencyList: {
    gap: 8,
    marginBottom: 20,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  currencyIcon: {
    fontSize: 22,
    width: 28,
    textAlign: 'center',
  },
  currencyLabel: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  // Network chips
  networkSection: {
    marginBottom: 20,
  },
  networkRow: {
    flexDirection: 'row',
    gap: 8,
  },
  networkChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 32,
    borderWidth: 1.5,
  },
  networkChipText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
});

// ─── Styles: address card ─────────────────────────────────────────────────────

const addrStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    marginTop: -10,
  },
  qrBox: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  qrHint: {
    fontSize: Typography.sizes.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: Typography.weights.semibold,
  },
  qrAddress: {
    fontFamily: 'monospace',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 0.3,
  },
  copyBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  copyBtnText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  timerLabel: {
    fontSize: Typography.sizes.sm,
  },
  timer: {
    fontFamily: 'monospace',
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    letterSpacing: 2,
  },
  statusBadge: {
    borderRadius: 32,
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignSelf: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
});

// ─── Styles: modal ────────────────────────────────────────────────────────────

const modalStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  closeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 32,
    borderWidth: 1,
  },
  closeBtnText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  scroll: {
    padding: 24,
    paddingBottom: 40,
    gap: 20,
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
