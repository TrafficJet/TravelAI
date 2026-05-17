// Web stub for expo-notifications
// Used by metro.config.js to replace expo-notifications on web platform

export const AndroidImportance = { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1 };
export const SchedulableTriggerInputTypes = { TIME_INTERVAL: 'timeInterval', DATE: 'date', CALENDAR: 'calendar' };

export async function getPermissionsAsync() { return { status: 'denied' }; }
export async function requestPermissionsAsync() { return { status: 'denied' }; }
export async function getExpoPushTokenAsync(_opts: unknown) { return { data: '' }; }
export async function scheduleNotificationAsync(_req: unknown) { return ''; }
export async function setNotificationChannelAsync(_id: unknown, _channel: unknown) { return null; }
export function setNotificationHandler(_handler: unknown) {}
export function addNotificationReceivedListener(_cb: unknown) { return { remove: () => {} }; }
export function addNotificationResponseReceivedListener(_cb: unknown) { return { remove: () => {} }; }
export function removeNotificationSubscription(_sub: unknown) {}
export async function dismissAllNotificationsAsync() {}
export async function getBadgeCountAsync() { return 0; }
export async function setBadgeCountAsync(_count: unknown) {}
