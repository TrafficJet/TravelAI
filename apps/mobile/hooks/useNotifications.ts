import { useState, useEffect, useCallback } from 'react';
import {
  registerForPushNotifications,
  schedulePushNotification,
} from '../services/notifications.service';

interface UseNotificationsResult {
  pushToken: string | null;
  sendLocalNotification: (
    title: string,
    body: string,
    data?: Record<string, unknown>,
    delay?: number,
  ) => Promise<void>;
}

export function useNotifications(): UseNotificationsResult {
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    registerForPushNotifications()
      .then((token) => setPushToken(token))
      .catch(() => {
        // Graceful degradation — token unavailable on simulator or without permission
      });
  }, []);

  const sendLocalNotification = useCallback(
    async (
      title: string,
      body: string,
      data: Record<string, unknown> = {},
      delay = 1,
    ): Promise<void> => {
      await schedulePushNotification(title, body, data, delay);
    },
    [],
  );

  return { pushToken, sendLocalNotification };
}
