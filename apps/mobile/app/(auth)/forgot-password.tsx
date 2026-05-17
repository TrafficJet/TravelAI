import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../constants/colors';
import { Typography, TextPresets } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { Radius } from '../../constants/radius';
import api from '../../services/api';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [submitted, setSubmitted] = useState(false);

  function validate(): boolean {
    if (!email.trim()) {
      setEmailError('Введите email');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Некорректный email');
      return false;
    }
    setEmailError(undefined);
    return true;
  }

  async function handleSubmit() {
    if (!validate()) return;

    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSubmitted(true);
    } catch {
      // API always returns 200, but handle network errors gracefully
      setSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  }

  if (submitted) {
    return (
      <View style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Text style={styles.logo}>📬</Text>
            <Text style={styles.title}>Проверьте почту</Text>
            <Text style={styles.subtitle}>
              Мы отправили ссылку для сброса пароля на адрес{'\n'}
              <Text style={styles.emailHighlight}>{email.trim().toLowerCase()}</Text>
            </Text>
            <Text style={[styles.subtitle, styles.subtitleHint]}>
              Если письмо не пришло — проверьте папку «Спам».
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            style={styles.backLink}
          >
            <Text style={styles.backText}>
              {'← '}
              <Text style={styles.backTextAccent}>Вернуться к входу</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
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
          <Text style={styles.logo}>🔑</Text>
          <Text style={styles.title}>Забыли пароль?</Text>
          <Text style={styles.subtitle}>
            Введите email, и мы пришлём ссылку для сброса пароля
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              if (emailError) setEmailError(undefined);
            }}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={emailError}
          />

          <Button
            title="Отправить ссылку"
            onPress={handleSubmit}
            loading={isLoading}
            fullWidth
            style={styles.submitBtn}
          />

          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backLink}
          >
            <Text style={styles.backText}>
              {'← '}
              <Text style={styles.backTextAccent}>Вернуться</Text>
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
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...TextPresets.body,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  subtitleHint: {
    marginTop: Spacing.sm,
    ...TextPresets.caption,
    color: Colors.textMuted,
  },
  emailHighlight: {
    color: Colors.text,
    fontWeight: Typography.weights.semibold,
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
    color: Colors.textMuted,
  },
  backTextAccent: {
    color: Colors.primary,
    fontWeight: Typography.weights.semibold,
  },
});
