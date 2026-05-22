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
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { router } from 'expo-router';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../src/theme/ThemeContext';
import { Typography, TextPresets } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import api from '../../services/api';

// ── Icon components (SVG, no emoji) ─────────────────────────────────────────

function IconKey() {
  return (
    <View style={iconBubbleStyles.wrap}>
      <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
        <Circle cx="8" cy="9" r="5" stroke="#E8A020" strokeWidth="1.5" />
        <Path
          d="M13 9h8M17 9v3M21 9v2"
          stroke="#E8A020"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

function IconMailSent() {
  return (
    <View style={iconBubbleStyles.wrap}>
      <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
        <Rect x="2" y="5" width="20" height="14" rx="2" stroke="#E8A020" strokeWidth="1.5" />
        <Path
          d="M2 9l10 6 10-6"
          stroke="#E8A020"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const iconBubbleStyles = StyleSheet.create({
  wrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(232,160,32,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
});

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);

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
            <IconMailSent />
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
          <IconKey />
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
    subtitleHint: {
      marginTop: Spacing.sm,
      ...TextPresets.caption,
      color: colors.textMuted,
    },
    emailHighlight: {
      color: colors.text,
      fontFamily: 'Inter',
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
      color: colors.textMuted,
    },
    backTextAccent: {
      color: colors.primary,
      fontFamily: 'Inter',
      fontWeight: Typography.weights.semibold,
    },
  });
}
