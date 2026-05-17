import 'fastify';
import { PrismaClient } from '@prisma/client';

// Augment Fastify types to include our custom decorations
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }

  interface FastifyRequest {
    // Set by auth middleware after JWT verification
    userId: string;
    userEmail: string;
  }
}
