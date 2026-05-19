// eslint-disable-next-line @typescript-eslint/no-require-imports
const fp = require('fastify-plugin');
import cors from '@fastify/cors';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';

// CORS plugin: allow mobile app and local development origins
const corsPlugin: FastifyPluginAsync = fp(async (fastify: FastifyInstance) => {
  await fastify.register(cors, {
    origin: (origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => {
      // Allow requests with no origin (mobile apps, curl, Postman, React Native)
      if (!origin) {
        cb(null, true);
        return;
      }
      // Allow localhost for development
      if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) {
        cb(null, true);
        return;
      }
      // Allow Expo Go and Expo dev client (exp://, exps://, expo://)
      if (/^exp[os]?:\/\//i.test(origin)) {
        cb(null, true);
        return;
      }
      // Allow Railway production deployment (self-referencing internal requests)
      if (/\.railway\.app$/.test(origin)) {
        cb(null, true);
        return;
      }
      // Allow production domain
      if (origin === 'https://travel-ai.app' || origin === 'https://getsvit.com') {
        cb(null, true);
        return;
      }
      // Allow Expo web preview and hosted apps
      if (/\.expo\.dev$/.test(origin) || /\.expo\.io$/.test(origin)) {
        cb(null, true);
        return;
      }
      cb(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'X-Guest-ID'],
    credentials: true,
  });
});

export default corsPlugin;
