import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { Colors, Spacing } from '../../constants';

// ── Main entry screen ─────────────────────────────────────────────────────────

export default function ChatEntryScreen() {
  const { sessions, loadSessions, createSession } = useChatStore();
  const { isAuthenticated, guestId } = useAuthStore();
  const [hasError, setHasError] = useState(false);

  // For authenticated users: load sessions and redirect into the last (or new) chat
  const initAuthenticated = useCallback(async () => {
    setHasError(false);
    try {
      await loadSessions();
      const current = useChatStore.getState().sessions[0];
      if (current) {
        router.replace((`/chat/${current.id}`) as never);
      } else {
        const id = await createSession();
        router.replace((`/chat/${id}`) as never);
      }
    } catch {
      // Fallback: try creating a fresh session
      try {
        const id = await createSession();
        router.replace((`/chat/${id}`) as never);
      } catch {
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
      router.replace(`/chat/${id}` as never);
    } catch {
      setHasError(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      void initAuthenticated();
    } else if (guestId !== null) {
      // Wait until guestId is loaded from SecureStore before creating a guest session
      // (avoids race: api interceptor needs guestId to send X-Guest-ID header)
      void initGuest();
    }
    // guestId === null means it's still being loaded — effect will re-run when it's set
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, guestId]);

  void sessions; // suppress unused warning

  // ── Error state (only when authenticated user's session load failed) ───────
  if (hasError) {
    return (
      <View style={styles.container}>
        <View style={styles.logoWrap}>
          <LinearGradient
            colors={['rgba(245,158,11,0.25)', 'rgba(245,158,11,0.06)']}
            style={styles.logoGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="airplane" size={48} color={Colors.primary} />
          </LinearGradient>
        </View>
        <Text style={styles.brand}>TravelAI</Text>
        <Ionicons
          name="cloud-offline-outline"
          size={40}
          color={Colors.textMuted}
          style={styles.errorIcon}
        />
        <Text style={styles.errorTitle}>Не удалось загрузить чаты</Text>
        <Text style={styles.errorSubtitle}>
          Проверьте подключение к интернету и повторите попытку
        </Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => void initAuthenticated()}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh-outline" size={18} color="#fff" />
          <Text style={styles.retryBtnText}>Повторить</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Loading spinner while redirecting (guest or authenticated user) ─────────
  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <LinearGradient
          colors={['rgba(245,158,11,0.25)', 'rgba(245,158,11,0.06)']}
          style={styles.logoGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="airplane" size={48} color={Colors.primary} />
        </LinearGradient>
      </View>
      <Text style={styles.brand}>TravelAI</Text>
      <Text style={styles.tagline}>Ваш AI-помощник в путешествиях</Text>
      <ActivityIndicator
        color={Colors.primary}
        size="large"
        style={styles.spinner}
      />
    </View>
  );

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: Spacing.xl,
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
    borderColor: 'rgba(245,158,11,0.3)',
  },
  brand: {
    fontFamily: 'Sora',
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: Colors.textMuted,
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
    color: Colors.text,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
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
