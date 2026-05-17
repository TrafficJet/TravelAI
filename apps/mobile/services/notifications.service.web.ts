// Web stub — expo-notifications is not supported on web
// Metro will use this file instead of notifications.service.ts on web platform

export interface BookingNotificationData {
  airline: string;
  from: string;
  to: string;
  date: string;
  price: number;
}

export async function registerForPushNotifications(): Promise<string | null> {
  return null;
}

export async function schedulePushNotification(
  _title: string,
  _body: string,
  _data: Record<string, unknown> = {},
  _delay = 1,
): Promise<void> {
  // No-op on web
}

export async function sendBookingConfirmation(
  _booking: BookingNotificationData,
): Promise<void> {
  // No-op on web
}

export async function sendPaymentConfirmation(_amount: number): Promise<void> {
  // No-op on web
}

export function setupNotificationHandlers(): () => void {
  return () => {};
}
