import React, { useEffect, useRef, useState } from 'react';
import { Stack, router } from 'expo-router';
import { Linking, View, Text, StyleSheet, Animated } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastContainer } from '../components/ui/Toast';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EventSubscription } from 'expo-modules-core';
import { useAuthStore } from '../stores/authStore';
import { Colors } from '../constants/colors';
import { setupNotificationHandlers } from '../services/notifications.service';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { NotificationsProvider } from '../context/NotificationsContext';
import { initSentry } from '../lib/sentry';
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
        <Text style={splashStyles.plane}>✈</Text>
        <Text style={splashStyles.brand}>TravelAI</Text>
        <Text style={splashStyles.tagline}>AI-ассистент путешественника</Text>
      </Animated.View>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0A14',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  content: {
    alignItems: 'center',
  },
  plane: {
    fontSize: 80,
    color: '#F59E0B',
    marginBottom: 20,
  },
  brand: {
    fontFamily: 'Sora_Bold',
    fontSize: 36,
    fontWeight: '700',
    color: '#F4F4F8',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  tagline: {
    fontFamily: 'Sora',
    fontSize: 15,
    fontWeight: '400',
    color: '#8B8BA7',
    letterSpacing: 0.2,
  },
});

// ─── Root layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  const { isAuthenticated, isLoading, loadStoredAuth } = useAuthStore();
  const responseListenerRef = useRef<EventSubscription | null>(null);

  // Controls whether to show the custom brand splash
  const [showBrandSplash, setShowBrandSplash] = useState(true);

  const [fontsLoaded] = useFonts({
    'Sora':           Sora_400Regular,
    'Sora_Medium':    Sora_500Medium,
    'Sora_SemiBold':  Sora_600SemiBold,
    'Sora_Bold':      Sora_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  // Set up notification handlers and the tap-response listener once on mount
  useEffect(() => {
    const cleanupHandlers = setupNotificationHandlers();

    responseListenerRef.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as
          | Record<string, unknown>
          | undefined;

        if (data?.screen === 'bookings') {
          router.push('/(tabs)/bookings');
        }
      });

    return () => {
      cleanupHandlers();
      responseListenerRef.current?.remove();
    };
  }, []);

  useEffect(() => {
    loadStoredAuth();
  }, [loadStoredAuth]);

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
  useEffect(() => {
    if (isLoading || showBrandSplash) return;

    async function navigate() {
      // Restore saved language before navigating so the first screen is localised
      try {
        const savedLang = await AsyncStorage.getItem('app_language');
        if (savedLang && (savedLang === 'ru' || savedLang === 'en')) {
          await i18n.changeLanguage(savedLang);
        }
      } catch {
        // Non-fatal — keep default language
      }

      try {
        const onboardingDone = await AsyncStorage.getItem(ONBOARDING_KEY);
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

      if (isAuthenticated) {
        setTimeout(() => router.replace('/(tabs)'), 0);
      } else {
        setTimeout(() => router.replace('/(auth)/login'), 0);
      }

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
    <SafeAreaProvider>
      <ThemeProvider>
        <NotificationsProvider>
          <StatusBar style="light" />
          <View style={{ flex: 1 }}>
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: Colors.background },
                headerTintColor: Colors.text,
                headerTitleStyle: { fontWeight: '600' },
                contentStyle: { backgroundColor: Colors.background },
                headerShadowVisible: false,
              }}
            >
              <Stack.Screen name="onboarding" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="chat/[sessionId]"
                options={{ title: 'Чат', headerBackTitle: 'Назад' }}
              />
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
                options={{ title: 'Настройки', headerBackTitle: 'Назад' }}
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
              <Stack.Screen name="+not-found" options={{ title: 'Не найдено' }} />
            </Stack>
            <ToastContainer />

            {/* Brand splash overlays everything until animation completes */}
            {fontsLoaded && showBrandSplash && (
              <BrandSplash onFinish={() => setShowBrandSplash(false)} />
            )}
          </View>
        </NotificationsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
