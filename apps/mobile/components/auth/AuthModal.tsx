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
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { SocialAuthButtons } from '../../components/auth/SocialAuthButtons';
import { Colors } from '../../constants/colors';
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
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Войдите в аккаунт</Text>
            <TouchableOpacity
              onPress={handleClose}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Reason banner */}
          {reason === 'booking' && (
            <View style={styles.reasonBanner}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.reasonBannerText}>Для бронирования нужен аккаунт</Text>
            </View>
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Tabs */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'login' && styles.tabActive]}
                onPress={() => { setActiveTab('login'); setLoginError(''); setRegError(''); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, activeTab === 'login' && styles.tabTextActive]}>
                  Войти
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'register' && styles.tabActive]}
                onPress={() => { setActiveTab('register'); setLoginError(''); setRegError(''); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, activeTab === 'register' && styles.tabTextActive]}>
                  Регистрация
                </Text>
              </TouchableOpacity>
            </View>

            {/* Login form */}
            {activeTab === 'login' && (
              <View style={styles.form}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                  autoCorrect={false}
                  editable={!isLoading}
                />

                <Text style={[styles.inputLabel, styles.mt14]}>Пароль</Text>
                <TextInput
                  style={styles.input}
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  editable={!isLoading}
                />

                {loginError ? <Text style={styles.errorText}>{loginError}</Text> : null}

                <TouchableOpacity
                  style={[styles.primaryBtn, loginLoading && styles.primaryBtnDisabled]}
                  onPress={handleLogin}
                  disabled={loginLoading}
                  activeOpacity={0.85}
                >
                  {loginLoading ? (
                    <ActivityIndicator color={Colors.textInverse} size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Войти</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleForgotPassword}
                  activeOpacity={0.7}
                  style={styles.forgotWrap}
                >
                  <Text style={styles.forgotText}>Забыли пароль?</Text>
                </TouchableOpacity>

                <SocialAuthButtons mode="login" />
              </View>
            )}

            {/* Register form */}
            {activeTab === 'register' && (
              <View style={styles.form}>
                <Text style={styles.inputLabel}>Имя</Text>
                <TextInput
                  style={styles.input}
                  value={regName}
                  onChangeText={setRegName}
                  placeholder="Иван Петров"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="words"
                  returnKeyType="next"
                  editable={!isLoading}
                />

                <Text style={[styles.inputLabel, styles.mt14]}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={regEmail}
                  onChangeText={setRegEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                  autoCorrect={false}
                  editable={!isLoading}
                />

                <Text style={[styles.inputLabel, styles.mt14]}>Пароль</Text>
                <TextInput
                  style={styles.input}
                  value={regPassword}
                  onChangeText={setRegPassword}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                  editable={!isLoading}
                />

                {regError ? <Text style={styles.errorText}>{regError}</Text> : null}

                <TouchableOpacity
                  style={[styles.primaryBtn, regLoading && styles.primaryBtnDisabled]}
                  onPress={handleRegister}
                  disabled={regLoading}
                  activeOpacity={0.85}
                >
                  {regLoading ? (
                    <ActivityIndicator color={Colors.textInverse} size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Создать аккаунт</Text>
                  )}
                </TouchableOpacity>

                <SocialAuthButtons mode="register" />
              </View>
            )}

            {/* Continue without account */}
            <TouchableOpacity
              style={styles.guestBtn}
              onPress={handleClose}
              activeOpacity={0.75}
            >
              <Text style={styles.guestBtnText}>Продолжить без аккаунта</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    color: Colors.text,
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
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.card,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  reasonBannerText: {
    color: Colors.primary,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    flex: 1,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.textInverse,
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
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  mt14: { marginTop: 14 },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    color: Colors.text,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.md,
  },

  // Error
  errorText: {
    color: Colors.error,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    marginTop: Spacing.sm,
  },

  // Primary button
  primaryBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: Radius.button,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: Colors.textInverse,
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
    color: Colors.primary,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },

  // Guest button
  guestBtn: {
    paddingVertical: 14,
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  guestBtnText: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
});
