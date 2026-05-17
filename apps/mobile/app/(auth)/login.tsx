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
import { Radius } from '../../constants/radius';
import { analytics, Events } from '../../src/analytics';
import { SocialAuthButtons } from '../../components/auth/SocialAuthButtons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const login = useAuthStore((state) => state.login);

  function validate(): boolean {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) newErrors.email = 'Введите email';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Некорректный email';
    if (!password) newErrors.password = 'Введите пароль';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;

    setIsLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      analytics.track(Events.LOGGED_IN);
      router.replace('/(tabs)');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Неверный email или пароль';
      Alert.alert('Ошибка входа', message);
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
          <Text style={styles.title}>Travel AI</Text>
          <Text style={styles.subtitle}>AI-ассистент для путешествий</Text>
        </View>

        <View style={styles.form}>
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
            placeholder="Ваш пароль"
            secureTextEntry
            error={errors.password}
          />

          <Button
            title="Войти"
            onPress={handleLogin}
            loading={isLoading}
            fullWidth
            style={styles.loginBtn}
          />

          <SocialAuthButtons mode="login" />

          <TouchableOpacity
            onPress={() => router.push('/(auth)/forgot-password')}
            style={styles.forgotLink}
          >
            <Text style={styles.forgotText}>
              <Text style={styles.forgotTextAccent}>Забыли пароль?</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/register')}
            style={styles.registerLink}
          >
            <Text style={styles.registerText}>
              Нет аккаунта?{' '}
              <Text style={styles.registerTextAccent}>Зарегистрироваться</Text>
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
    ...TextPresets.h1,
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
  loginBtn: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  forgotLink: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  forgotText: {
    ...TextPresets.body,
  },
  forgotTextAccent: {
    color: Colors.primary,
    fontWeight: Typography.weights.medium,
  },
  registerLink: {
    alignItems: 'center',
  },
  registerText: {
    ...TextPresets.body,
    color: Colors.textMuted,
  },
  registerTextAccent: {
    color: Colors.primary,
    fontWeight: Typography.weights.semibold,
  },
});
