import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { Spacing } from '../../constants';
import { useTheme } from '../../src/theme/ThemeContext';

// ── Main entry screen ─────────────────────────────────────────────────────────

export default function ChatEntryScreen() {
  const { colors } = useTheme();
  const { sessions, loadSessions, createSession } = useChatStore();
  const { isAuthenticated, guestId, isLoading: isAuthLoading } = useAuthStore();
  const [hasError, setHasError] = useState(false);

  // For authenticated users: load sessions and redirect into the last (or new) chat
  const initAuthenticated = useCallback(async () => {
    setHasError(false);

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('init_timeout')), 8_000),
    );

    const actualInit = async () => {
      try {
        await loadSessions();
        const current = useChatStore.getState().sessions[0];
        if (current) {
          router.navigate((`/(tabs)/chat/${current.id}`) as never);
        } else {
          const id = await createSession();
          router.navigate((`/(tabs)/chat/${id}`) as never);
        }
      } catch {
        // Fallback: try creating a fresh session
        const id = await createSession();
        router.navigate((`/(tabs)/chat/${id}`) as never);
      }
    };

    try {
      await Promise.race([actualInit(), timeout]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'init_timeout') {
        // Backend slow/unavailable — use a local fallback session ID and continue
        const fallbackId = Math.random().toString(36).slice(2) + Date.now().toString(36);
        router.navigate((`/(tabs)/chat/${fallbackId}`) as never);
      } else {
        setHasError(true);
      }
    }
  }, [loadSessions, createSession]);

  // For guests: create a real session (backend uses X-Guest-ID header)
  const initGuest = useCallback(async () => {
    try {
      const { chatService } = await import('../../services/chatService');
      const response = await chatService.createSession();
      const id = response.session.id;
      router.navigate(`/(tabs)/chat/${id}` as never);
    } catch {
      // Backend unavailable — use local ID, session will be created lazily on first message
      const fallbackId = Math.random().toString(36).slice(2) + Date.now().toString(36);
      router.navigate(`/(tabs)/chat/${fallbackId}` as never);
    }
  }, []);

  useEffect(() => {
    // Don't navigate until auth store has finished loading from SecureStore
    if (isAuthLoading) return;

    if (isAuthenticated) {
      void initAuthenticated();
    } else if (guestId !== null) {
      // Wait until guestId is loaded from SecureStore before creating a guest session
      // (avoids race: api interceptor needs guestId to send X-Guest-ID header)
      void initGuest();
    }
    // guestId === null means it's still being loaded — effect will re-run when it's set
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, guestId, isAuthLoading]);

  // Safety net: if auth loading hangs for more than 10 s (SecureStore deadlock,
  // slow device, etc.) bail out with an in-memory guest session so the user is
  // never stuck on an infinite spinner.
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only fire if we still haven't navigated away (spinner still visible)
      const { isAuthenticated: auth, guestId: gid, isLoading: loading } = useAuthStore.getState();
      if (!auth && (gid === null || loading)) {
        const emergencyId = Math.random().toString(36).slice(2) + Date.now().toString(36);
        router.navigate(`/(tabs)/chat/${emergencyId}` as never);
      }
    }, 10_000);
    return () => clearTimeout(timer);
  }, []);

  void sessions; // suppress unused warning

  // ── Error state (only when authenticated user's session load failed) ───────
  if (hasError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingHorizontal: Spacing.xl }]}>
        <View style={styles.logoWrap}>
          <LinearGradient
            colors={['rgba(232,160,32,0.25)', 'rgba(232,160,32,0.06)']}
            style={styles.logoGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={{ fontSize: 48, color: colors.primary, lineHeight: 52  }}>{'✈'}</Text>
          </LinearGradient>
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
        <LinearGradient
          colors={['rgba(232,160,32,0.25)', 'rgba(232,160,32,0.06)']}
          style={styles.logoGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={{ fontSize: 48, color: colors.primary, lineHeight: 52  }}>{'✈'}</Text>
        </LinearGradient>
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
  logoGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(232,160,32,0.3)',
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
