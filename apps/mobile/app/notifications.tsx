import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Animated,
  PanResponder,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '../constants/typography';
import { useTheme } from '../src/theme/ThemeContext';
import api from '../services/api';
import { useFocusEffect } from 'expo-router';
import { toast } from '../lib/toast';

// ── Types ─────────────────────────────────────────────────────────────────────

type NotificationType = 'PRICE_ALERT' | 'BOOKING_UPDATE' | 'BOOKING_CONFIRMED' | 'SYSTEM';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

// ── Icon map ──────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<NotificationType, string> = {
  BOOKING_CONFIRMED: 'checkmark-circle-outline',
  BOOKING_UPDATE: 'calendar-outline',
  PRICE_ALERT: 'trending-down-outline',
  SYSTEM: 'information-circle-outline',
};

// ── Time formatting ───────────────────────────────────────────────────────────

function formatTimeLabel(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes}м`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}ч`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}д`;
  const weeks = Math.floor(days / 7);
  return `${weeks}н`;
}

// ── Swipeable notification item ───────────────────────────────────────────────

interface NotificationItemProps {
  item: Notification;
  onPress: (item: Notification) => void;
  onDelete: (item: Notification) => void;
}

function NotificationItem({ item, onPress, onDelete }: NotificationItemProps) {
  const { colors } = useTheme();

  // Colors by notification type, using theme
  const TYPE_COLOR: Record<NotificationType, string> = {
    BOOKING_CONFIRMED: colors.success,
    BOOKING_UPDATE: colors.primary,
    PRICE_ALERT: colors.primary,
    SYSTEM: colors.textMuted,
  };

  const accentColor = TYPE_COLOR[item.type] ?? colors.textMuted;
  const iconName = TYPE_ICON[item.type] ?? 'notifications-outline';
  const translateX = useRef(new Animated.Value(0)).current;
  const deleteThreshold = -80;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dy) < 20,
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) {
          translateX.setValue(g.dx);
        }
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < deleteThreshold) {
          Animated.timing(translateX, {
            toValue: -400,
            duration: 200,
            useNativeDriver: true,
          }).start(() => onDelete(item));
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        }
      },
    }),
  ).current;

  return (
    <View style={itemStyles.wrapper}>
      {/* Delete hint behind the item */}
      <View style={[itemStyles.deleteHint, { backgroundColor: colors.error }]}>
        <Ionicons name="trash-outline" size={22} color="#fff" />
        <Text style={itemStyles.deleteHintText}>Удалить</Text>
      </View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <TouchableOpacity
          style={[
            itemStyles.row,
            { borderBottomColor: colors.border, backgroundColor: colors.background },
            !item.isRead && { backgroundColor: colors.surface },
          ]}
          onPress={() => onPress(item)}
          activeOpacity={0.75}
        >
          {/* Unread dot */}
          <View style={itemStyles.dotWrap}>
            {!item.isRead && <View style={[itemStyles.dot, { backgroundColor: colors.primary }]} />}
          </View>

          {/* Icon badge */}
          <View style={[itemStyles.iconBadge, { backgroundColor: `${accentColor}18` }]}>
            <Ionicons name={iconName as any} size={22} color={accentColor} />
          </View>

          {/* Content */}
          <View style={itemStyles.content}>
            <View style={itemStyles.headerRow}>
              <Text
                style={[
                  itemStyles.title,
                  { color: colors.text },
                  !item.isRead && { fontWeight: Typography.weights.bold },
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text style={[itemStyles.time, { color: colors.textMuted }]}>{formatTimeLabel(item.createdAt)}</Text>
            </View>
            <Text style={[itemStyles.body, { color: colors.textMuted }]} numberOfLines={2}>
              {item.body}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const itemStyles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    overflow: 'hidden',
  },
  deleteHint: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deleteHintText: {
    color: '#fff',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingRight: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dotWrap: {
    width: 20,
    alignItems: 'center',
    paddingTop: 7,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  title: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    marginRight: 8,
  },
  time: {
    fontSize: Typography.sizes.xs,
    flexShrink: 0,
  },
  body: {
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.sizes.sm * 1.5,
  },
});

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyNotifications() {
  const { colors } = useTheme();
  return (
    <View style={emptyStyles.container}>
      <View style={[emptyStyles.iconWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="notifications-off-outline" size={48} color={colors.textMuted} />
      </View>
      <Text style={[emptyStyles.title, { color: colors.text }]}>Нет уведомлений</Text>
      <Text style={[emptyStyles.subtitle, { color: colors.textMuted }]}>
        Здесь появятся уведомления об изменении цен и статусов бронирований
      </Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    lineHeight: Typography.sizes.sm * 1.6,
  },
});

// ── Error state ───────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={emptyStyles.container}>
      <View style={[emptyStyles.iconWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
      </View>
      <Text style={[emptyStyles.title, { color: colors.text }]}>Не удалось загрузить</Text>
      <Text style={[emptyStyles.subtitle, { color: colors.textMuted }]}>Проверьте интернет-соединение и повторите попытку</Text>
      <TouchableOpacity
        style={[errorStyles.retryBtn, { backgroundColor: colors.primary }]}
        onPress={onRetry}
        activeOpacity={0.8}
      >
        <Ionicons name="refresh-outline" size={16} color="#fff" />
        <Text style={errorStyles.retryText}>Повторить</Text>
      </TouchableOpacity>
    </View>
  );
}

const errorStyles = StyleSheet.create({
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 16,
  },
  retryText: {
    color: '#fff',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  async function fetchNotifications(silent = false) {
    if (!silent) {
      setIsLoading(true);
      setHasError(false);
    }
    try {
      const res = await api.get<{ data: Notification[]; meta: { total: number } }>(
        '/notifications?page=1&limit=20',
      );
      setNotifications(res.data.data);
      setHasError(false);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      void fetchNotifications();
    }, []),
  );

  async function handlePress(item: Notification) {
    if (!item.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
      );
      try {
        await api.patch(`/notifications/${item.id}/read`);
      } catch {
        // revert on error
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: false } : n)),
        );
        toast.error('Не удалось отметить как прочитанное');
      }
    }
  }

  async function handleMarkAllRead() {
    const prev = notifications;
    setNotifications((list) => list.map((n) => ({ ...n, isRead: true })));
    try {
      await api.patch('/notifications/read-all');
      toast.success('Все уведомления прочитаны');
    } catch {
      setNotifications(prev);
      toast.error('Не удалось выполнить действие');
    }
  }

  async function handleDelete(item: Notification) {
    setNotifications((prev) => prev.filter((n) => n.id !== item.id));
    try {
      await api.delete(`/notifications/${item.id}`);
    } catch {
      setNotifications((prev) => [item, ...prev]);
      toast.error('Не удалось удалить уведомление');
    }
  }

  function handleRefresh() {
    setIsRefreshing(true);
    void fetchNotifications(true);
  }

  const renderItem = useCallback(
    ({ item }: { item: Notification }) => (
      <NotificationItem item={item} onPress={handlePress} onDelete={handleDelete} />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors],
  );

  return (
    <>
      <StatusBar barStyle="light-content" />

      {/* Custom header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Уведомления</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7} style={styles.markAllBtn}>
            <Text style={[styles.markAllText, { color: colors.primary }]}>Все прочитаны</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerRight} />
        )}
      </View>

      {/* Unread count badge row */}
      {unreadCount > 0 && (
        <View style={[styles.unreadBar, { backgroundColor: `${colors.primary}12`, borderBottomColor: colors.border }]}>
          <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
          </View>
          <Text style={[styles.unreadBarText, { color: colors.primary }]}>
            {unreadCount === 1 ? 'непрочитанное уведомление' : 'непрочитанных уведомления'}
          </Text>
        </View>
      )}

      {isLoading ? (
        <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : hasError ? (
        <View style={[styles.container, styles.flex, { backgroundColor: colors.background }]}>
          <ErrorState onRetry={() => void fetchNotifications()} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={[styles.container, styles.flex, { backgroundColor: colors.background }]}>
          <EmptyNotifications />
        </View>
      ) : (
        <FlatList
          style={[styles.container, { backgroundColor: colors.background }]}
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 48 : 58,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  headerRight: {
    width: 80,
  },
  markAllBtn: {
    paddingVertical: 4,
    paddingLeft: 8,
    minWidth: 80,
    alignItems: 'flex-end',
  },
  markAllText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  unreadBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    lineHeight: 14,
  },
  unreadBarText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
});
