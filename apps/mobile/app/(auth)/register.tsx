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
import { router } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../constants/colors';
import { Typography, TextPresets } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { analytics, Events } from '../../src/analytics';
import { SocialAuthButtons } from '../../components/auth/SocialAuthButtons';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});

  const register = useAuthStore((state) => state.register);

  function validate(): boolean {
    const newErrors: { name?: string; email?: string; password?: string } = {};
    if (!name.trim()) newErrors.name = 'Введите имя';
    if (!email.trim()) newErrors.email = 'Введите email';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Некорректный email';
    if (!password) newErrors.password = 'Введите пароль';
    else if (password.length < 6)
      newErrors.password = 'Пароль должен содержать минимум 6 символов';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;

    setIsLoading(true);
    try {
      await register(email.trim().toLowerCase(), password, name.trim());
      analytics.track(Events.REGISTERED);
      router.replace('/(tabs)');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Ошибка регистрации. Попробуйте снова.';
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
          <Text style={styles.logo}>✈️</Text>
          <Text style={styles.title}>Создать аккаунт</Text>
          <Text style={styles.subtitle}>Начните планировать путешествия</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Имя"
            value={name}
            onChangeText={setName}
            placeholder="Ваше имя"
            autoCapitalize="words"
            error={errors.name}
          />
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.email}
          />
          <Input
            label="Пароль"
            value={password}
            onChangeText={setPassword}
            placeholder="Минимум 6 символов"
            secureTextEntry
            error={errors.password}
          />

          <Button
            title="Зарегистрироваться"
            onPress={handleRegister}
            loading={isLoading}
            fullWidth
            style={styles.registerBtn}
          />

          <SocialAuthButtons mode="register" />

          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            style={[styles.loginLink, { marginTop: 16 }]}
          >
            <Text style={styles.loginText}>
              Уже есть аккаунт?{' '}
              <Text style={styles.loginTextAccent}>Войти</Text>
            </Text>
          </TouchableOpacity>
        </View>
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
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...TextPresets.body,
    color: Colors.textMuted,
  },
  form: {
    width: '100%',
  },
  registerBtn: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  loginLink: {
    alignItems: 'center',
  },
  loginText: {
    ...TextPresets.body,
    color: Colors.textMuted,
  },
  loginTextAccent: {
    color: Colors.primary,
    fontFamily: 'Inter',
    fontWeight: Typography.weights.semibold,
  },
});
