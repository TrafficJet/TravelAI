import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

/** Call once at app start (in _layout.tsx) */
export function initSentry(): void {
  const dsn: string =
    (Constants.expoConfig?.extra as Record<string, string> | undefined)
      ?.sentryDsn ?? '';

  if (!dsn) {
    // No DSN configured — Sentry stays disabled, no error spam in dev
    return;
  }

  Sentry.init({
    dsn,
    // Capture 20 % of traces in production
    tracesSampleRate: 0.2,
    // Attach native stack frames
    enableNative: true,
    // Don't capture errors from dev builds
    enabled: !__DEV__,
  });
}

interface ErrorContext {
  [key: string]: string | number | boolean | null | undefined;
}

/** Capture an error to Sentry with optional extra context */
export function captureError(error: unknown, context?: ErrorContext): void {
  const err = error instanceof Error ? error : new Error(String(error));

  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    Sentry.captureException(err);
  });
}
