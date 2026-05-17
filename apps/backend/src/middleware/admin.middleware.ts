import { FastifyRequest, FastifyReply } from 'fastify';

// Admin authentication middleware — checks x-admin-secret header
// Refuses to serve if ADMIN_SECRET env var is not configured
export async function adminAuth(request: FastifyRequest, reply: FastifyReply) {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    request.log.error('ADMIN_SECRET env var is not set');
    return reply.code(503).send({ error: 'Admin panel not configured' });
  }
  const auth = request.headers['x-admin-secret'];
  if (auth !== adminSecret) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
}
