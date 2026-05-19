/**
 * Notification channel identifiers and type constants for SVIT push notifications.
 */

export const NOTIFICATION_CHANNELS = {
  BOOKINGS: 'bookings',    // высокий приоритет
  CHAT: 'chat',            // обычный
  PROMO: 'promotions',     // низкий
} as const;

export type NotificationChannel =
  (typeof NOTIFICATION_CHANNELS)[keyof typeof NOTIFICATION_CHANNELS];

// ── Notification data payload types ──────────────────────────────────────────

export const NOTIFICATION_TYPES = {
  BOOKING_UPDATE: 'booking_update',
  CHAT_MESSAGE: 'chat_message',
  PRICE_ALERT: 'price_alert',
  PROMO: 'promo',
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];
