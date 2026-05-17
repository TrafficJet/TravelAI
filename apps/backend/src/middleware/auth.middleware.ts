import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../lib/jwt';
import { Errors } from '../lib/errors';

// JWT auth middleware: verifies Bearer token and attaches userId/userEmail to request
export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const err = Errors.unauthorized('Отсутствует токен авторизации');
    reply.status(err.statusCode).send(err.toJSON());
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    request.userId = payload.sub;
    request.userEmail = payload.email;
  } catch {
    const err = Errors.unauthorized('Токен недействителен или истёк');
    reply.status(err.statusCode).send(err.toJSON());
    return;
  }
}
