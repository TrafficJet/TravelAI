import pino from 'pino';

const log = pino({ name: 'push.service' });

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface SendExpoPushParams {
  pushToken: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// Send a push notification via the Expo Push API.
// Silently skips tokens that do not match the ExponentPushToken format.
// Never throws — failures are logged and swallowed so callers are unaffected.
export async function sendExpoPush(params: SendExpoPushParams): Promise<void> {
  if (!params.pushToken.startsWith('ExponentPushToken[')) {
    log.warn({ pushToken: params.pushToken }, 'invalid token format, skipping');
    return;
  }

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        to: params.pushToken,
        title: params.title,
        body: params.body,
        data: params.data ?? {},
        sound: 'default',
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      log.warn({ status: res.status, body: text }, 'Expo API returned non-2xx');
    }
  } catch (err) {
    log.error({ err }, 'failed to send push notification');
  }
}
