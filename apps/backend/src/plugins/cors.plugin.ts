// eslint-disable-next-line @typescript-eslint/no-require-imports
const fp = require('fastify-plugin');
import cors from '@fastify/cors';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';

// CORS plugin: allow mobile app and local development origins
const corsPlugin: FastifyPluginAsync = fp(async (fastify: FastifyInstance) => {
  await fastify.register(cors, {
    origin: (origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) {
        cb(null, true);
        return;
      }
      // Allow localhost for development
      if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) {
        cb(null, true);
        return;
      }
      // Allow production domain
      if (origin === 'https://travel-ai.app') {
        cb(null, true);
        return;
      }
      cb(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
    credentials: true,
  });
});

export default corsPlugin;
