/**
 * usePushNotifications — SVIT TravelAI
 *
 * Registers the device for push notifications on mount, syncs the Expo push
 * token to the backend, and exposes the current notification and any error.
 */

import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import type { EventSubscription } from 'expo-modules-core';
import {
  registerForPushNotifications,
  sendTokenToServer,
} from '../services/push-notifications.service';
import { useAuthStore } from '../stores/authStore';

interface UsePushNotificationsResult {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  error: Error | null;
}

export function usePushNotifications(): UsePushNotificationsResult {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] =
    useState<Notifications.Notification | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const notificationListenerRef = useRef<EventSubscription | null>(null);
  const { user, accessToken } = useAuthStore();

  useEffect(() => {
    // Register and optionally sync token to server — all in background, never
    // blocks the render.
    (async () => {
      try {
        const token = await registerForPushNotifications();
        setExpoPushToken(token);

        if (token && user?.id && accessToken) {
          // sendTokenToServer uses Bearer auth with the access token, not userId
          await sendTokenToServer(token, accessToken);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error('[usePushNotifications] Unknown registration error'),
        );
      }
    })();

    // Listen for notifications received while the app is foregrounded
    notificationListenerRef.current =
      Notifications.addNotificationReceivedListener((incoming) => {
        setNotification(incoming);
      });

    return () => {
      notificationListenerRef.current?.remove();
    };
  // Re-register if the user logs in / changes (new token may be needed)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return { expoPushToken, notification, error };
}
