import type { FastifyInstance } from 'fastify';
import { AppError } from '../lib/errors';

/**
 * Register a global error handler on the given Fastify instance.
 * Converts AppError to structured JSON { error: { code, message } }.
 * Called from both buildServer() and buildTestApp() to ensure consistency.
 */
export function registerErrorHandler(fastify: FastifyInstance): void {
  fastify.setErrorHandler((error, _request, reply) => {
    // Rate-limit errors from @fastify/rate-limit — возвращаем 429 вместо 500
    if (error.statusCode === 429 || (error as any).code === 'FST_RATE_LIMIT_EXCEEDED') {
      return reply.status(429).send({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Слишком много запросов. Попробуйте позже.',
          retryAfter: (error as any).retryAfter ?? 60,
        },
      });
    }

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(error.toJSON());
    }

    // Fastify validation errors (schema mismatch)
    if (error.validation) {
      return reply.status(422).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Ошибка валидации данных',
          details: error.validation,
        },
      });
    }

    fastify.log.error(error);
    // Also write to stdout so Railway's log stream always captures it
    console.error('[unhandled error]', error);
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Внутренняя ошибка сервера',
      },
    });
  });
}
