import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationsContext } from '../../context/NotificationsContext';
import { Colors, TextPresets, Typography, Radius, Spacing } from '../../constants';
import { useTheme } from '../../src/theme/ThemeContext';
import { analytics, Events } from '../../src/analytics';
import { SkeletonChatRow } from '../../components/ui/Skeleton';
import type { ChatSession } from '../../types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DELETE_BUTTON_WIDTH = 80;
const SWIPE_THRESHOLD = DELETE_BUTTON_WIDTH * 0.6;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatItemTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const hours = diff / 3_600_000;
  if (hours < 24) {
    return new Date(dateStr).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Custom Header ─────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Доброе утро';
  if (hour < 18) return 'Добрый день';
  return 'Добрый вечер';
}

function getTodayDate(): string {
  return new Date().toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  });
}

interface CustomHeaderProps {
  onNotificationsPress: () => void;
  userInitials: string;
  userName?: string;
  unreadCount: number;
}

function CustomHeader({ onNotificationsPress, userInitials, userName, unreadCount }: CustomHeaderProps) {
  const insets = useSafeAreaInsets();
  const greeting = userName
    ? `${getGreeting()}, ${userName.split(' ')[0]}!`
    : getTodayDate();

  return (
    <View style={[headerStyles.container, { paddingTop: insets.top + 6 }]}>
      {/* Left: brand */}
      <View style={headerStyles.left}>
        <Text style={headerStyles.brand}>TravelAI</Text>
        <Text style={headerStyles.brandSub}>{greeting}</Text>
      </View>
      {/* Right: bell + avatar */}
      <View style={headerStyles.right}>
        <TouchableOpacity
          style={headerStyles.iconBtn}
          onPress={onNotificationsPress}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={headerStyles.bellIcon}>🔔</Text>
          {unreadCount > 0 && (
            <View style={headerStyles.badge}>
              <Text style={headerStyles.badgeText}>
                {unreadCount > 9 ? '9+' : String(unreadCount)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={headerStyles.avatar}>
          <Text style={headerStyles.avatarText}>{userInitials}</Text>
        </View>
      </View>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: 10,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  left: {
    gap: 2,
  },
  brand: {
    fontFamily: 'Sora',
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  brandSub: {
    ...TextPresets.label,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellIcon: {
    fontSize: 16,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.background,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700' as const,
    lineHeight: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Sora',
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textInverse,
    letterSpacing: 0.5,
  },
});

// ── Empty state ───────────────────────────────────────────────────────────────

interface EmptyStateProps {
  onStartPress: () => void;
}

function EmptyState({ onStartPress }: EmptyStateProps) {
  return (
    <View style={emptyStyles.container}>
      {/* Gradient logo */}
      <View style={emptyStyles.iconWrap}>
        <LinearGradient
          colors={['rgba(245,158,11,0.25)', 'rgba(245,158,11,0.06)']}
          style={emptyStyles.iconGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={emptyStyles.icon}>✈️</Text>
        </LinearGradient>
      </View>

      <Text style={emptyStyles.title}>Начни новое путешествие</Text>
      <Text style={emptyStyles.subtitle}>
        Нажми + чтобы поговорить с AI-ассистентом
      </Text>

      <TouchableOpacity
        style={emptyStyles.startBtn}
        onPress={onStartPress}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#F59E0B', '#D97706']}
          style={emptyStyles.startBtnGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={emptyStyles.startBtnText}>Начать планирование</Text>
        </LinearGradient>
      </TouchableOpacity>
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
  iconWrap: {
    marginBottom: 28,
  },
  iconGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  icon: {
    fontSize: 44,
  },
  title: {
    fontFamily: 'Sora',
    fontSize: 22,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    ...TextPresets.body,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 36,
    lineHeight: 24,
  },
  startBtn: {
    borderRadius: Radius.button,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  startBtnGradient: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: Radius.button,
    alignItems: 'center',
  },
  startBtnText: {
    fontFamily: 'Sora',
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textInverse,
    letterSpacing: 0.2,
  },
});

// ── Session card with swipe-to-delete ─────────────────────────────────────────

interface SessionItemProps {
  session: ChatSession;
  onPress: () => void;
  onDelete: () => void;
}

function SessionItem({ session, onPress, onDelete }: SessionItemProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 8 && Math.abs(gestureState.dy) < 20,
      onPanResponderGrant: () => {
        // Stop any running animation and snap to current value
        translateX.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        const currentOffset = isOpen.current ? -DELETE_BUTTON_WIDTH : 0;
        const newVal = currentOffset + gestureState.dx;
        // Clamp: only allow left swipe up to -DELETE_BUTTON_WIDTH, no right past 0
        const clamped = Math.max(-DELETE_BUTTON_WIDTH, Math.min(0, newVal));
        translateX.setValue(clamped);
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentOffset = isOpen.current ? -DELETE_BUTTON_WIDTH : 0;
        const projected = currentOffset + gestureState.dx;

        if (projected < -SWIPE_THRESHOLD) {
          // Open delete button
          isOpen.current = true;
          Animated.spring(translateX, {
            toValue: -DELETE_BUTTON_WIDTH,
            useNativeDriver: true,
            damping: 18,
            stiffness: 200,
          }).start();
        } else {
          // Close
          isOpen.current = false;
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            damping: 18,
            stiffness: 200,
          }).start();
        }
      },
    }),
  ).current;

  function handlePress() {
    if (isOpen.current) {
      // First tap closes the swipe
      isOpen.current = false;
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 200,
      }).start();
      return;
    }
    void Haptics.selectionAsync();
    onPress();
  }

  function handleDelete() {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    isOpen.current = false;
    Animated.timing(translateX, {
      toValue: -SCREEN_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      onDelete();
    });
  }

  return (
    <View style={itemStyles.outerWrap}>
      {/* Delete button revealed behind card */}
      <View style={itemStyles.deleteWrap}>
        <TouchableOpacity
          style={itemStyles.deleteBtn}
          onPress={handleDelete}
          activeOpacity={0.8}
        >
          <Text style={itemStyles.deleteBtnIcon}>🗑️</Text>
          <Text style={itemStyles.deleteBtnText}>Удалить</Text>
        </TouchableOpacity>
      </View>

      {/* Card itself */}
      <Animated.View
        style={[itemStyles.cardAnimated, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.85}
          style={itemStyles.card}
        >
          {/* Left icon */}
          <View style={itemStyles.iconCircle}>
            <Text style={itemStyles.iconEmoji}>✈️</Text>
          </View>

          {/* Content */}
          <View style={itemStyles.content}>
            <Text style={itemStyles.title} numberOfLines={1}>
              {session.title}
            </Text>
            <Text style={itemStyles.subtitle} numberOfLines={1}>
              {session.lastMessage ?? 'Нет сообщений'}
            </Text>
          </View>

          {/* Right: time + chevron */}
          <View style={itemStyles.rightCol}>
            <Text style={itemStyles.time}>{formatItemTime(session.updatedAt)}</Text>
            <Text style={itemStyles.chevron}>›</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const itemStyles = StyleSheet.create({
  outerWrap: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: Radius.card,
    overflow: 'hidden',
    position: 'relative',
  },
  deleteWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: DELETE_BUTTON_WIDTH,
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deleteBtnIcon: {
    fontSize: 18,
  },
  deleteBtnText: {
    ...TextPresets.label,
    color: '#fff',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  cardAnimated: {
    borderRadius: Radius.card,
    // Ensure background covers delete button while animating
    backgroundColor: Colors.card,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconEmoji: {
    fontSize: 22,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    lineHeight: 20,
  },
  subtitle: {
    ...TextPresets.caption,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 4,
    flexShrink: 0,
  },
  time: {
    ...TextPresets.label,
    color: Colors.textMuted,
    fontSize: 11,
  },
  chevron: {
    fontSize: 20,
    color: Colors.textMuted,
    lineHeight: 22,
    fontWeight: '300' as const,
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
    marginTop: 8,
    marginBottom: 12,
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
    <View style={{ paddingTop: 12 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonChatRow key={i} />
      ))}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ChatListScreen() {
  const { sessions, loadSessions, deleteSession, createSession } = useChatStore();
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const { unreadCount } = useNotificationsContext();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const userInitials = user?.name ? getInitials(user.name) : 'AI';

  const fetchSessions = useCallback(async () => {
    try {
      await loadSessions();
    } catch {
      // Silently fail — list will just be empty
    }
  }, [loadSessions]);

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

  async function handleNewChat() {
    if (isCreating) return;
    setIsCreating(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      analytics.track(Events.CHAT_OPENED, { source: 'fab' });
      const sessionId = await createSession();
      router.push(('/chat/' + sessionId) as never);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Не удалось создать чат. Попробуйте снова.';
      Alert.alert('Ошибка', msg);
    } finally {
      setIsCreating(false);
    }
  }

  function handleSessionPress(session: ChatSession) {
    router.push(('/chat/' + session.id) as never);
  }

  function handleSessionDelete(session: ChatSession) {
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

  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sessions ?? [];
    return (sessions ?? []).filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.lastMessage ?? '').toLowerCase().includes(q),
    );
  }, [sessions, searchQuery]);

  const hasAnySessions = (sessions ?? []).length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Custom header rendered inside the screen */}
      <CustomHeader
        onNotificationsPress={() => router.push('/notifications' as never)}
        userInitials={userInitials}
        userName={user?.name}
        unreadCount={unreadCount}
      />

      {isLoading ? (
        <SkeletonList />
      ) : (
        <>
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
                onDelete={() => handleSessionDelete(item)}
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
                <View style={styles.noResults}>
                  <Text style={styles.noResultsText}>
                    По запросу "{searchQuery}" ничего не найдено
                  </Text>
                </View>
              ) : (
                <EmptyState onStartPress={() => { void handleNewChat(); }} />
              )
            }
            contentContainerStyle={
              filteredSessions.length === 0 ? styles.emptyContainer : styles.listContent
            }
          />
        </>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, isCreating && styles.fabDisabled]}
        onPress={() => { void handleNewChat(); }}
        activeOpacity={0.85}
        disabled={isCreating}
      >
        {isCreating ? (
          <ActivityIndicator color={Colors.textInverse} size="small" />
        ) : (
          <Text style={styles.fabText}>+</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 100,
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
    width: 62,
    height: 62,
    borderRadius: Radius.fab,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    // Glow effect
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 20,
    elevation: 14,
    zIndex: 999,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
  },
  fabDisabled: {
    opacity: 0.6,
  },
  fabText: {
    color: Colors.textInverse,
    fontSize: Platform.select({ ios: 36, android: 30, default: 36 }),
    fontWeight: Typography.weights.regular,
    marginTop: Platform.select({ ios: -2, android: 0, default: -2 }),
    lineHeight: Platform.select({ ios: 40, android: 36, default: 40 }),
  },
});
