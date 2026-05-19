import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../constants/config';
import { toast } from '../lib/toast';

// We import stores lazily to avoid circular deps at module init time
let getAccessToken: (() => string | null) | null = null;
let doRefresh: (() => Promise<void>) | null = null;
let doLogout: (() => Promise<void>) | null = null;
let getGuestId: (() => string | null) | null = null;

export function initApiInterceptors(
  accessTokenGetter: () => string | null,
  refreshFn: () => Promise<void>,
  logoutFn: () => Promise<void>,
  guestIdGetter?: () => string | null,
) {
  getAccessToken = accessTokenGetter;
  doRefresh = refreshFn;
  doLogout = logoutFn;
  if (guestIdGetter) getGuestId = guestIdGetter;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30_000,
});

// Request interceptor — attach token or guest ID
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken?.();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    const guestId = getGuestId?.();
    if (guestId) {
      config.headers['X-Guest-ID'] = guestId;
    }
  }
  return config;
});

// Track whether a refresh is already in-flight
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}> = [];

function processQueue(error: unknown) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(null);
    }
  });
  failedQueue = [];
}

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue subsequent 401s until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshTimeout = setTimeout(() => {
        if (isRefreshing) {
          isRefreshing = false;
          processQueue(new Error('Refresh timeout'));
        }
      }, 10_000);

      try {
        await doRefresh?.();
        processQueue(null);
        // Re-attach new token
        const newToken = getAccessToken?.();
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        await doLogout?.();
        return Promise.reject(refreshError);
      } finally {
        clearTimeout(refreshTimeout);
        isRefreshing = false;
      }
    }

    // Network error (no response) — show toast once
    if (!error.response) {
      toast.error('Нет соединения с сервером. Проверьте интернет.');
    }

    return Promise.reject(error);
  },
);

export default api;
