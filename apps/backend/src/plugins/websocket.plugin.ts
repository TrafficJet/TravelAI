import fp from 'fastify-plugin';
import fastifyWs, { SocketStream } from '@fastify/websocket';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { verifyAccessToken } from '../lib/jwt';

type WsSocket = SocketStream['socket'];

// Singleton map: userId -> active WebSocket connection
const connections = new Map<string, WsSocket>();

/**
 * Push a notification payload to a connected user in real-time.
 * Called from priceAlert worker and notification creation handlers.
 */
export function notifyUser(userId: string, notification: object): void {
  const ws = connections.get(userId);
  if (ws && ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ type: 'notification', data: notification }));
  }
}

/**
 * Return current connection count (used for health / monitoring).
 */
export function getActiveConnectionCount(): number {
  return connections.size;
}

const websocketPlugin: FastifyPluginAsync = fp(async (fastify: FastifyInstance) => {
  await fastify.register(fastifyWs);

  // GET /ws/notifications — authenticated WebSocket endpoint
  fastify.get(
    '/ws/notifications',
    { websocket: true },
    (connection: SocketStream) => {
      const socket = connection.socket;
      let userId: string | null = null;

      // Expect the first message to be an auth frame: { token: "<jwt>" }
      socket.once('message', (raw: Buffer | ArrayBuffer | Buffer[]) => {
        try {
          const msg = JSON.parse(raw.toString()) as { token?: string };
          if (!msg.token) {
            socket.close(4001, 'Missing token');
            return;
          }

          const payload = verifyAccessToken(msg.token);
          userId = payload.sub;

          // Replace any stale connection for this user
          const existing = connections.get(userId);
          if (existing && existing.readyState === existing.OPEN) {
            existing.close(4000, 'Replaced by new connection');
          }
          connections.set(userId, socket);

          socket.send(JSON.stringify({ type: 'connected', userId }));
          fastify.log.info({ userId }, 'WS: user connected');
        } catch {
          socket.close(4001, 'Invalid token');
        }
      });

      socket.on('close', () => {
        if (userId && connections.get(userId) === socket) {
          connections.delete(userId);
          fastify.log.info({ userId }, 'WS: user disconnected');
        }
      });

      socket.on('error', (err: Error) => {
        fastify.log.error({ err, userId }, 'WS: socket error');
        if (userId && connections.get(userId) === socket) {
          connections.delete(userId);
        }
      });

      // Keep-alive ping every 30 seconds
      const pingInterval = setInterval(() => {
        if (socket.readyState === socket.OPEN) {
          socket.ping();
        } else {
          clearInterval(pingInterval);
        }
      }, 30_000);

      socket.on('close', () => clearInterval(pingInterval));
    },
  );
});

export default websocketPlugin;
