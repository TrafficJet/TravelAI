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
import { Colors } from '../constants/colors';
import { Typography } from '../constants/typography';
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

// ── Icon / color maps ─────────────────────────────────────────────────────────

const TYPE_ICON: Record<NotificationType, string> = {
  BOOKING_CONFIRMED: 'checkmark-circle-outline',
  BOOKING_UPDATE: 'calendar-outline',
  PRICE_ALERT: 'trending-down-outline',
  SYSTEM: 'information-circle-outline',
};

const TYPE_COLOR: Record<NotificationType, string> = {
  BOOKING_CONFIRMED: Colors.success,
  BOOKING_UPDATE: Colors.info,
  PRICE_ALERT: Colors.primary,
  SYSTEM: Colors.textMuted,
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
  const accentColor = TYPE_COLOR[item.type] ?? Colors.textMuted;
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
      <View style={itemStyles.deleteHint}>
        <Ionicons name="trash-outline" size={22} color="#fff" />
        <Text style={itemStyles.deleteHintText}>Удалить</Text>
      </View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <TouchableOpacity
          style={[itemStyles.row, !item.isRead && itemStyles.rowUnread]}
          onPress={() => onPress(item)}
          activeOpacity={0.75}
        >
          {/* Unread dot */}
          <View style={itemStyles.dotWrap}>
            {!item.isRead && <View style={itemStyles.dot} />}
          </View>

          {/* Icon badge */}
          <View style={[itemStyles.iconBadge, { backgroundColor: `${accentColor}18` }]}>
            <Ionicons name={iconName as any} size={22} color={accentColor} />
          </View>

          {/* Content */}
          <View style={itemStyles.content}>
            <View style={itemStyles.headerRow}>
              <Text
                style={[itemStyles.title, !item.isRead && itemStyles.titleUnread]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text style={itemStyles.time}>{formatTimeLabel(item.createdAt)}</Text>
            </View>
            <Text style={itemStyles.body} numberOfLines={2}>
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
    backgroundColor: Colors.error,
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
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  rowUnread: {
    backgroundColor: Colors.surface,
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
    backgroundColor: Colors.primary,
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
    color: Colors.text,
    marginRight: 8,
  },
  titleUnread: {
    fontWeight: Typography.weights.bold,
  },
  time: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    flexShrink: 0,
  },
  body: {
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    lineHeight: Typography.sizes.sm * 1.5,
  },
});

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyNotifications() {
  return (
    <View style={emptyStyles.container}>
      <View style={emptyStyles.iconWrap}>
        <Ionicons name="notifications-off-outline" size={48} color={Colors.textMuted} />
      </View>
      <Text style={emptyStyles.title}>Нет уведомлений</Text>
      <Text style={emptyStyles.subtitle}>
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
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: Typography.sizes.sm * 1.6,
  },
});

// ── Error state ───────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={emptyStyles.container}>
      <View style={emptyStyles.iconWrap}>
        <Ionicons name="cloud-offline-outline" size={48} color={Colors.textMuted} />
      </View>
      <Text style={emptyStyles.title}>Не удалось загрузить</Text>
      <Text style={emptyStyles.subtitle}>Проверьте интернет-соединение и повторите попытку</Text>
      <TouchableOpacity style={errorStyles.retryBtn} onPress={onRetry} activeOpacity={0.8}>
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
    backgroundColor: Colors.primary,
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
    [],
  );

  return (
    <>
      <StatusBar barStyle="light-content" />

      {/* Custom header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Уведомления</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Все прочитаны</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerRight} />
        )}
      </View>

      {/* Unread count badge row */}
      {unreadCount > 0 && (
        <View style={styles.unreadBar}>
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
          </View>
          <Text style={styles.unreadBarText}>
            {unreadCount === 1 ? 'непрочитанное уведомление' : 'непрочитанных уведомления'}
          </Text>
        </View>
      )}

      {isLoading ? (
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : hasError ? (
        <View style={[styles.container, styles.flex]}>
          <ErrorState onRetry={() => void fetchNotifications()} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={[styles.container, styles.flex]}>
          <EmptyNotifications />
        </View>
      ) : (
        <FlatList
          style={styles.container}
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
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
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'android' ? 48 : 58,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
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
    color: Colors.primary,
  },
  unreadBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: `${Colors.primary}12`,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadBadgeText: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    lineHeight: 14,
  },
  unreadBarText: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary,
    fontWeight: Typography.weights.medium,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
});
