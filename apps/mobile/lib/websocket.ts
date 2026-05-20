import type { AppNotification } from '../types';

const WS_BASE_URL = (
  process.env.EXPO_PUBLIC_WS_URL ??
  'wss://travel-ai-backend-production-90a0.up.railway.app'
).replace(/\/$/, '');

// How long to wait for the WebSocket handshake before giving up (ms)
const CONNECT_TIMEOUT_MS = 8_000;
// How long to wait before attempting a reconnect (ms)
const RECONNECT_DELAY_MS = 15_000;
// Maximum number of consecutive failed connection attempts before giving up
const MAX_FAILURES = 3;

export type WSNotificationHandler = (notification: AppNotification) => void;

interface WSClientOptions {
  token: string;
  onNotification: WSNotificationHandler;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export interface WSClient {
  disconnect: () => void;
}

export function createNotificationsWSClient(options: WSClientOptions): WSClient {
  const { token, onNotification, onConnected, onDisconnected } = options;

  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let connectTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;
  let consecutiveFailures = 0;

  function clearReconnectTimer(): void {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function clearConnectTimeout(): void {
    if (connectTimeoutTimer !== null) {
      clearTimeout(connectTimeoutTimer);
      connectTimeoutTimer = null;
    }
  }

  function connect(): void {
    if (destroyed) return;

    // Stop trying after too many consecutive failures — the server is unavailable
    if (consecutiveFailures >= MAX_FAILURES) {
      if (__DEV__) {
        console.log(
          `[WS] Notifications WebSocket gave up after ${consecutiveFailures} failed attempts. ` +
          'App continues normally without real-time notifications.',
        );
      }
      return;
    }

    try {
      socket = new WebSocket(`${WS_BASE_URL}/ws/notifications`);
    } catch {
      consecutiveFailures++;
      scheduleReconnect();
      return;
    }

    // Guard against long TCP timeouts (e.g. Railway not reachable): close after
    // CONNECT_TIMEOUT_MS if the socket has not transitioned to OPEN state yet.
    connectTimeoutTimer = setTimeout(() => {
      if (socket && socket.readyState !== WebSocket.OPEN) {
        if (__DEV__) {
          console.log('[WS] Notifications WebSocket connection timed out — closing gracefully.');
        }
        socket.close();
        // onclose handler will fire and schedule a reconnect (or give up)
      }
    }, CONNECT_TIMEOUT_MS);

    socket.onopen = () => {
      clearConnectTimeout();
      if (destroyed) {
        socket?.close();
        return;
      }
      consecutiveFailures = 0;
      // Authenticate immediately after opening the connection
      socket?.send(JSON.stringify({ token }));
      onConnected?.();
    };

    socket.onmessage = (event) => {
      if (destroyed) return;
      try {
        const payload = JSON.parse(event.data as string) as unknown;
        if (isAppNotification(payload)) {
          onNotification(payload);
        }
      } catch {
        // Malformed message — ignore
      }
    };

    socket.onerror = () => {
      // onclose will fire after onerror, so we handle reconnect there
    };

    socket.onclose = () => {
      clearConnectTimeout();
      socket = null;
      consecutiveFailures++;
      onDisconnected?.();
      if (!destroyed) {
        scheduleReconnect();
      }
    };
  }

  function scheduleReconnect(): void {
    if (destroyed) return;
    if (consecutiveFailures >= MAX_FAILURES) return;
    clearReconnectTimer();
    reconnectTimer = setTimeout(() => {
      if (!destroyed) connect();
    }, RECONNECT_DELAY_MS);
  }

  function disconnect(): void {
    destroyed = true;
    clearReconnectTimer();
    clearConnectTimeout();
    if (socket) {
      socket.close();
      socket = null;
    }
  }

  // Start initial connection
  connect();

  return { disconnect };
}

// ── Type guard ────────────────────────────────────────────────────────────────

function isAppNotification(value: unknown): value is AppNotification {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.body === 'string' &&
    typeof obj.isRead === 'boolean' &&
    typeof obj.createdAt === 'string'
  );
}
