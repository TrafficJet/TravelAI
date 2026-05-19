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
import { Ionicons } from '@expo/vector-icons';
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

  async function handleLogin(overrideEmail?: string, overridePassword?: string) {
    const loginEmail = overrideEmail ?? email;
    const loginPassword = overridePassword ?? password;

    if (!overrideEmail) {
      // Only validate form when not using demo credentials
      const newErrors: { email?: string; password?: string } = {};
      if (!loginEmail.trim()) newErrors.email = 'Введите email';
      else if (!/\S+@\S+\.\S+/.test(loginEmail)) newErrors.email = 'Некорректный email';
      if (!loginPassword) newErrors.password = 'Введите пароль';
      setErrors(newErrors);
      if (Object.keys(newErrors).length > 0) return;
    }

    setIsLoading(true);
    try {
      await login(loginEmail.trim().toLowerCase(), loginPassword);
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

  async function handleDemoLogin() {
    setEmail('demo@travelai.app');
    setPassword('Demo1234!');
    setErrors({});
    await handleLogin('demo@travelai.app', 'Demo1234!');
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
          <View style={styles.logoWrap}>
            <Ionicons name="airplane" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.title}>TravelAI</Text>
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
            onPress={() => handleLogin()}
            loading={isLoading}
            fullWidth
            style={styles.loginBtn}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>— или —</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.demoBtn, isLoading && styles.demoBtnDisabled]}
            onPress={handleDemoLogin}
            activeOpacity={0.75}
            disabled={isLoading}
          >
            <Text style={styles.demoBtnTitle}>Попробовать демо</Text>
            <Text style={styles.demoBtnHint}>Без регистрации</Text>
          </TouchableOpacity>

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
    paddingTop: Spacing.lg,
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  title: {
    fontFamily: 'Sora',
    fontSize: 34,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    ...TextPresets.body,
    color: Colors.textMuted,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    letterSpacing: Typography.letterSpacing.wide,
  },
  form: {
    width: '100%',
  },
  demoBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#14B8A6',
    borderRadius: 28,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'center',
    height: 56,
    justifyContent: 'center',
  },
  demoBtnDisabled: {
    opacity: 0.5,
  },
  demoBtnTitle: {
    ...TextPresets.button,
    color: '#14B8A6',
  },
  demoBtnHint: {
    ...TextPresets.caption,
    color: '#14B8A6',
    opacity: 0.75,
    marginTop: 2,
  },
  loginBtn: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F59E0B',
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
