import { FastifyInstance } from 'fastify';
import { register, login, refresh, logout, forgotPassword, resetPassword } from '../handlers/auth.handler';
import { googleAuth, appleAuth } from '../handlers/oauth.handler';
import { authenticate } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';

// Per-route rate limit override for auth endpoints: 10 req/min per IP
const authRateLimit = {
  config: { rateLimit: { max: 10, timeWindow: 60_000 } },
};

// Auth routes — no authentication required except logout
export async function authRoutes(fastify: FastifyInstance) {
  // POST /api/auth/register — stricter rate limit (10/min)
  fastify.post('/register', {
    ...authRateLimit,
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          name: { type: 'string', minLength: 2, maxLength: 100 },
        },
      },
    },
    handler: register,
  });

  // POST /api/auth/login — stricter rate limit (10/min)
  fastify.post('/login', {
    ...authRateLimit,
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1 },
        },
      },
    },
    handler: login,
  });

  // POST /api/auth/refresh — stricter rate limit (10/min)
  fastify.post('/refresh', {
    ...authRateLimit,
    schema: {
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string', minLength: 1 },
        },
      },
    },
    handler: refresh,
  });

  // POST /api/auth/logout (requires auth) — stricter rate limit (10/min)
  fastify.post('/logout', {
    ...authRateLimit,
    preHandler: authenticate,
    schema: {
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string', minLength: 1 },
        },
      },
    },
    handler: logout,
  });

  // POST /api/auth/forgot-password — request password reset email
  fastify.post('/forgot-password', {
    ...authRateLimit,
    schema: {
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' },
        },
      },
    },
    handler: forgotPassword,
  });

  // POST /api/auth/reset-password — apply reset token and set new password
  fastify.post('/reset-password', {
    ...authRateLimit,
    schema: {
      body: {
        type: 'object',
        required: ['token', 'newPassword'],
        properties: {
          token: { type: 'string', minLength: 1 },
          newPassword: { type: 'string', minLength: 8 },
        },
      },
    },
    handler: resetPassword,
  });

  // POST /api/auth/google — OAuth via Google ID token
  fastify.post('/google', {
    ...authRateLimit,
    schema: {
      body: {
        type: 'object',
        required: ['idToken'],
        properties: {
          idToken: { type: 'string', minLength: 1 },
        },
      },
    },
    handler: googleAuth,
  });

  // GET /api/auth/ping-db — temporary diagnostic: verify Prisma connection and return user count
  fastify.get('/ping-db', async (_request, reply) => {
    const userCount = await prisma.user.count();
    return reply.send({ ok: true, userCount });
  });

  // POST /api/auth/apple — OAuth via Apple identity token
  fastify.post('/apple', {
    ...authRateLimit,
    schema: {
      body: {
        type: 'object',
        required: ['identityToken'],
        properties: {
          identityToken: { type: 'string', minLength: 1 },
          user: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
            },
          },
        },
      },
    },
    handler: appleAuth,
  });
}
