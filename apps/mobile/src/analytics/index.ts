import { PostHog } from 'posthog-react-native';
import type { PostHogEventProperties } from '@posthog/core';

const posthog = new PostHog(
  process.env.EXPO_PUBLIC_POSTHOG_KEY ?? 'phc_placeholder',
  {
    host: 'https://eu.posthog.com',
    disabled: !process.env.EXPO_PUBLIC_POSTHOG_KEY,
  }
);

export const analytics = {
  identify(userId: string, props?: PostHogEventProperties) {
    posthog.identify(userId, props);
  },
  track(event: string, props?: PostHogEventProperties) {
    posthog.capture(event, props);
  },
  screen(name: string, props?: PostHogEventProperties) {
    posthog.screen(name, props);
  },
  reset() {
    posthog.reset();
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
