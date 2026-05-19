import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuthStore } from '../../stores/authStore';
import { toast } from '../../lib/toast';
import { useTheme } from '../../src/theme/useTheme';
import { Typography } from '../../constants/typography';

WebBrowser.maybeCompleteAuthSession();

type Mode = 'login' | 'register';

interface SocialAuthButtonsProps {
  mode: Mode;
}

export function SocialAuthButtons({ mode }: SocialAuthButtonsProps) {
  const { colors } = useTheme();
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const loginWithApple = useAuthStore((state) => state.loginWithApple);

  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? 'YOUR_GOOGLE_CLIENT_ID',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  // Check Apple availability once on mount (native iOS only)
  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync()
        .then(setAppleAvailable)
        .catch(() => setAppleAvailable(false));
    }
  }, []);

  // Handle Google OAuth response when it arrives
  useEffect(() => {
    if (response?.type !== 'success') {
      if (response?.type === 'error') {
        toast.error('Ошибка входа через Google. Попробуйте снова.');
      }
      setGoogleLoading(false);
      return;
    }

    const idToken = response.params['id_token'] ?? response.authentication?.idToken ?? null;

    if (!idToken) {
      toast.error('Не удалось получить токен от Google.');
      setGoogleLoading(false);
      return;
    }

    loginWithGoogle(idToken)
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : '';
        if (message.toLowerCase().includes('already') || message.toLowerCase().includes('exists')) {
          toast.error('Этот email уже используется. Попробуйте войти.');
        } else if (!message) {
          toast.error('Нет соединения с сервером. Проверьте интернет.');
        } else {
          toast.error(message || 'Ошибка входа через Google.');
        }
      })
      .finally(() => setGoogleLoading(false));
  }, [response]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGooglePress() {
    if (!request) return;
    setGoogleLoading(true);
    try {
      await promptAsync();
      // Loading state is cleared in the response useEffect
    } catch {
      setGoogleLoading(false);
    }
  }

  async function handleApplePress() {
    setAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        ],
      });

      if (!credential.identityToken) {
        toast.error('Не удалось получить токен от Apple.');
        return;
      }

      const givenName = credential.fullName?.givenName ?? undefined;
      const familyName = credential.fullName?.familyName ?? undefined;
      const fullName =
        givenName || familyName
          ? [givenName, familyName].filter(Boolean).join(' ')
          : undefined;

      await loginWithApple(credential.identityToken, {
        name: fullName,
        email: credential.email ?? undefined,
      });
    } catch (err: unknown) {
      // ERR_REQUEST_CANCELED — user cancelled, do not show error
      const code = (err as { code?: string }).code;
      if (code === 'ERR_REQUEST_CANCELED') return;

      const message = err instanceof Error ? err.message : '';
      if (message.toLowerCase().includes('already') || message.toLowerCase().includes('exists')) {
        toast.error('Этот email уже используется. Попробуйте войти.');
      } else if (!message) {
        toast.error('Нет соединения с сервером. Проверьте интернет.');
      } else {
        toast.error(message || 'Ошибка входа через Apple.');
      }
    } finally {
      setAppleLoading(false);
    }
  }

  const actionLabel = mode === 'login' ? 'Войти' : 'Продолжить';

  // On web: show both buttons but Apple is a stub
  // On Android: hide Apple button
  // On iOS: show both if Apple is available

  const showApple = Platform.OS === 'ios' ? appleAvailable : Platform.OS === 'web';

  return (
    <View style={styles.container}>
      {/* Divider */}
      <View style={styles.divider}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.textSecondary }]}>или</Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </View>

      {/* Google button */}
      <TouchableOpacity
        style={[styles.googleButton, { borderColor: colors.border, backgroundColor: colors.card }]}
        onPress={handleGooglePress}
        disabled={googleLoading || !request}
        activeOpacity={0.8}
      >
        {googleLoading ? (
          <ActivityIndicator color={colors.text} size="small" style={styles.icon} />
        ) : (
          <Text style={styles.googleIcon}>G</Text>
        )}
        <Text style={[styles.googleButtonText, { color: colors.text }]}>
          {actionLabel} через Google
        </Text>
      </TouchableOpacity>

      {/* Apple button */}
      {showApple && (
        Platform.OS === 'ios' ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              mode === 'login'
                ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                : AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
            }
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={12}
            style={styles.appleButton}
            onPress={handleApplePress}
          />
        ) : (
          // Web stub
          <TouchableOpacity
            style={[styles.appleButtonStub, { backgroundColor: colors.background, opacity: 0.6 }]}
            onPress={() => toast.info('Вход через Apple доступен только в iOS-приложении.')}
            activeOpacity={0.8}
          >
            <Text style={[styles.appleStubIcon, { color: '#0A0A14' }]}></Text>
            <Text style={[styles.appleStubText, { color: '#0A0A14' }]}>{actionLabel} через Apple</Text>
          </TouchableOpacity>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 12,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    minHeight: 50,
    gap: 10,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
    width: 24,
    textAlign: 'center',
  },
  icon: {
    width: 24,
  },
  googleButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  appleButton: {
    width: '100%',
    height: 50,
  },
  appleButtonStub: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    minHeight: 50,
    gap: 10,
  },
  appleStubIcon: {
    fontSize: 18,
  },
  appleStubText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
});
