import React, { useEffect, useRef } from 'react';
import { Stack, router } from 'expo-router';
import { Linking, View } from 'react-native';
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
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';

// Initialise Sentry as early as possible
initSentry();

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isAuthenticated, isLoading, loadStoredAuth } = useAuthStore();
  const responseListenerRef = useRef<EventSubscription | null>(null);

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
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

  useEffect(() => {
    if (!isLoading && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isLoading, fontsLoaded]);

  // Redirect logic: check onboarding flag before going to auth/tabs
  useEffect(() => {
    if (isLoading) return;

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
  }, [isAuthenticated, isLoading]);

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
              <Stack.Screen name="+not-found" options={{ title: 'Не найдено' }} />
            </Stack>
            <ToastContainer />
          </View>
        </NotificationsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
