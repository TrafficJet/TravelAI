import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { Spacing } from '../../constants';
import { useTheme } from '../../src/theme/ThemeContext';
import { SvitLogo } from '../../components/SvitLogo';

// ── Main entry screen ─────────────────────────────────────────────────────────

export default function ChatEntryScreen() {
  const { colors } = useTheme();
  const { sessions, loadSessions, createSession } = useChatStore();
  const { isAuthenticated, guestId, isLoading: isAuthLoading } = useAuthStore();
  const [hasError, setHasError] = useState(false);
  // Prevent concurrent init calls (e.g. from rapid focus events)
  const isInitiatingRef = useRef(false);

  // For authenticated users: load sessions and redirect into the last (or new) chat.
  // Uses router.replace so this screen is removed from the stack — tapping the Chat
  // tab again will land directly on the session, not back on this spinner.
  const initAuthenticated = useCallback(async () => {
    if (isInitiatingRef.current) return;
    isInitiatingRef.current = true;

    // Fast path: if sessions are already loaded — navigate immediately without spinner delay
    const { sessions: existingSessions } = useChatStore.getState();
    const lastSession = existingSessions[0];
    if (lastSession) {
      router.replace(`/(tabs)/chat/${lastSession.id}` as never);
      return;
    }

    setHasError(false);

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('init_timeout')), 8_000),
    );

    const actualInit = async () => {
      try {
        await loadSessions();
        const current = useChatStore.getState().sessions[0];
        if (current) {
          router.replace(`/(tabs)/chat/${current.id}` as never);
        } else {
          const id = await createSession();
          router.replace(`/(tabs)/chat/${id}` as never);
        }
      } catch {
        // Fallback: try creating a fresh session
        const id = await createSession();
        router.replace(`/(tabs)/chat/${id}` as never);
      }
    };

    try {
      await Promise.race([actualInit(), timeout]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'init_timeout') {
        // Backend slow/unavailable — use a local fallback session ID and continue
        const fallbackId = Math.random().toString(36).slice(2) + Date.now().toString(36);
        router.replace(`/(tabs)/chat/${fallbackId}` as never);
      } else {
        // Любая другая ошибка — тоже fallback-навигация, не вечный спиннер
        try {
          const fallbackId = Math.random().toString(36).slice(2) + Date.now().toString(36);
          router.replace(`/(tabs)/chat/${fallbackId}` as never);
        } catch {
          isInitiatingRef.current = false;
          setHasError(true);
        }
      }
    }
  }, [loadSessions, createSession]);

  // For guests: create a real session (backend uses X-Guest-ID header)
  const initGuest = useCallback(async () => {
    if (isInitiatingRef.current) return;
    isInitiatingRef.current = true;

    // Fast path: if sessions are already loaded — navigate immediately without spinner delay
    const { sessions: existingSessions } = useChatStore.getState();
    const lastSession = existingSessions[0];
    if (lastSession) {
      router.replace(`/(tabs)/chat/${lastSession.id}` as never);
      return;
    }

    try {
      const { chatService } = await import('../../services/chatService');
      const response = await chatService.createSession();
      const id = response.session.id;
      // Add the new guest session to the store so chat history is populated
      const newSession = {
        id,
        title: response.session.title ?? 'Новый чат',
        updatedAt: new Date().toISOString(),
      };
      useChatStore.setState((state) => ({ sessions: [newSession, ...state.sessions] }));
      router.replace(`/(tabs)/chat/${id}` as never);
    } catch {
      // Backend unavailable — use local ID, session will be created lazily on first message
      const fallbackId = Math.random().toString(36).slice(2) + Date.now().toString(36);
      router.replace(`/(tabs)/chat/${fallbackId}` as never);
    }
  }, []);

  // useFocusEffect fires every time this screen comes into focus (including when
  // the user taps the Chat tab from another tab). This prevents the spinner deadlock
  // that occurred when the screen regained focus but useEffect didn't re-fire.
  useFocusEffect(
    useCallback(() => {
      // Reset the initiating flag so a fresh focus always triggers navigation
      isInitiatingRef.current = false;

      if (isAuthLoading) return;

      if (isAuthenticated) {
        void initAuthenticated();
      } else if (guestId !== null) {
        void initGuest();
      }
      // guestId === null means it's still being loaded from SecureStore — will re-run when set
    }, [isAuthenticated, guestId, isAuthLoading, initAuthenticated, initGuest]),
  );

  // Universal safety net: if after 8 s we're still on the spinner, force-navigate.
  // Shorter than before (8 s) because router.replace is now used everywhere.
  useFocusEffect(
    useCallback(() => {
      const safetyTimer = setTimeout(() => {
        const { isAuthenticated: auth, guestId: gid } = useAuthStore.getState();
        const { sessions: existingSessions } = useChatStore.getState();
        const session = existingSessions[0];
        if (session) {
          router.replace(`/(tabs)/chat/${session.id}` as never);
        } else if (auth || gid) {
          const fallbackId = Math.random().toString(36).slice(2) + Date.now().toString(36);
          router.replace(`/(tabs)/chat/${fallbackId}` as never);
        }
      }, 8_000);
      return () => clearTimeout(safetyTimer);
    }, []),
  );

  void sessions;

  // ── Error state (only when authenticated user's session load failed) ───────
  if (hasError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingHorizontal: Spacing.xl }]}>
        <View style={styles.logoWrap}>
          <SvitLogo size={96} />
        </View>
        <Text style={[styles.brand, { color: colors.text }]}>SVIT</Text>
        <Text style={[styles.errorIcon, { fontSize: 40, color: colors.textMuted }]}>{'☁'}</Text>
        <Text style={[styles.errorTitle, { color: colors.text }]}>Не удалось загрузить чаты</Text>
        <Text style={[styles.errorSubtitle, { color: colors.textMuted }]}>
          Проверьте подключение к интернету и повторите попытку
        </Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          onPress={() => isAuthenticated ? void initAuthenticated() : void initGuest()}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 18, color: "#fff", lineHeight: 22 }}>{'↺'}</Text>
          <Text style={styles.retryBtnText}>Повторить</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Loading spinner while redirecting (guest or authenticated user) ─────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingHorizontal: Spacing.xl }]}>
      <View style={styles.logoWrap}>
        <SvitLogo size={96} />
      </View>
      <Text style={[styles.brand, { color: colors.text }]}>SVIT</Text>
      <Text style={[styles.tagline, { color: colors.textMuted }]}>Ваш AI-помощник в путешествиях</Text>
      <ActivityIndicator
        color={colors.primary}
        size="large"
        style={styles.spinner}
      />
    </View>
  );

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  logoWrap: {
    marginBottom: 8,
  },
  brand: {
    fontFamily: 'Sora',
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: 'Inter',
    fontSize: 14,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  spinner: {
    marginTop: 24,
  },
  errorIcon: {
    marginTop: 8,
  },
  errorTitle: {
    fontFamily: 'Sora',
    fontSize: 18,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryBtnText: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
});
