import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Animated,
  PanResponder,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationsContext } from '../../context/NotificationsContext';
import { useTheme } from '../../src/theme/ThemeContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { SkeletonNotificationItem } from '../../components/ui/Skeleton';
import type { AppNotification, NotificationType } from '../../types';

// ── Mock notifications (shown when the list is empty after load) ───────────────

const now = new Date();
function hoursAgo(h: number): string {
  return new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();
}
function daysAgo(d: number): string {
  return new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();
}

const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'mock-1',
    type: 'BOOKING_UPDATE',
    title: 'Рейс WAW→BCN подтверждён',
    body: 'Ваш рейс Варшава — Барселона успешно подтверждён. Вылет в 10:25.',
    isRead: false,
    createdAt: hoursAgo(1),
  },
  {
    id: 'mock-2',
    type: 'PRICE_ALERT',
    title: 'Новые рейсы от €49 в Барселону',
    body: 'Найдены дешёвые рейсы из Варшавы в Барселону. Успей купить!',
    isRead: false,
    createdAt: hoursAgo(3),
  },
  {
    id: 'mock-3',
    type: 'SYSTEM',
    title: 'Специальное предложение: Hotel Arts',
    body: 'Hotel Arts Barcelona — от €140 за ночь. Ограниченное предложение.',
    isRead: true,
    createdAt: daysAgo(1),
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const SWIPE_THRESHOLD = 60;
const DELETE_BTN_WIDTH = 80;

function getNotificationIconName(type: NotificationType): React.ComponentProps<typeof Ionicons>['name'] {
  switch (type) {
    case 'PRICE_ALERT':
      return 'pricetag';
    case 'BOOKING_UPDATE':
      return 'airplane';
    case 'SYSTEM':
    default:
      return 'notifications';
  }
}

function getNotificationIconColor(type: NotificationType): string {
  switch (type) {
    case 'PRICE_ALERT':
      return Colors.warning;
    case 'BOOKING_UPDATE':
      return Colors.primary;
    case 'SYSTEM':
    default:
      return Colors.textMuted;
  }
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return 'Только что';
  if (diffMins < 60) return `${diffMins} мин. назад`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} ч. назад`;

  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

type DateGroup = 'today' | 'yesterday' | 'earlier';

function getDateGroup(dateStr: string): DateGroup {
  const date = new Date(dateStr);
  const now = new Date();

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, now)) return 'today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return 'yesterday';

  return 'earlier';
}

const GROUP_LABELS: Record<DateGroup, string> = {
  today: 'Сегодня',
  yesterday: 'Вчера',
  earlier: 'Ранее',
};

// ── List item types ───────────────────────────────────────────────────────────

type ListRow =
  | { kind: 'header'; group: DateGroup }
  | { kind: 'item'; notification: AppNotification; itemIndex: number };

// ── SwipeableRow ──────────────────────────────────────────────────────────────

interface SwipeableRowProps {
  notification: AppNotification;
  onPress: (id: string) => void;
  onDelete: (id: string) => void;
  rowBg: string;
  textColor: string;
  subtextColor: string;
}

function SwipeableRow({
  notification,
  onPress,
  onDelete,
  rowBg,
  textColor,
  subtextColor,
}: SwipeableRowProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [deleteVisible, setDeleteVisible] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gestureState) =>
        Math.abs(gestureState.dx) > 5 && Math.abs(gestureState.dy) < 20,
      onPanResponderMove: (_evt, gestureState) => {
        const dx = Math.min(0, gestureState.dx); // only allow left swipe
        translateX.setValue(dx);
        setDeleteVisible(dx < -10);
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dx < -SWIPE_THRESHOLD) {
          // Snap open to reveal delete button
          Animated.spring(translateX, {
            toValue: -DELETE_BTN_WIDTH,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
          setDeleteVisible(true);
        } else {
          // Snap back
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
          setDeleteVisible(false);
        }
      },
    }),
  ).current;

  function closeRow() {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    setDeleteVisible(false);
  }

  function handlePress() {
    if (deleteVisible) {
      closeRow();
      return;
    }
    onPress(notification.id);
  }

  const iconName = getNotificationIconName(notification.type);
  const iconColor = getNotificationIconColor(notification.type);

  return (
    <View style={styles.swipeableContainer}>
      {/* Delete button behind the row */}
      <View style={styles.deleteActionContainer}>
        <TouchableOpacity
          style={styles.deleteAction}
          onPress={() => onDelete(notification.id)}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Sliding row */}
      <Animated.View
        style={[styles.animatedRow, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={[styles.row, { backgroundColor: notification.isRead ? rowBg : Colors.surface }]}
          onPress={handlePress}
          activeOpacity={0.75}
        >
          <View style={[styles.iconBadge, { backgroundColor: `${iconColor}20` }]}>
            <Ionicons name={iconName} size={20} color={iconColor} />
          </View>

          <View style={styles.rowContent}>
            <View style={styles.rowHeader}>
              <Text
                style={[
                  styles.rowTitle,
                  { color: textColor },
                  !notification.isRead && styles.rowTitleUnread,
                ]}
                numberOfLines={1}
              >
                {notification.title}
              </Text>
              {!notification.isRead && <View style={styles.unreadDot} />}
            </View>

            <Text
              style={[styles.rowBody, { color: subtextColor }]}
              numberOfLines={2}
            >
              {notification.body}
            </Text>

            <Text style={styles.rowTime}>{formatRelativeDate(notification.createdAt)}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const {
    notifications,
    unreadCount,
    isLoading,
    isLoadingMore,
    hasMore,
    fetchNotifications,
    fetchNextPage,
    markRead,
    markAllRead,
    deleteNotification,
  } = useNotificationsContext();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchNotifications();
    setIsRefreshing(false);
  }, [fetchNotifications]);

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;
    await fetchNextPage();
  }, [hasMore, isLoadingMore, fetchNextPage]);
  const { colors } = useTheme();

  // Build grouped list rows with per-item indices for staggered animation
  const listData = useMemo<ListRow[]>(() => {
    const source = !isLoading && notifications.length === 0
      ? MOCK_NOTIFICATIONS
      : notifications;

    const groups: Record<DateGroup, AppNotification[]> = {
      today: [],
      yesterday: [],
      earlier: [],
    };

    for (const n of source) {
      groups[getDateGroup(n.createdAt)].push(n);
    }

    const ORDER: DateGroup[] = ['today', 'yesterday', 'earlier'];
    const rows: ListRow[] = [];
    let itemIndex = 0;

    for (const group of ORDER) {
      const items = groups[group];
      if (items.length === 0) continue;
      rows.push({ kind: 'header', group });
      for (const n of items) {
        rows.push({ kind: 'item', notification: n, itemIndex });
        itemIndex += 1;
      }
    }

    return rows;
  }, [notifications, isLoading]);

  const handlePress = useCallback(
    async (id: string) => {
      await markRead(id);
    },
    [markRead],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteNotification(id);
    },
    [deleteNotification],
  );

  // ── Skeleton ────────────────────────────────────────────────────────────

  if (isLoading && notifications.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonNotificationItem key={i} />
        ))}
      </View>
    );
  }

  // ── Resolve unread count for header button ────────────────────────────────

  const isMockMode = !isLoading && notifications.length === 0;
  const effectiveUnreadCount = isMockMode
    ? MOCK_NOTIFICATIONS.filter((n) => !n.isRead).length
    : unreadCount;

  // ── List ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {effectiveUnreadCount > 0 && (
        <TouchableOpacity
          style={[styles.markAllBtn, { borderBottomColor: colors.border }]}
          onPress={!isMockMode ? markAllRead : undefined}
          activeOpacity={0.7}
        >
          <Text style={styles.markAllText}>
            Отметить все как прочитанные ({effectiveUnreadCount})
          </Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={listData}
        keyExtractor={(item) =>
          item.kind === 'header' ? `header-${item.group}` : item.notification.id
        }
        renderItem={({ item }) => {
          if (item.kind === 'header') {
            return (
              <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
                <Text style={[styles.sectionHeaderText, { color: colors.textSecondary }]}>
                  {GROUP_LABELS[item.group]}
                </Text>
              </View>
            );
          }

          return (
            <Reanimated.View
              entering={FadeInDown.delay(Math.min(item.itemIndex * 80, 400)).springify()}
            >
              <SwipeableRow
                notification={item.notification}
                onPress={handlePress}
                onDelete={handleDelete}
                rowBg={colors.background}
                textColor={colors.text}
                subtextColor={colors.textSecondary}
              />
            </Reanimated.View>
          );
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  markAllBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    alignItems: 'flex-end',
  },
  markAllText: {
    color: Colors.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  sectionHeaderText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
  },
  // Swipeable structure
  swipeableContainer: {
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  deleteActionContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_BTN_WIDTH,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteAction: {
    flex: 1,
    width: DELETE_BTN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animatedRow: {
    backgroundColor: Colors.background,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  rowContent: {
    flex: 1,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  rowTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    flex: 1,
  },
  rowTitleUnread: {
    fontWeight: Typography.weights.bold,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: 6,
    flexShrink: 0,
  },
  rowBody: {
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.sizes.sm * Typography.lineHeights.normal,
    marginBottom: Spacing.xs,
  },
  rowTime: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
  },
  listContent: {
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
