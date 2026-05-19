/**
 * Push Notifications Service — SVIT TravelAI
 *
 * Handles Expo push token registration (FCM for Android, APNs for iOS),
 * foreground/background notification handlers, and local travel reminders.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { EventSubscription } from 'expo-modules-core';
import { NOTIFICATION_CHANNELS } from '../constants/notification-types';
import { API_BASE_URL } from '../constants/config';

// ── Android channel setup ─────────────────────────────────────────────────────

async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.BOOKINGS, {
    name: 'Бронирования',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#6C63FF',
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.CHAT, {
    name: 'Чат',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 150],
    lightColor: '#6C63FF',
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.PROMO, {
    name: 'Акции и предложения',
    importance: Notifications.AndroidImportance.LOW,
    vibrationPattern: undefined,
    sound: undefined,
  });
}

// ── Token registration ────────────────────────────────────────────────────────

/**
 * Requests push notification permissions from the OS and returns the
 * Expo push token. Returns null gracefully on simulators, when the user
 * denies permission, or when the projectId is missing.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn(
      '[PushNotifications] Running on simulator — push token unavailable.',
    );
    return null;
  }

  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn(
        '[PushNotifications] Permission denied — push token unavailable.',
      );
      return null;
    }

    await ensureAndroidChannels();

    const projectId: string | undefined =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants.easConfig as { projectId?: string } | undefined)?.projectId;

    if (!projectId) {
      console.warn(
        '[PushNotifications] EAS projectId not found in app config.',
      );
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch (err) {
    console.warn('[PushNotifications] registerForPushNotifications error:', err);
    return null;
  }
}

// ── Backend token sync ────────────────────────────────────────────────────────

/**
 * Sends the Expo push token to the backend so the server can target this device.
 * Requires a valid Bearer token for the authenticated user.
 */
export async function sendTokenToServer(
  token: string,
  userId: string,
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/users/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userId}`,
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      console.warn(
        `[PushNotifications] sendTokenToServer failed: ${response.status}`,
      );
    }
  } catch (err) {
    console.warn('[PushNotifications] sendTokenToServer error:', err);
  }
}

// ── Notification handlers ─────────────────────────────────────────────────────

/**
 * Sets the foreground notification handler and registers listeners for
 * notifications received while the app is in the foreground and in the background.
 * Returns a cleanup function — call it in useEffect's return.
 */
export function setupNotificationHandlers(): () => void {
  // Show banners even when the app is foregrounded
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  // Foreground listener — no-op; the handler above already shows the banner
  const foregroundSub: EventSubscription =
    Notifications.addNotificationReceivedListener((_notification) => {
      // Additional foreground handling can be added here
    });

  return () => {
    foregroundSub.remove();
    Notifications.setNotificationHandler(null);
  };
}

// ── Local travel reminder ─────────────────────────────────────────────────────

/**
 * Schedules a local notification 24 hours before the departure date.
 * Silently skips scheduling if the departure is already in the past
 * or within the next 5 minutes.
 */
export async function scheduleTravelReminder(
  tripId: string,
  departureDate: Date,
): Promise<void> {
  try {
    const reminderTime = new Date(
      departureDate.getTime() - 24 * 60 * 60 * 1000,
    );

    const secondsUntilReminder = Math.floor(
      (reminderTime.getTime() - Date.now()) / 1000,
    );

    // Don't schedule if the reminder time is fewer than 5 minutes away
    if (secondsUntilReminder < 300) {
      console.warn(
        `[PushNotifications] scheduleTravelReminder skipped for tripId=${tripId}: reminder time already passed.`,
      );
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Напоминание о поездке',
        body: `До вылета осталось 24 часа. Проверьте все документы!`,
        data: { type: 'travel_reminder', tripId },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntilReminder,
      },
    });
  } catch (err) {
    console.warn('[PushNotifications] scheduleTravelReminder error:', err);
  }
}
