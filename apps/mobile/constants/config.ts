export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

export const SECURE_STORE_KEYS = {
  ACCESS_TOKEN: 'travel_ai_access_token',
  REFRESH_TOKEN: 'travel_ai_refresh_token',
} as const;
