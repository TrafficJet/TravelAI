/**
 * Deep Link / Universal Link handler
 *
 * Supported URL schemes:
 *
 *   travelai://chat?message=<encoded-text>
 *     Opens a new chat session and pre-fills the input with <message>.
 *
 *   travelai://booking/<id>
 *     Opens the booking detail screen for the given booking id.
 *
 * Example usage inside _layout.tsx:
 *   Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
 *   Linking.getInitialURL().then((url) => { if (url) handleDeepLink(url); });
 */

import { router } from 'expo-router';

export function handleDeepLink(url: string): void {
  if (!url) return;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // Malformed URL — ignore silently
    return;
  }

  const scheme = parsed.protocol.replace(':', ''); // e.g. "travelai"
  const host = parsed.hostname; // e.g. "chat" or "booking"

  if (scheme !== 'travelai') return;

  if (host === 'chat') {
    // travelai://chat?message=...
    const message = parsed.searchParams.get('message');
    if (message) {
      // Create a new chat session with the pre-filled message
      router.push({
        pathname: '/(tabs)',
        // The home tab handles new session creation; pass along the message
        // via query param — the index screen reads `initialMessage`.
        params: { initialMessage: message },
      });
    } else {
      router.push('/(tabs)');
    }
    return;
  }

  if (host === 'booking') {
    // travelai://booking/<id>
    // pathname is e.g. "/abc123"
    const bookingId = parsed.pathname.replace(/^\//, '');
    if (bookingId) {
      router.push(`/bookings/${bookingId}`);
    }
    return;
  }
}
