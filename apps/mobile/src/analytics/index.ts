import { PostHog } from 'posthog-react-native';
import type { PostHogEventProperties } from '@posthog/core';

let _posthog: PostHog | null = null;

function getPosthog(): PostHog | null {
  if (_posthog) return _posthog;
  try {
    _posthog = new PostHog(
      process.env.EXPO_PUBLIC_POSTHOG_KEY ?? 'phc_placeholder',
      {
        host: 'https://eu.posthog.com',
        disabled: !process.env.EXPO_PUBLIC_POSTHOG_KEY,
      }
    );
    return _posthog;
  } catch (e) {
    console.warn('[Analytics] PostHog init failed:', e);
    return null;
  }
}

export const analytics = {
  identify(userId: string, props?: PostHogEventProperties) {
    try { getPosthog()?.identify(userId, props); } catch {}
  },
  track(event: string, props?: PostHogEventProperties) {
    try { getPosthog()?.capture(event, props); } catch {}
  },
  screen(name: string, props?: PostHogEventProperties) {
    try { getPosthog()?.screen(name, props); } catch {}
  },
  reset() {
    try { getPosthog()?.reset(); } catch {}
  },
};

// Ключевые события
export const Events = {
  REGISTERED: 'user_registered',
  LOGGED_IN: 'user_logged_in',
  CHAT_OPENED: 'chat_opened',
  MESSAGE_SENT: 'message_sent',
  FLIGHTS_SEARCHED: 'flights_searched',
  BOOKING_STARTED: 'booking_started',
  BOOKING_COMPLETED: 'booking_completed',
  WALLET_TOPPED_UP: 'wallet_topped_up',
  SUBSCRIPTION_VIEWED: 'subscription_viewed',
};
