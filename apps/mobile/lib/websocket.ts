import type { AppNotification } from '../types';

const WS_BASE_URL = (process.env.EXPO_PUBLIC_WS_URL ?? 'ws://localhost:3000').replace(/\/$/, '');
const RECONNECT_DELAY_MS = 5_000;

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
  let destroyed = false;

  function clearReconnectTimer(): void {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function connect(): void {
    if (destroyed) return;

    try {
      socket = new WebSocket(`${WS_BASE_URL}/ws/notifications`);
    } catch {
      scheduleReconnect();
      return;
    }

    socket.onopen = () => {
      if (destroyed) {
        socket?.close();
        return;
      }
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
      socket = null;
      onDisconnected?.();
      if (!destroyed) {
        scheduleReconnect();
      }
    };
  }

  function scheduleReconnect(): void {
    if (destroyed) return;
    clearReconnectTimer();
    reconnectTimer = setTimeout(() => {
      if (!destroyed) connect();
    }, RECONNECT_DELAY_MS);
  }

  function disconnect(): void {
    destroyed = true;
    clearReconnectTimer();
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
