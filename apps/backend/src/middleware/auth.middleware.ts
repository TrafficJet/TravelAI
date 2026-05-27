import { FastifyRequest, FastifyReply } from 'fastify';
import { JsonWebTokenError, TokenExpiredError, NotBeforeError } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { verifyAccessToken } from '../lib/jwt';
import { Errors } from '../lib/errors';
import { prisma } from '../lib/prisma';

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
      return reply.status(appErr.statusCode).send(appErr.toJSON());
    } else if (err instanceof NotBeforeError) {
      const appErr = Errors.unauthorized('Token not yet valid');
      return reply.status(appErr.statusCode).send(appErr.toJSON());
    } else if (err instanceof JsonWebTokenError) {
      // Malformed / invalid signature / wrong algorithm
      const appErr = Errors.unauthorized('Invalid token');
      return reply.status(appErr.statusCode).send(appErr.toJSON());
    } else {
      // Unexpected error
      const appErr = Errors.unauthorized('Authentication failed');
      return reply.status(appErr.statusCode).send(appErr.toJSON());
    }
  }
}

// Optional auth: allows both authenticated users and guests.
// Priority: 1) valid Bearer token → full auth, 2) X-Guest-ID header → guest, 3) neither → new guest.
// Guest users are upserted into the users table with provider='guest'.
export async function optionalAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;

  // 1. Try Bearer token first
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (token) {
      try {
        const payload = verifyAccessToken(token);
        request.userId = payload.sub;
        request.userEmail = payload.email;
        request.isGuest = false;
        return;
      } catch (err) {
        // Authorization header was present but JWT is invalid/expired.
        // Do NOT silently fall through to guest — that would expose data of
        // authenticated users to requests carrying a stale token.
        const code =
          err instanceof TokenExpiredError ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
        const message =
          err instanceof TokenExpiredError
            ? 'Токен истёк, войдите снова'
            : 'Недействительный токен';
        reply.status(401).send({ error: { code, message } });
        return;
      }
    }
  }

  // 2. Guest path: resolve or create a guest user
  const headerGuestId = request.headers['x-guest-id'];
  const guestId =
    typeof headerGuestId === 'string' && headerGuestId.length > 0
      ? headerGuestId
      : uuidv4();

  const guestEmail = `guest_${guestId}@travelai.guest`;

  try {
    const guestUser = await prisma.user.upsert({
      where: { email: guestEmail },
      create: {
        email: guestEmail,
        name: 'Гость',
        provider: 'guest',
      },
      update: {},
      select: { id: true, email: true },
    });

    request.userId = guestUser.id;
    request.userEmail = guestUser.email;
    request.isGuest = true;
  } catch (err) {
    // If guest upsert fails (e.g., DB down), reject the request
    const appErr = Errors.unauthorized('Failed to initialise guest session');
    reply.status(appErr.statusCode).send(appErr.toJSON());
  }
}
