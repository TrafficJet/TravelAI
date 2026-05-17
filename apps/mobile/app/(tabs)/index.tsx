import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useChatStore } from '../../stores/chatStore';
import { Colors, TextPresets, Typography, Radius, Spacing } from '../../constants';
import { useTheme } from '../../src/theme/ThemeContext';
import { analytics, Events } from '../../src/analytics';
import { SkeletonChatRow } from '../../components/ui/Skeleton';
import { toast } from '../../lib/toast';
import type { ChatSession } from '../../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  return new Date(dateStr).toLocaleDateString('ru-RU');
}

// ── Suggestion chips (empty state) ───────────────────────────────────────────

const CHIPS = [
  'Москва → Дубай',
  'Отель в Стамбуле',
  'Тур в Бали',
] as const;

// ── Empty state ───────────────────────────────────────────────────────────────

interface EmptyStateProps {
  onChipPress: (text: string) => void;
}

function EmptyState({ onChipPress }: EmptyStateProps) {
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.icon}>✈️</Text>
      <Text style={emptyStyles.title}>Начни поиск</Text>
      <Text style={emptyStyles.subtitle}>
        Найди рейс, отель или тур — просто напиши запрос
      </Text>
      <View style={emptyStyles.chips}>
        {CHIPS.map((chip) => (
          <TouchableOpacity
            key={chip}
            style={emptyStyles.chip}
            onPress={() => onChipPress(chip)}
            activeOpacity={0.7}
          >
            <Text style={emptyStyles.chipText}>{chip}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 40,
  },
  icon: {
    fontSize: 60,
    marginBottom: 16,
  },
  title: {
    ...TextPresets.h2,
    color: Colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    ...TextPresets.body,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 28,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  chip: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: Radius.chip,
  },
  chipText: {
    ...TextPresets.buttonSm,
    color: Colors.textMuted,
  },
});

// ── Session row ───────────────────────────────────────────────────────────────

interface SessionItemProps {
  session: ChatSession;
  onPress: () => void;
  onLongPress: () => void;
}

function SessionItem({ session, onPress, onLongPress }: SessionItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      style={itemStyles.container}
      delayLongPress={400}
    >
      <View style={itemStyles.icon}>
        <Text style={itemStyles.iconText}>💬</Text>
      </View>
      <View style={itemStyles.content}>
        <Text style={itemStyles.title} numberOfLines={1}>
          {session.title}
        </Text>
        {session.lastMessage ? (
          <Text style={itemStyles.lastMessage} numberOfLines={1}>
            {session.lastMessage}
          </Text>
        ) : null}
      </View>
      <Text style={itemStyles.time}>{formatRelativeTime(session.updatedAt)}</Text>
    </TouchableOpacity>
  );
}

const itemStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  title: {
    ...TextPresets.bodyMedium,
    color: Colors.text,
    fontWeight: Typography.weights.semibold,
    marginBottom: 2,
  },
  lastMessage: {
    ...TextPresets.caption,
    color: Colors.textMuted,
  },
  time: {
    ...TextPresets.label,
    color: Colors.textMuted,
    marginLeft: 8,
  },
});

// ── Search bar ────────────────────────────────────────────────────────────────

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
}

function SearchBar({ value, onChangeText }: SearchBarProps) {
  return (
    <View style={searchStyles.container}>
      <Text style={searchStyles.icon}>🔍</Text>
      <TextInput
        style={searchStyles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder="Поиск по чатам..."
        placeholderTextColor={Colors.textMuted}
        clearButtonMode="while-editing"
        returnKeyType="search"
      />
    </View>
  );
}

const searchStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    borderRadius: Radius.input,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
  },
  icon: {
    fontSize: 15,
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: Colors.text,
    ...TextPresets.body,
    paddingVertical: 12,
  },
});

// ── Skeleton list ─────────────────────────────────────────────────────────────

function SkeletonList() {
  return (
    <View>
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonChatRow key={i} />
      ))}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ChatListScreen() {
  const { sessions, loadSessions, createSession, deleteSession } = useChatStore();
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSessions = useCallback(async () => {
    try {
      await loadSessions();
    } catch {
      // Silently fail — list will just be empty
    }
  }, [loadSessions]);

  // Reset isCreating on mount so stale state from a previous render never blocks the FAB
  useEffect(() => { setIsCreating(false); }, []);

  useEffect(() => {
    const timeout = setTimeout(() => setIsLoading(false), 5000);
    fetchSessions().finally(() => {
      clearTimeout(timeout);
      setIsLoading(false);
    });
    return () => clearTimeout(timeout);
  }, [fetchSessions]);

  async function handleRefresh() {
    setIsRefreshing(true);
    await fetchSessions();
    setIsRefreshing(false);
  }

  async function handleNewChat(initialMessage?: string) {
    if (__DEV__) {
      console.log('[FAB] + pressed, isCreating:', isCreating, 'timestamp:', Date.now());
    }
    console.log('[Chat] handleNewChat called, isCreating:', isCreating);
    if (isCreating) return;
    setIsCreating(true);
    try {
      console.log('[Chat] calling createSession...');
      const sessionId = await createSession(initialMessage);
      console.log('[Chat] session created:', sessionId);
      analytics.track(Events.CHAT_OPENED, { hasInitialMessage: !!initialMessage });
      // Navigate to the new session — use string URL for reliable web routing.
      // Cast is required because expo-router typed routes don't include dynamic segments as plain strings.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.push(('/chat/' + sessionId) as any);
    } catch (error: unknown) {
      console.error('[Chat] createSession error:', error);
      const axiosData =
        error != null &&
        typeof error === 'object' &&
        'response' in error &&
        error.response != null &&
        typeof error.response === 'object' &&
        'data' in error.response
          ? (error.response.data as Record<string, unknown>)
          : null;
      const serverMessage =
        (typeof axiosData?.error === 'string' && axiosData.error) ||
        (typeof axiosData?.message === 'string' && axiosData.message) ||
        null;
      const msg = serverMessage ?? 'Не удалось создать новый чат. Попробуйте снова.';
      if (typeof window !== 'undefined') {
        window.alert('Ошибка: ' + msg);
      } else {
        Alert.alert('Ошибка', msg);
      }
      toast.error(msg);
    } finally {
      setIsCreating(false);
    }
  }

  function handleSessionPress(session: ChatSession) {
    router.push(('/chat/' + session.id) as any);
  }

  function handleSessionLongPress(session: ChatSession) {
    Alert.alert(
      'Удалить чат?',
      `Чат "${session.title}" будет удалён без возможности восстановления.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSession(session.id);
            } catch {
              Alert.alert('Ошибка', 'Не удалось удалить чат. Попробуйте снова.');
            }
          },
        },
      ],
    );
  }

  // Filter sessions by search query
  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sessions ?? [];
    return (sessions ?? []).filter((s) =>
      s.title.toLowerCase().includes(q) ||
      (s.lastMessage ?? '').toLowerCase().includes(q),
    );
  }, [sessions, searchQuery]);

  const hasAnySessions = (sessions ?? []).length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isLoading ? (
        <SkeletonList />
      ) : (
        <>
          {/* Search bar — only shown when there are sessions */}
          {hasAnySessions && (
            <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
          )}

          <FlatList
            data={filteredSessions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <SessionItem
                session={item}
                onPress={() => handleSessionPress(item)}
                onLongPress={() => handleSessionLongPress(item)}
              />
            )}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={Colors.primary}
              />
            }
            ListEmptyComponent={
              hasAnySessions ? (
                // Has sessions but search returned nothing
                <View style={styles.noResults}>
                  <Text style={styles.noResultsText}>
                    По запросу "{searchQuery}" ничего не найдено
                  </Text>
                </View>
              ) : (
                <EmptyState onChipPress={(text) => handleNewChat(text)} />
              )
            }
            contentContainerStyle={
              filteredSessions.length === 0 ? styles.emptyContainer : null
            }
          />
        </>
      )}

      {/* FAB always visible — works even during loading */}
      <TouchableOpacity
        style={[styles.fab, isCreating && styles.fabDisabled]}
        onPress={() => handleNewChat()}
        disabled={isCreating}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>{isCreating ? '...' : '+'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  noResults: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  noResultsText: {
    ...TextPresets.body,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: Spacing.md,
    bottom: Spacing.md,
    width: 56,
    height: 56,
    borderRadius: Radius.fab,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 999,
  },
  fabDisabled: {
    opacity: 0.6,
  },
  fabText: {
    color: Colors.textInverse,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.regular,
    marginTop: -2,
  },
});
