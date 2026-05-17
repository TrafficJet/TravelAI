import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { EventSubscription } from 'expo-modules-core';

export interface BookingNotificationData {
  airline: string;
  from: string;
  to: string;
  date: string;
  price: number;
}

/**
 * Requests notification permissions and returns the Expo push token.
 * Returns null gracefully when running on simulator or permissions are denied.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    // Simulator / emulator — skip token registration silently
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C63FF',
    });
  }

  const projectId: string | undefined =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch {
    return null;
  }
}

/**
 * Schedules a local notification to fire after `delay` seconds (default: 1).
 */
export async function schedulePushNotification(
  title: string,
  body: string,
  data: Record<string, unknown> = {},
  delay = 1,
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger:
        delay > 0
          ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: delay }
          : null,
    });
  } catch {
    // Graceful degradation — never crash the calling flow
  }
}

/**
 * Sends a local notification confirming a flight / hotel booking.
 */
export async function sendBookingConfirmation(
  booking: BookingNotificationData,
): Promise<void> {
  const dateStr = booking.date
    ? new Date(booking.date).toLocaleDateString('ru-RU')
    : '';

  await schedulePushNotification(
    'Бронь подтверждена',
    `${booking.airline} · ${booking.from} → ${booking.to}${dateStr ? ` · ${dateStr}` : ''} · ${booking.price.toLocaleString('ru-RU')} ₽`,
    { screen: 'bookings', type: 'booking_confirmed' },
    1,
  );
}

/**
 * Sends a local notification confirming a wallet top-up.
 */
export async function sendPaymentConfirmation(amount: number): Promise<void> {
  await schedulePushNotification(
    'Кошелёк пополнен',
    `На ваш счёт зачислено ${amount.toLocaleString('ru-RU')} ₽`,
    { screen: 'wallet', type: 'payment_confirmed' },
    1,
  );
}

/**
 * Configures the foreground notification handler so that notifications
 * are shown as banners even when the app is in the foreground.
 * Returns a cleanup function that removes the handler.
 */
export function setupNotificationHandlers(): () => void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  const foregroundSub: EventSubscription =
    Notifications.addNotificationReceivedListener((_notification) => {
      // Foreground notification received — handler above already shows the banner
    });

  return () => {
    foregroundSub.remove();
    Notifications.setNotificationHandler(null);
  };
}
