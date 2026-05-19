import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../src/theme/ThemeContext';
import { Typography, TextPresets } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { toast } from '../../lib/toast';
import api from '../../services/api';

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const { token } = useLocalSearchParams<{ token: string }>();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  function validate(): boolean {
    const newErrors: { password?: string; confirmPassword?: string } = {};

    if (!password) {
      newErrors.password = 'Введите новый пароль';
    } else if (password.length < 8) {
      newErrors.password = 'Пароль должен содержать минимум 8 символов';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Подтвердите пароль';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!token) {
      Alert.alert('Ошибка', 'Недействительная ссылка для сброса пароля.');
      return;
    }

    if (!validate()) return;

    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      toast.success('Пароль изменён');
      router.replace('/(auth)/login');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Не удалось сбросить пароль. Попробуйте снова.';
      Alert.alert('Ошибка', message);
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
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.logo}>🔒</Text>
          <Text style={styles.title}>Новый пароль</Text>
          <Text style={styles.subtitle}>
            Придумайте надёжный пароль для вашего аккаунта
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Новый пароль"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
            }}
            placeholder="Минимум 8 символов"
            secureTextEntry
            error={errors.password}
          />
          <Input
            label="Подтверждение пароля"
            value={confirmPassword}
            onChangeText={(v) => {
              setConfirmPassword(v);
              if (errors.confirmPassword)
                setErrors((e) => ({ ...e, confirmPassword: undefined }));
            }}
            placeholder="Повторите пароль"
            secureTextEntry
            error={errors.confirmPassword}
          />

          <Button
            title="Сохранить пароль"
            onPress={handleSubmit}
            loading={isLoading}
            fullWidth
            style={styles.submitBtn}
          />

          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            style={styles.backLink}
          >
            <Text style={styles.backText}>
              {'← '}
              <Text style={styles.backTextAccent}>Вернуться к входу</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function getStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: Spacing.lg,
    },
    header: {
      alignItems: 'center',
      marginBottom: Spacing.xl,
    },
    logo: {
      fontSize: Typography.sizes['4xl'],
      marginBottom: Spacing.sm,
    },
    title: {
      ...TextPresets.h2,
      color: colors.text,
      marginBottom: Spacing.sm,
      textAlign: 'center',
    },
    subtitle: {
      ...TextPresets.body,
      color: colors.textMuted,
      textAlign: 'center',
    },
    form: {
      width: '100%',
    },
    submitBtn: {
      marginTop: Spacing.sm,
      marginBottom: Spacing.md,
    },
    backLink: {
      alignItems: 'center',
      marginTop: Spacing.xs,
    },
    backText: {
      ...TextPresets.body,
      color: colors.textMuted,
    },
    backTextAccent: {
      color: colors.primary,
      fontWeight: Typography.weights.semibold,
    },
  });
}
