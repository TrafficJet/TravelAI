import React, { useEffect, useRef, useState } from 'react';
import { Stack, router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Linking, View, Text, StyleSheet, Animated, LogBox } from 'react-native';

// NativeWind v4 + React 19 known compatibility warnings — safe to suppress in dev
LogBox.ignoreLogs([
  'useInsertionEffect must not schedule updates',
  'expo-linking needs access to the expo-constants manifest',
]);
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastContainer } from '../components/ui/Toast';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { safeStorage } from '../utils/safeStorage';
import type { EventSubscription } from 'expo-modules-core';
import { useAuthStore } from '../stores/authStore';
import { useWalletStore } from '../stores/walletStore';
import { useFavoritesStore } from '../stores/favoritesStore';
import { setupNotificationHandlers } from '../services/push-notifications.service';
import { registerForPushNotifications } from '../services/notifications.service';
import { darkColors } from '../src/theme/colors';
import api from '../services/api';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import { NotificationsProvider } from '../context/NotificationsContext';
import { initSentry } from '../lib/sentry';
import { toast } from '../lib/toast';
import { SvitLogo } from '../components/SvitLogo';
import { handleDeepLink } from '../lib/deeplinks';
import { ONBOARDING_KEY } from './onboarding';
import i18n from '../src/i18n';
import '../global.css';
import {
  useFonts,
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
} from '@expo-google-fonts/sora';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';

// Initialise Sentry as early as possible
initSentry();

SplashScreen.preventAutoHideAsync();

// ─── Animated brand splash ────────────────────────────────────────────────────

function BrandSplash({ onFinish }: { onFinish: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // fade in 600ms → hold 800ms → fade out 400ms
    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.delay(800),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => onFinish());
  }, [opacity, onFinish]);

  return (
    <View style={splashStyles.root}>
      <StatusBar style="light" />
      <Animated.View style={[splashStyles.content, { opacity }]}>
        <SvitLogo size={88} />
        <Text style={splashStyles.brand}>SVIT</Text>
        <Text style={splashStyles.tagline}>AI-ассистент путешественника</Text>
      </Animated.View>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: darkColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  content: {
    alignItems: 'center',
  },
  brand: {
    fontFamily: 'Sora_Bold',
    fontSize: 36,
    fontWeight: '700',
    color: darkColors.text,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  tagline: {
    fontFamily: 'Sora',
    fontSize: 15,
    fontWeight: '400',
    color: darkColors.textMuted,
    letterSpacing: 0.2,
  },
});

// ─── Themed stack (needs to be inside ThemeProvider) ─────────────────────────

interface ThemedStackProps {
  fontsLoaded: boolean;
  showBrandSplash: boolean;
  onBrandSplashFinish: () => void;
}

function ThemedStack({ fontsLoaded, showBrandSplash, onBrandSplashFinish }: ThemedStackProps) {
  const { colors, isDark } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '600', color: colors.text },
          contentStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="bookings/[bookingId]"
          options={{ title: 'Детали брони', headerBackTitle: 'Назад' }}
        />
        <Stack.Screen
          name="subscription/plans"
          options={{ title: 'Подписка', headerBackTitle: 'Назад' }}
        />
        <Stack.Screen
          name="wallet/topup"
          options={{ title: 'Пополнение', headerBackTitle: 'Назад' }}
        />
        <Stack.Screen
          name="flight-detail"
          options={{ title: 'Детали рейса', headerShown: false }}
        />
        <Stack.Screen
          name="hotel-detail"
          options={{ title: 'Детали отеля', headerShown: false }}
        />
        <Stack.Screen
          name="booking-success"
          options={{ title: 'Бронирование', headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="settings"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="notifications"
          options={{ title: 'Уведомления', headerBackTitle: 'Назад' }}
        />
        <Stack.Screen
          name="price-alerts"
          options={{ title: 'Ценовые оповещения', headerBackTitle: 'Назад' }}
        />
        <Stack.Screen
          name="hotels-map"
          options={{ title: 'Отели на карте', headerShown: false }}
        />
        <Stack.Screen
          name="privacy-policy"
          options={{ title: 'Политика конфиденциальности', headerBackTitle: 'Назад' }}
        />
        <Stack.Screen
          name="terms-of-service"
          options={{ title: 'Условия использования', headerBackTitle: 'Назад' }}
        />
<Stack.Screen name="+not-found" options={{ title: 'Не найдено' }} />
      </Stack>
      <ToastContainer />

      {/* Brand splash overlays everything until animation completes */}
      {fontsLoaded && showBrandSplash && (
        <BrandSplash onFinish={onBrandSplashFinish} />
      )}
    </View>
  );
}

// ─── Root layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  const { isAuthenticated, isLoading, loadStoredAuth } = useAuthStore();
  const loadWallet = useWalletStore((state) => state.load);
  const loadFavorites = useFavoritesStore((state) => state.loadFavorites);
  const responseListenerRef = useRef<EventSubscription | null>(null);
  const prevAuthenticatedRef = useRef<boolean>(false);
  const hasNavigatedRef = useRef<boolean>(false);

  // Controls whether to show the custom brand splash
  const [showBrandSplash, setShowBrandSplash] = useState(true);

  const [fontsLoaded] = useFonts({
    'Sora':           Sora_400Regular,
    'Sora_Medium':    Sora_500Medium,
    'Sora_SemiBold':  Sora_600SemiBold,
    'Sora_Bold':      Sora_700Bold,
    'Inter':          Inter_400Regular,
    'Inter_Medium':   Inter_500Medium,
    'Inter_SemiBold': Inter_600SemiBold,
  });

  // Set up notification handlers and the tap-response listener once on mount
  useEffect(() => {
    const cleanupHandlers = setupNotificationHandlers();

    // Show a toast when a push notification arrives while the app is in foreground
    const foregroundToastSub = Notifications.addNotificationReceivedListener(
      (notification) => {
        const title = notification.request.content.title ?? '';
        const body  = notification.request.content.body  ?? '';
        const message = [title, body].filter(Boolean).join(' — ');
        if (message) {
          toast.info(message);
        }
      },
    );

    responseListenerRef.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as
          | Record<string, unknown>
          | undefined;

        if (data?.type === 'booking_update' && typeof data.id === 'string') {
          router.push(`/bookings/${data.id}` as Parameters<typeof router.push>[0]);
        } else if (
          data?.type === 'chat_message' &&
          typeof data.sessionId === 'string'
        ) {
          router.push(`/(tabs)/chat/${data.sessionId}` as Parameters<typeof router.push>[0]);
        } else {
          router.push('/(tabs)');
        }
      });

    return () => {
      cleanupHandlers();
      foregroundToastSub.remove();
      responseListenerRef.current?.remove();
    };
  }, []);

  useEffect(() => {
    loadStoredAuth();
  }, [loadStoredAuth]);

  useEffect(() => {
    const wasAuthenticated = prevAuthenticatedRef.current;
    prevAuthenticatedRef.current = isAuthenticated;

    if (isAuthenticated) {
      loadWallet().catch(() => {});
      loadFavorites().catch(() => {});

      // Register push token and send it to the backend.
      // Graceful: on simulator / permission denied / web → returns null, nothing sent.
      registerForPushNotifications()
        .then((token) => {
          if (token) {
            api.post('/users/me/push-token', { token }).catch(() => {});
          }
        })
        .catch(() => {});
    } else if (wasAuthenticated) {
      // User just logged out — clear push token from the backend.
      api.post('/users/me/push-token', { token: null }).catch(() => {});
    }
  }, [isAuthenticated, loadWallet, loadFavorites]);

  // Hide the native splash once fonts + auth are ready, then show brand splash
  useEffect(() => {
    if (!isLoading && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isLoading, fontsLoaded]);

  // Safety timeout: if fonts fail to load within 5 s, unblock navigation anyway.
  // Without this, showBrandSplash never becomes false (BrandSplash never mounts)
  // and the navigate() effect waits forever, leaving the app on a blank screen.
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowBrandSplash(false);
      SplashScreen.hideAsync().catch(() => {});
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Redirect logic — runs after brand splash disappears (showBrandSplash = false)
  // and after auth + fonts are ready.
  // hasNavigatedRef ensures this fires only once so it cannot race with the
  // router.navigate() calls inside index.tsx's initAuthenticated / initGuest.
  useEffect(() => {
    if (isLoading || showBrandSplash || hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;

    async function navigate() {
      // Restore saved language before navigating so the first screen is localised
      try {
        const savedLang = await safeStorage.getItem('app_language');
        if (savedLang && (savedLang === 'ru' || savedLang === 'en')) {
          await i18n.changeLanguage(savedLang);
        }
      } catch {
        // Non-fatal — keep default language
      }

      try {
        const onboardingDone = await safeStorage.getItem(ONBOARDING_KEY);
        if (!onboardingDone) {
          setTimeout(() => router.replace('/onboarding'), 0);
          // Handle cold-start deep link after navigation
          const initialUrl = await Linking.getInitialURL();
          if (initialUrl) {
            setTimeout(() => handleDeepLink(initialUrl), 100);
          }
          return;
        }
      } catch {
        // AsyncStorage failure — skip onboarding check, go to normal flow
      }

      setTimeout(() => router.replace(isAuthenticated ? '/(tabs)' : '/(auth)/login'), 0);

      // Handle cold-start deep link after navigation
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        setTimeout(() => handleDeepLink(initialUrl), 100);
      }
    }

    void navigate();
  }, [isAuthenticated, isLoading, showBrandSplash]);

  // Deep link listeners
  useEffect(() => {
    // Cold-start deep links are handled inside navigate() after routing completes.
    // Here we only listen for deep links while the app is already running.
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => subscription.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <NotificationsProvider>
            <ThemedStack
              fontsLoaded={fontsLoaded}
              showBrandSplash={showBrandSplash}
              onBrandSplashFinish={() => setShowBrandSplash(false)}
            />
          </NotificationsProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
