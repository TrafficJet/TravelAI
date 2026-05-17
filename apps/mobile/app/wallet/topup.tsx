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
import { router } from 'expo-router';
import { useWalletStore } from '../../stores/walletStore';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { sendPaymentConfirmation } from '../../services/notifications.service';
import { toast } from '../../lib/toast';

const PRESETS = [10, 30, 50, 100];

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
      const msg = err instanceof Error ? err.message : 'Ошибка пополнения';
      toast.error(msg);
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
        {/* Card mock */}
        <View style={styles.cardPreview}>
          <Text style={styles.cardLabel}>Карта</Text>
          <Text style={styles.cardNumber}>**** **** **** 4242</Text>
        </View>

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

        {/* Presets */}
        <Text style={styles.presetsLabel}>Быстрый выбор</Text>
        <View style={styles.presetsRow}>
          {PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset}
              style={[
                styles.presetBtn,
                Number(amount) === preset && styles.presetBtnActive,
              ]}
              onPress={() => handlePreset(preset)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.presetText,
                  Number(amount) === preset && styles.presetTextActive,
                ]}
              >
                {preset.toLocaleString('ru-RU')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button
          title="Пополнить"
          onPress={handleTopup}
          loading={isLoading}
          fullWidth
          style={styles.topupBtn}
        />

        <Text style={styles.disclaimer}>
          Демо-режим: деньги списываются с тестовой карты. В продакшне — интеграция
          с платёжным шлюзом.
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
    backgroundColor: Colors.primary,
    borderRadius: 18,
    padding: 24,
    marginBottom: 32,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  cardLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    marginBottom: 24,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardNumber: {
    color: Colors.text,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    letterSpacing: 2,
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
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 32,
  },
  presetBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  presetBtnActive: {
    backgroundColor: `${Colors.primary}30`,
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
