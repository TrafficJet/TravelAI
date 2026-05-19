import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { SocialAuthButtons } from '../../components/auth/SocialAuthButtons';
import { useTheme } from '../../src/theme/ThemeContext';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { Radius } from '../../constants/radius';

type Tab = 'login' | 'register';

export interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  reason?: 'booking' | 'profile';
}

export default function AuthModal({ visible, onClose, reason }: AuthModalProps) {
  const { colors } = useTheme();
  const { login, register } = useAuthStore();

  const [activeTab, setActiveTab] = useState<Tab>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');

  function handleClose() {
    // Reset errors on close
    setLoginError('');
    setRegError('');
    onClose();
  }

  function handleForgotPassword() {
    handleClose();
    router.push('/(auth)/forgot-password' as never);
  }

  async function handleLogin() {
    setLoginError('');
    const email = loginEmail.trim();
    const password = loginPassword;
    if (!email || !password) {
      setLoginError('Заполните email и пароль.');
      return;
    }
    setLoginLoading(true);
    try {
      await login(email, password);
      handleClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка входа. Попробуйте снова.';
      setLoginError(msg);
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleRegister() {
    setRegError('');
    const name = regName.trim();
    const email = regEmail.trim();
    const password = regPassword;
    if (!name || !email || !password) {
      setRegError('Заполните все поля.');
      return;
    }
    setRegLoading(true);
    try {
      await register(email, password, name);
      handleClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка регистрации. Попробуйте снова.';
      setRegError(msg);
    } finally {
      setRegLoading(false);
    }
  }

  const isLoading = loginLoading || regLoading;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={staticStyles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[staticStyles.container, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={staticStyles.header}>
            <Text style={[staticStyles.headerTitle, { color: colors.text }]}>Войдите в аккаунт</Text>
            <TouchableOpacity
              onPress={handleClose}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={staticStyles.closeBtn}
            >
              <Text style={{ fontSize: 22, color: colors.textMuted, lineHeight: 26  }}>{'×'}</Text>
            </TouchableOpacity>
          </View>

          {/* Reason banner */}
          {reason === 'booking' && (
            <View style={[staticStyles.reasonBanner, { backgroundColor: `${colors.primary}26`, borderColor: colors.primary }]}>
              <Text style={{ fontSize: 16, color: colors.primary, lineHeight: 20, marginRight: 6  }}>{'ℹ'}</Text>
              <Text style={[staticStyles.reasonBannerText, { color: colors.primary }]}>Для бронирования нужен аккаунт</Text>
            </View>
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={staticStyles.scrollContent}
          >
            {/* Tabs */}
            <View style={[staticStyles.tabRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[staticStyles.tab, activeTab === 'login' && { backgroundColor: colors.primary }]}
                onPress={() => { setActiveTab('login'); setLoginError(''); setRegError(''); }}
                activeOpacity={0.7}
              >
                <Text style={[staticStyles.tabText, { color: activeTab === 'login' ? '#0A0A14' : colors.textMuted }]}>
                  Войти
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[staticStyles.tab, activeTab === 'register' && { backgroundColor: colors.primary }]}
                onPress={() => { setActiveTab('register'); setLoginError(''); setRegError(''); }}
                activeOpacity={0.7}
              >
                <Text style={[staticStyles.tabText, { color: activeTab === 'register' ? '#0A0A14' : colors.textMuted }]}>
                  Регистрация
                </Text>
              </TouchableOpacity>
            </View>

            {/* Login form */}
            {activeTab === 'login' && (
              <View style={staticStyles.form}>
                <Text style={[staticStyles.inputLabel, { color: colors.textMuted }]}>Email</Text>
                <TextInput
                  style={[staticStyles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                  autoCorrect={false}
                  editable={!isLoading}
                />

                <Text style={[staticStyles.inputLabel, staticStyles.mt14, { color: colors.textMuted }]}>Пароль</Text>
                <TextInput
                  style={[staticStyles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  editable={!isLoading}
                />

                {loginError ? <Text style={[staticStyles.errorText, { color: colors.error }]}>{loginError}</Text> : null}

                <TouchableOpacity
                  style={[staticStyles.primaryBtn, { backgroundColor: colors.primary }, loginLoading && staticStyles.primaryBtnDisabled]}
                  onPress={handleLogin}
                  disabled={loginLoading}
                  activeOpacity={0.85}
                >
                  {loginLoading ? (
                    <ActivityIndicator color="#0A0A14" size="small" />
                  ) : (
                    <Text style={staticStyles.primaryBtnText}>Войти</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleForgotPassword}
                  activeOpacity={0.7}
                  style={staticStyles.forgotWrap}
                >
                  <Text style={[staticStyles.forgotText, { color: colors.primary }]}>Забыли пароль?</Text>
                </TouchableOpacity>

                <SocialAuthButtons mode="login" />
              </View>
            )}

            {/* Register form */}
            {activeTab === 'register' && (
              <View style={staticStyles.form}>
                <Text style={[staticStyles.inputLabel, { color: colors.textMuted }]}>Имя</Text>
                <TextInput
                  style={[staticStyles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  value={regName}
                  onChangeText={setRegName}
                  placeholder="Иван Петров"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                  returnKeyType="next"
                  editable={!isLoading}
                />

                <Text style={[staticStyles.inputLabel, staticStyles.mt14, { color: colors.textMuted }]}>Email</Text>
                <TextInput
                  style={[staticStyles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  value={regEmail}
                  onChangeText={setRegEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                  autoCorrect={false}
                  editable={!isLoading}
                />

                <Text style={[staticStyles.inputLabel, staticStyles.mt14, { color: colors.textMuted }]}>Пароль</Text>
                <TextInput
                  style={[staticStyles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  value={regPassword}
                  onChangeText={setRegPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                  editable={!isLoading}
                />

                {regError ? <Text style={[staticStyles.errorText, { color: colors.error }]}>{regError}</Text> : null}

                <TouchableOpacity
                  style={[staticStyles.primaryBtn, { backgroundColor: colors.primary }, regLoading && staticStyles.primaryBtnDisabled]}
                  onPress={handleRegister}
                  disabled={regLoading}
                  activeOpacity={0.85}
                >
                  {regLoading ? (
                    <ActivityIndicator color="#0A0A14" size="small" />
                  ) : (
                    <Text style={staticStyles.primaryBtnText}>Создать аккаунт</Text>
                  )}
                </TouchableOpacity>

                <SocialAuthButtons mode="register" />
              </View>
            )}

            {/* Continue without account */}
            <TouchableOpacity
              style={[staticStyles.guestBtn, { borderColor: colors.border }]}
              onPress={handleClose}
              activeOpacity={0.75}
            >
              <Text style={[staticStyles.guestBtnText, { color: colors.textMuted }]}>Продолжить без аккаунта</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const staticStyles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontFamily: 'Sora',
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  closeBtn: {
    padding: 4,
  },

  // Reason banner
  reasonBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.card,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  reasonBannerText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    flex: 1,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    borderRadius: Radius.button,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },

  // Scroll content
  scrollContent: {
    paddingBottom: Spacing.xl,
  },

  // Form
  form: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  mt14: { marginTop: 14 },
  input: {
    borderWidth: 1,
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.md,
  },

  // Error
  errorText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    marginTop: Spacing.sm,
  },

  // Primary button
  primaryBtn: {
    paddingVertical: Spacing.md,
    borderRadius: Radius.button,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#0A0A14',
    fontFamily: 'Inter',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },

  // Forgot password
  forgotWrap: {
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  forgotText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },

  // Guest button
  guestBtn: {
    paddingVertical: 14,
    borderRadius: Radius.button,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  guestBtnText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
});
