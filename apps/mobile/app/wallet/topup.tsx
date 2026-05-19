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
import { router } from 'expo-router';
import { useWalletStore } from '../../stores/walletStore';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { sendPaymentConfirmation } from '../../services/notifications.service';
import { toast } from '../../lib/toast';
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

function getStatusLabel(status: DepositStatus): string {
  switch (status) {
    case 'WAITING':
      return 'Ожидаем платёж...';
    case 'CONFIRMING':
      return 'Подтверждение...';
    case 'CONFIRMED':
    case 'SENDING':
    case 'FINISHED':
      return 'Зачислено!';
    case 'FAILED':
      return 'Ошибка платежа';
    case 'EXPIRED':
      return 'Истекло';
    default:
      return 'Ожидаем платёж...';
  }
}

function getStatusPrefix(status: DepositStatus): string {
  switch (status) {
    case 'CONFIRMING':
      return '';
    case 'CONFIRMED':
    case 'SENDING':
    case 'FINISHED':
      return 'Зачислено!';
    case 'FAILED':
      return '';
    case 'EXPIRED':
      return '';
    default:
      return '';
  }
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

  let statusColor: string = Colors.textMuted;
  let statusIcon = '';
  if (isSuccess) {
    statusColor = Colors.success;
    statusIcon = 'Зачислено!';
  } else if (isExpired || isFailed) {
    statusColor = Colors.error;
    statusIcon = isExpired ? 'Истекло' : 'Ошибка платежа';
  } else if (status === 'CONFIRMING') {
    statusColor = Colors.warning;
    statusIcon = 'Подтверждение...';
  } else {
    statusColor = Colors.textMuted;
    statusIcon = 'Ожидаем платёж...';
  }

  return (
    <View style={addrStyles.card}>
      {/* Title */}
      <Text style={addrStyles.title}>
        Отправьте {deposit.payAmount} {deposit.payCurrency}
      </Text>
      <Text style={addrStyles.subtitle}>
        (≈ ${deposit.priceAmount} USD)
      </Text>

      {/* QR placeholder — large address in box */}
      <View style={addrStyles.qrBox}>
        <Text style={addrStyles.qrHint}>Адрес кошелька</Text>
        <Text style={addrStyles.qrAddress} selectable>
          {deposit.payAddress}
        </Text>
      </View>

      {/* Copy button */}
      <TouchableOpacity style={addrStyles.copyBtn} onPress={onCopy} activeOpacity={0.75}>
        <Text style={addrStyles.copyBtnText}>Скопировать адрес</Text>
      </TouchableOpacity>

      {/* Timer */}
      {!isTerminalStatus(status) && (
        <View style={addrStyles.timerRow}>
          <Text style={addrStyles.timerLabel}>Действителен:</Text>
          <Text style={[addrStyles.timer, isExpired && { color: Colors.error }]}>
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
      const result = await topup(numAmount);

      if (result?.paymentUrl) {
        await Linking.openURL(result.paymentUrl);
        toast.info('Завершите оплату в браузере, затем вернитесь в приложение');
      } else {
        await load();
        await sendPaymentConfirmation(numAmount);
        toast.success(`Кошелёк пополнен на $${numAmount.toLocaleString('ru-RU')}`);
        router.back();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('stripe') || msg.includes('payment')) {
        Alert.alert(
          'Функция в разработке',
          'Для пополнения требуется интеграция со Stripe. Обратитесь к администратору.',
          [{ text: 'Понятно' }],
        );
      } else {
        toast.error(msg || 'Ошибка пополнения');
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
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero card */}
        <LinearGradient
          colors={['#1C1C2E', '#2D1A0A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardPreview}
        >
          <Text style={styles.cardLabel}>ПОПОЛНЕНИЕ КОШЕЛЬКА</Text>
          <Text style={styles.cardNumber}>**** **** **** 4242</Text>
          <View style={styles.cardDot}>
            <Text style={styles.cardDotText}>VISA</Text>
          </View>
        </LinearGradient>

        {/* Tab switcher */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'card' && styles.tabActive]}
            onPress={() => setActiveTab('card')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'card' && styles.tabTextActive]}>
              Карта
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'crypto' && styles.tabActive]}
            onPress={() => setActiveTab('crypto')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'crypto' && styles.tabTextActive]}>
              Крипто
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Card tab ── */}
        {activeTab === 'card' && (
          <View>
            <Text style={styles.label}>Сумма пополнения</Text>
            <View style={styles.amountInputWrapper}>
              <TextInput
                value={cardAmount}
                onChangeText={(v) => setCardAmount(v.replace(/[^0-9]/g, ''))}
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                style={styles.amountInput}
                keyboardType="numeric"
                maxLength={8}
              />
              <Text style={styles.currencySymbol}>$</Text>
            </View>

            <Text style={styles.presetsLabel}>Быстрый выбор</Text>
            <View style={styles.presetsRow}>
              {PRESETS.map((preset) => {
                const isActive = Number(cardAmount) === preset;
                return (
                  <TouchableOpacity
                    key={preset}
                    style={[styles.presetBtn, isActive && styles.presetBtnActive]}
                    onPress={() => handlePreset(preset)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.presetText, isActive && styles.presetTextActive]}>
                      ${preset}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Button
              title="Пополнить"
              onPress={handleCardTopup}
              loading={isCardLoading}
              fullWidth
              style={styles.actionBtn}
            />

            <Text style={styles.disclaimer}>
              Демо-режим: деньги зачисляются мгновенно. В продакшне — интеграция
              со Stripe или другим платёжным шлюзом.
            </Text>
          </View>
        )}

        {/* ── Crypto tab ── */}
        {activeTab === 'crypto' && (
          <View>
            {/* Amount input */}
            <Text style={styles.label}>Сумма в USD</Text>
            <View style={styles.amountInputWrapper}>
              <TextInput
                value={cryptoAmount}
                onChangeText={(v) => setCryptoAmount(v.replace(/[^0-9.]/g, ''))}
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                style={styles.amountInput}
                keyboardType="decimal-pad"
                maxLength={10}
              />
              <Text style={styles.currencySymbol}>$</Text>
            </View>

            {/* Currency selector */}
            <Text style={styles.presetsLabel}>Валюта</Text>
            <View style={styles.currencyList}>
              {CURRENCIES.map((cur) => {
                const isActive = selectedCurrency === cur.id;
                return (
                  <TouchableOpacity
                    key={cur.id}
                    style={[styles.currencyRow, isActive && styles.currencyRowActive]}
                    onPress={() => setSelectedCurrency(cur.id)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.currencyIcon}>{cur.icon}</Text>
                    <Text style={[styles.currencyLabel, isActive && styles.currencyLabelActive]}>
                      {cur.label}
                    </Text>
                    <View style={[styles.radioCircle, isActive && styles.radioCircleActive]}>
                      {isActive && <View style={styles.radioDot} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* USDT network chips */}
            {selectedCurrency === 'USDT' && (
              <View style={styles.networkSection}>
                <Text style={styles.presetsLabel}>Сеть</Text>
                <View style={styles.networkRow}>
                  {USDT_NETWORKS.map((net) => {
                    const isActive = selectedNetwork === net;
                    return (
                      <TouchableOpacity
                        key={net}
                        style={[styles.networkChip, isActive && styles.networkChipActive]}
                        onPress={() => setSelectedNetwork(net)}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[styles.networkChipText, isActive && styles.networkChipTextActive]}
                        >
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

            <Text style={styles.disclaimer}>
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
        <View style={modalStyles.root}>
          {/* Header */}
          <View style={modalStyles.header}>
            <Text style={modalStyles.headerTitle}>Крипто-пополнение</Text>
            <TouchableOpacity
              style={modalStyles.closeBtn}
              onPress={handleCloseDeposit}
              activeOpacity={0.7}
            >
              <Text style={modalStyles.closeBtnText}>Закрыть</Text>
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
                  color={Colors.primary}
                  style={{ marginTop: 16 }}
                />
              )}

            <Text style={modalStyles.hint}>
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
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    borderColor: `${Colors.primary}30`,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    minHeight: 130,
    justifyContent: 'space-between',
  },
  cardLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: Typography.weights.semibold,
  },
  cardNumber: {
    color: Colors.text,
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
    color: Colors.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    letterSpacing: 1,
  },
  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
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
  tabActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  tabText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  tabTextActive: {
    color: Colors.textInverse,
    fontWeight: Typography.weights.bold,
  },
  // Shared form elements
  label: {
    color: Colors.text,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    marginBottom: 12,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  amountInput: {
    flex: 1,
    color: Colors.text,
    fontSize: Typography.sizes['3xl'],
    fontWeight: Typography.weights.bold,
    paddingVertical: 16,
  },
  currencySymbol: {
    color: Colors.textMuted,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.medium,
  },
  presetsLabel: {
    color: Colors.textMuted,
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
    backgroundColor: Colors.card,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: Colors.border,
    flex: 1,
    alignItems: 'center',
  },
  presetBtnActive: {
    backgroundColor: `${Colors.primary}20`,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  presetText: {
    color: Colors.text,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  presetTextActive: {
    color: Colors.primary,
    fontWeight: Typography.weights.bold,
  },
  actionBtn: {
    marginBottom: 20,
  },
  disclaimer: {
    color: Colors.textMuted,
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
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  currencyRowActive: {
    backgroundColor: `${Colors.primary}15`,
    borderColor: Colors.primary,
  },
  currencyIcon: {
    fontSize: 22,
    width: 28,
    textAlign: 'center',
  },
  currencyLabel: {
    flex: 1,
    color: Colors.text,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  currencyLabelActive: {
    color: Colors.primary,
    fontWeight: Typography.weights.semibold,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: Colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
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
    backgroundColor: Colors.card,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  networkChipActive: {
    backgroundColor: `${Colors.primary}20`,
    borderColor: Colors.primary,
  },
  networkChipText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  networkChipTextActive: {
    color: Colors.primary,
  },
});

// ─── Styles: address card ─────────────────────────────────────────────────────

const addrStyles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  title: {
    color: Colors.text,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    marginTop: -10,
  },
  qrBox: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  qrHint: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: Typography.weights.semibold,
  },
  qrAddress: {
    color: Colors.text,
    fontFamily: 'monospace',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 0.3,
  },
  copyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  copyBtnText: {
    color: Colors.textInverse,
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
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
  },
  timer: {
    color: Colors.primary,
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
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  closeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Colors.card,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  closeBtnText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  scroll: {
    padding: 24,
    paddingBottom: 40,
    gap: 20,
  },
  hint: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
