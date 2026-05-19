// Константы аналитических событий SVIT TravelAI
// Используются во всех компонентах через analytics.service.ts

export const AnalyticsEvents = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  AUTH: {
    LOGIN: 'auth_login',
    REGISTER: 'auth_register',
    LOGOUT: 'auth_logout',
  },

  // ── Chat ──────────────────────────────────────────────────────────────────
  CHAT: {
    MESSAGE_SENT: 'chat_message_sent',
    FLIGHT_SELECTED: 'chat_flight_selected',
    HOTEL_SELECTED: 'chat_hotel_selected',
  },

  // ── Booking ───────────────────────────────────────────────────────────────
  BOOKING: {
    STARTED: 'booking_started',
    COMPLETED: 'booking_completed',
    CANCELLED: 'booking_cancelled',
  },

  // ── Payment ───────────────────────────────────────────────────────────────
  PAYMENT: {
    METHOD_SELECTED: 'payment_method_selected',
    COMPLETED: 'payment_completed',
    FAILED: 'payment_failed',
  },

  // ── Onboarding ────────────────────────────────────────────────────────────
  ONBOARDING: {
    STARTED: 'onboarding_started',
    COMPLETED: 'onboarding_completed',
    SKIPPED: 'onboarding_skipped',
  },

  // ── Navigation ────────────────────────────────────────────────────────────
  NAVIGATION: {
    SCREEN_VIEW: 'screen_view',
  },
} as const;

// Тип для строгой типизации имён событий (union всех leaf-значений)
type DeepValues<T> = T extends object
  ? { [K in keyof T]: DeepValues<T[K]> }[keyof T]
  : T;

export type AnalyticsEventName = DeepValues<typeof AnalyticsEvents>;
