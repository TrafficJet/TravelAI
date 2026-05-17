import React, { useState } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useWalletStore } from '../../stores/walletStore';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { sendPaymentConfirmation } from '../../services/notifications.service';
import { toast } from '../../lib/toast';

const PRESETS = [10, 25, 50, 100];

export default function TopupScreen() {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { topup, load } = useWalletStore();

  function handlePreset(value: number) {
    setAmount(String(value));
  }

  async function handleTopup() {
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
        // YooKassa mode — redirect to payment page; money not yet credited.
        await Linking.openURL(result.paymentUrl);
        toast.info('Завершите оплату в браузере, затем вернитесь в приложение');
      } else {
        // Mock mode — balance credited immediately.
        await load();
        await sendPaymentConfirmation(numAmount);
        toast.success(`Кошелёк пополнен на $${numAmount.toLocaleString('ru-RU')}`);
        router.back();
      }
    } catch (err: unknown) {
      // If real payment integration needed show Stripe placeholder
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
      setIsLoading(false);
    }
  }

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
        {/* Hero balance card */}
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

        {/* Amount input */}
        <Text style={styles.label}>Сумма пополнения</Text>
        <View style={styles.amountInputWrapper}>
          <TextInput
            value={amount}
            onChangeText={(v) => setAmount(v.replace(/[^0-9]/g, ''))}
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
            style={styles.amountInput}
            keyboardType="numeric"
            maxLength={8}
          />
          <Text style={styles.currencySymbol}>$</Text>
        </View>

        {/* Presets — pill chips */}
        <Text style={styles.presetsLabel}>Быстрый выбор</Text>
        <View style={styles.presetsRow}>
          {PRESETS.map((preset) => {
            const isActive = Number(amount) === preset;
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
          onPress={handleTopup}
          loading={isLoading}
          fullWidth
          style={styles.topupBtn}
        />

        <Text style={styles.disclaimer}>
          Демо-режим: деньги зачисляются мгновенно. В продакшне — интеграция
          со Stripe или другим платёжным шлюзом.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

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
    marginBottom: 32,
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
  topupBtn: {
    marginBottom: 20,
  },
  disclaimer: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
