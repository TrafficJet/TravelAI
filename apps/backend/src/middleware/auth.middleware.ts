import { FastifyRequest, FastifyReply } from 'fastify';
import { JsonWebTokenError, TokenExpiredError, NotBeforeError } from 'jsonwebtoken';
import { verifyAccessToken } from '../lib/jwt';
import { Errors } from '../lib/errors';

// JWT auth middleware: verifies Bearer token and attaches userId/userEmail to request
export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;

  // No Authorization header at all
  if (!authHeader) {
    const err = Errors.unauthorized('Authentication required');
    reply.status(err.statusCode).send(err.toJSON());
    return;
  }

  // Header exists but wrong format (not "Bearer <token>")
  if (!authHeader.startsWith('Bearer ')) {
    const err = Errors.unauthorized('Invalid authorization format. Expected: Bearer <token>');
    reply.status(err.statusCode).send(err.toJSON());
    return;
  }

  const token = authHeader.slice(7);

  // Empty token after "Bearer "
  if (!token) {
    const err = Errors.unauthorized('Authentication required');
    reply.status(err.statusCode).send(err.toJSON());
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    request.userId = payload.sub;
    request.userEmail = payload.email;
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      // Expired access token — client should use refresh token
      const appErr = Errors.unauthorized('Access token expired');
      reply.status(appErr.statusCode).send(appErr.toJSON());
    } else if (err instanceof NotBeforeError) {
      const appErr = Errors.unauthorized('Token not yet valid');
      reply.status(appErr.statusCode).send(appErr.toJSON());
    } else if (err instanceof JsonWebTokenError) {
      // Malformed / invalid signature / wrong algorithm
      const appErr = Errors.unauthorized('Invalid token');
      reply.status(appErr.statusCode).send(appErr.toJSON());
    } else {
      // Unexpected error
      const appErr = Errors.unauthorized('Authentication failed');
      reply.status(appErr.statusCode).send(appErr.toJSON());
    }
  }
}
