import { create } from 'zustand';
import { Platform } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { authService } from '../services/authService';
import type { SocialAuthUserData } from '../services/authService';
import { initApiInterceptors } from '../services/api';
import { SECURE_STORE_KEYS } from '../constants/config';
import type { UserProfile } from '../types';

// Platform-safe storage: localStorage on web, SecureStore on native
const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};

interface AuthStore {
  user: UserProfile | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  guestId: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithApple: (identityToken: string, userData?: SocialAuthUserData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  loadGuestId: () => Promise<void>;
  setUser: (user: UserProfile) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => {
  // Wire up API interceptors once at module load time
  initApiInterceptors(
    () => get().accessToken,
    () => get().refreshToken(),
    () => get().logout(),
    () => get().guestId,
  );

  return {
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: true,
    guestId: null,

    setUser: (user: UserProfile) => set({ user }),

    loadGuestId: async () => {
      try {
        let guestId = await storage.getItem(SECURE_STORE_KEYS.GUEST_ID);
        if (!guestId) {
          // Generate new UUID
          guestId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
          await storage.setItem(SECURE_STORE_KEYS.GUEST_ID, guestId);
        }
        set({ guestId });
      } catch {
        // SecureStore unavailable (e.g. first launch on some simulators) —
        // generate an in-memory guest ID so the chat entry screen can proceed.
        // Without this guestId stays null forever and index.tsx spins indefinitely.
        const fallbackGuestId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
        set({ guestId: fallbackGuestId });
      }
    },

    loadStoredAuth: async () => {
      try {
        const accessToken = await storage.getItem(SECURE_STORE_KEYS.ACCESS_TOKEN);
        const refreshToken = await storage.getItem(SECURE_STORE_KEYS.REFRESH_TOKEN);

        if (!accessToken || !refreshToken) {
          set({ isLoading: false, isAuthenticated: false });
          await get().loadGuestId();
          return;
        }

        set({ accessToken });

        try {
          // Pass skipAuthRetry=true so a 401 here is handled below rather than
          // triggering the global interceptor's refresh+logout cycle, which
          // produces noisy console errors for demo / stale tokens.
          const user = await authService.getMe(true);
          if (__DEV__) console.log('[Auth] loadStoredAuth user:', user?.email);
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (getMeErr) {
          // If the server returns 401 (demo token / stale token), clear local
          // credentials silently and continue as a guest — no console noise.
          const is401 =
            axios.isAxiosError(getMeErr) && getMeErr.response?.status === 401;

          if (is401) {
            if (__DEV__) {
              console.log('[Auth] /users/me returned 401 — clearing stored credentials, continuing as guest.');
            }
            await storage.removeItem(SECURE_STORE_KEYS.ACCESS_TOKEN);
            await storage.removeItem(SECURE_STORE_KEYS.REFRESH_TOKEN);
            set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
            await get().loadGuestId();
            return;
          }

          // Token might be expired for other reasons — try to refresh
          try {
            const tokens = await authService.refresh(refreshToken);
            await storage.setItem(SECURE_STORE_KEYS.ACCESS_TOKEN, tokens.accessToken);
            await storage.setItem(SECURE_STORE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
            set({ accessToken: tokens.accessToken });
            const user = await authService.getMe();
            if (__DEV__) console.log('[Auth] loadStoredAuth user (after refresh):', user?.email);
            set({ user, isAuthenticated: true, isLoading: false });
          } catch {
            if (__DEV__) {
              console.log('[Auth] Token refresh failed, clearing credentials.');
            }
            await storage.removeItem(SECURE_STORE_KEYS.ACCESS_TOKEN);
            await storage.removeItem(SECURE_STORE_KEYS.REFRESH_TOKEN);
            set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
            // Guest session must be loaded so the chat entry screen can proceed
            await get().loadGuestId();
          }
        }
      } catch {
        set({ isLoading: false, isAuthenticated: false });
        await get().loadGuestId();
      }
    },

    login: async (email: string, password: string) => {
      const response = await authService.login(email, password);

      await storage.setItem(SECURE_STORE_KEYS.ACCESS_TOKEN, response.accessToken);
      await storage.setItem(SECURE_STORE_KEYS.REFRESH_TOKEN, response.refreshToken);

      // Immediately apply user data from auth response so the profile
      // screen never shows empty fields even if getMe() is slow or fails.
      set({
        accessToken: response.accessToken,
        user: response.user as UserProfile,
        isAuthenticated: true,
      });

      // Fetch full profile (includes subscription + wallet) in the background
      try {
        const user = await authService.getMe();
        set({ user });
      } catch {
        // Keep the partial user from the auth response — fields are already visible
      }
    },

    register: async (email: string, password: string, name: string) => {
      const response = await authService.register(email, password, name);

      await storage.setItem(SECURE_STORE_KEYS.ACCESS_TOKEN, response.accessToken);
      await storage.setItem(SECURE_STORE_KEYS.REFRESH_TOKEN, response.refreshToken);

      // Same pattern: commit auth-response user immediately, then enrich.
      set({
        accessToken: response.accessToken,
        user: response.user as UserProfile,
        isAuthenticated: true,
      });

      try {
        const user = await authService.getMe();
        set({ user });
      } catch {
        // Keep the partial user from the auth response
      }
    },

    loginWithGoogle: async (idToken: string) => {
      const response = await authService.loginWithGoogle(idToken);

      await storage.setItem(SECURE_STORE_KEYS.ACCESS_TOKEN, response.accessToken);
      await storage.setItem(SECURE_STORE_KEYS.REFRESH_TOKEN, response.refreshToken);

      set({
        accessToken: response.accessToken,
        user: response.user as UserProfile,
        isAuthenticated: true,
      });

      try {
        const user = await authService.getMe();
        set({ user });
      } catch {
        // Keep the partial user from the auth response
      }
    },

    loginWithApple: async (identityToken: string, userData?: SocialAuthUserData) => {
      const response = await authService.loginWithApple(identityToken, userData);

      await storage.setItem(SECURE_STORE_KEYS.ACCESS_TOKEN, response.accessToken);
      await storage.setItem(SECURE_STORE_KEYS.REFRESH_TOKEN, response.refreshToken);

      set({
        accessToken: response.accessToken,
        user: response.user as UserProfile,
        isAuthenticated: true,
      });

      try {
        const user = await authService.getMe();
        set({ user });
      } catch {
        // Keep the partial user from the auth response
      }
    },

    logout: async () => {
      try {
        const refreshToken = await storage.getItem(SECURE_STORE_KEYS.REFRESH_TOKEN);
        if (refreshToken) {
          await authService.logout(refreshToken);
        }
      } catch {
        // Ignore errors on logout
      } finally {
        await storage.removeItem(SECURE_STORE_KEYS.ACCESS_TOKEN);
        await storage.removeItem(SECURE_STORE_KEYS.REFRESH_TOKEN);
        set({ user: null, accessToken: null, isAuthenticated: false });
      }
    },

    refreshToken: async () => {
      const storedRefreshToken = await storage.getItem(SECURE_STORE_KEYS.REFRESH_TOKEN);
      if (!storedRefreshToken) {
        throw new Error('No refresh token');
      }

      const tokens = await authService.refresh(storedRefreshToken);

      await storage.setItem(SECURE_STORE_KEYS.ACCESS_TOKEN, tokens.accessToken);
      await storage.setItem(SECURE_STORE_KEYS.REFRESH_TOKEN, tokens.refreshToken);

      set({ accessToken: tokens.accessToken });
    },
  };
});
