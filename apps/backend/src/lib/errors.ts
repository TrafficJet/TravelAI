// Unified application error class for consistent API error responses

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    // Capture stack trace in V8
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details !== undefined ? { details: this.details } : {}),
      },
    };
  }
}

// Predefined factory helpers for common errors
export const Errors = {
  unauthorized(message = 'Необходима авторизация') {
    return new AppError(401, 'UNAUTHORIZED', message);
  },
  forbidden(message = 'Доступ запрещён') {
    return new AppError(403, 'FORBIDDEN', message);
  },
  notFound(resource = 'Ресурс') {
    return new AppError(404, 'NOT_FOUND', `${resource} не найден`);
  },
  conflict(message: string) {
    return new AppError(409, 'CONFLICT', message);
  },
  validation(message: string, details?: unknown) {
    return new AppError(422, 'VALIDATION_ERROR', message, details);
  },
  badRequest(message: string) {
    return new AppError(400, 'BAD_REQUEST', message);
  },
  paymentRequired(message = 'Недостаточно средств на кошельке') {
    return new AppError(402, 'PAYMENT_REQUIRED', message);
  },
  limitReached(message: string) {
    return new AppError(403, 'LIMIT_REACHED', message);
  },
  internal(message = 'Внутренняя ошибка сервера') {
    return new AppError(500, 'INTERNAL_ERROR', message);
  },
};
