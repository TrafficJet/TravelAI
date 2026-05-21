import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

if (!process.env.JWT_ACCESS_SECRET) {
  throw new Error('JWT_ACCESS_SECRET is not set in environment variables');
}
if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error('JWT_REFRESH_SECRET is not set in environment variables');
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// Access token TTL: 15 minutes (security hardening)
const ACCESS_TTL = 15 * 60;
// Refresh token TTL: 30 days
const REFRESH_TTL = 30 * 24 * 60 * 60;

export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
}

export interface RefreshTokenPayload {
  sub: string; // userId
  jti: string; // token ID stored in DB
}

export function signAccessToken(payload: AccessTokenPayload): string {
  // jwtid ensures uniqueness even when two tokens are issued within the same second
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TTL, jwtid: randomUUID() });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TTL });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  // Явное указание алгоритма предотвращает атаку alg:none / algorithm confusion
  return jwt.verify(token, ACCESS_SECRET, { algorithms: ['HS256'] }) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, REFRESH_SECRET, { algorithms: ['HS256'] }) as RefreshTokenPayload;
}

export function getRefreshExpiresAt(): Date {
  return new Date(Date.now() + REFRESH_TTL * 1000);
}
