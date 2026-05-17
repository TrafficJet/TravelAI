// eslint-disable-next-line @typescript-eslint/no-require-imports
const fp = require('fastify-plugin');
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';

// Register Prisma client as a Fastify decorator so it's available on fastify.prisma
const prismaPlugin: FastifyPluginAsync = fp(async (fastify: FastifyInstance) => {
  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
});

export default prismaPlugin;
