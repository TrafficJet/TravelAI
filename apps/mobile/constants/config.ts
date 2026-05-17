export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  'https://travel-ai-backend-production-90a0.up.railway.app/api';

export const SECURE_STORE_KEYS = {
  ACCESS_TOKEN: 'travel_ai_access_token',
  REFRESH_TOKEN: 'travel_ai_refresh_token',
} as const;
