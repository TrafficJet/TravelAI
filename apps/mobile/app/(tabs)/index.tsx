import React, { useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useChatStore } from '../../stores/chatStore';
import { Colors, Spacing } from '../../constants';

export default function ChatEntryScreen() {
  const { sessions, loadSessions, createSession } = useChatStore();

  useEffect(() => {
    async function init() {
      try {
        await loadSessions();
        // After loadSessions the store is updated; read from zustand directly
        const current = useChatStore.getState().sessions[0];
        if (current) {
          router.replace((`/chat/${current.id}`) as never);
        } else {
          const id = await createSession();
          router.replace((`/chat/${id}`) as never);
        }
      } catch {
        // If sessions fail to load, create a new session anyway
        try {
          const id = await createSession();
          router.replace((`/chat/${id}`) as never);
        } catch {
          // Stay on loader — user will see the splash
        }
      }
    }
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  void sessions; // suppress unused warning

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
});
