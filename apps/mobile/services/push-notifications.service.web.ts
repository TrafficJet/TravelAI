// Web stub — expo-notifications / expo-device not supported on web
// Metro uses this file instead of push-notifications.service.ts on web platform

export async function registerForPushNotifications(): Promise<string | null> {
  return null;
}

export async function sendTokenToServer(
  _token: string,
  _accessToken: string,
): Promise<void> {
  // No-op on web
}

export function setupNotificationHandlers(): () => void {
  return () => {};
}

export async function scheduleTravelReminder(
  _tripId: string,
  _departureDate: Date,
): Promise<void> {
  // No-op on web
}
