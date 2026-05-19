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
import { router } from 'expo-router';
import { useNotificationsContext } from '../../context/NotificationsContext';
import { useTheme } from '../../src/theme/ThemeContext';
import type { Colors as ColorsType } from '../../src/theme/colors';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { SkeletonNotificationItem } from '../../components/ui/Skeleton';
import type { AppNotification, NotificationType } from '../../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SWIPE_THRESHOLD = 60;
const DELETE_BTN_WIDTH = 80;

function getNotificationIconName(type: NotificationType): string {
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

function getNotificationIconColor(type: NotificationType, colors: ColorsType): string {
  switch (type) {
    case 'PRICE_ALERT':
      return colors.warning;
    case 'BOOKING_UPDATE':
      return colors.primary;
    case 'SYSTEM':
    default:
      return colors.textMuted;
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
  onPress: (notification: AppNotification) => void;
  onDelete: (id: string) => void;
  rowBg: string;
  textColor: string;
  subtextColor: string;
  surfaceBg: string;
  iconColor: string;
  trashColor: string;
  deleteBg: string;
  borderColor: string;
}

function SwipeableRow({
  notification,
  onPress,
  onDelete,
  rowBg,
  textColor,
  subtextColor,
  surfaceBg,
  iconColor,
  trashColor,
  deleteBg,
  borderColor,
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
    onPress(notification);
  }

  const iconName = getNotificationIconName(notification.type);

  return (
    <View style={[styles.swipeableContainer, { borderBottomColor: borderColor }]}>
      {/* Delete button behind the row */}
      <View style={[styles.deleteActionContainer, { backgroundColor: deleteBg }]}>
        <TouchableOpacity
          style={styles.deleteAction}
          onPress={() => onDelete(notification.id)}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 22, color: trashColor, lineHeight: 26  }}>{'🗑'}</Text>
        </TouchableOpacity>
      </View>

      {/* Sliding row */}
      <Animated.View
        style={[styles.animatedRow, { backgroundColor: rowBg, transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={[styles.row, { backgroundColor: notification.isRead ? rowBg : surfaceBg }]}
          onPress={handlePress}
          activeOpacity={0.75}
        >
          <View style={[styles.iconBadge, { backgroundColor: `${iconColor}20` }]}>
            <Text style={{ fontSize: 20, color: iconColor, lineHeight: 24  }}>{'•'}</Text>
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
              {!notification.isRead && <View style={[styles.unreadDot, { backgroundColor: iconColor }]} />}
            </View>

            <Text
              style={[styles.rowBody, { color: subtextColor }]}
              numberOfLines={2}
            >
              {notification.body}
            </Text>

            <Text style={[styles.rowTime, { color: subtextColor }]}>{formatRelativeDate(notification.createdAt)}</Text>
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
    const source = notifications;

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
    async (notification: AppNotification) => {
      await markRead(notification.id);
      const bookingId = notification.data?.bookingId;
      if (bookingId && typeof bookingId === 'string') {
        router.push(`/bookings/${bookingId}`);
      }
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

  // ── Empty state ────────────────────────────────────────────────────────

  if (!isLoading && notifications.length === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer, { backgroundColor: colors.background }]}>
        <Text style={{ fontSize: 56, color: colors.textSecondary, lineHeight: 60  }}>{'🔕'}</Text>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Уведомлений пока нет</Text>
      </View>
    );
  }

  // ── List ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {unreadCount > 0 && (
        <TouchableOpacity
          style={[styles.markAllBtn, { borderBottomColor: colors.border }]}
          onPress={markAllRead}
          activeOpacity={0.7}
        >
          <Text style={[styles.markAllText, { color: colors.primary }]}>
            Отметить все как прочитанные ({unreadCount})
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
                surfaceBg={colors.surface}
                iconColor={getNotificationIconColor(item.notification.type, colors)}
                trashColor={colors.textInverse}
                deleteBg={colors.error}
                borderColor={colors.border}
              />
            </Reanimated.View>
          );
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator color={colors.primary} />
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    textAlign: 'center',
  },
  markAllBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    alignItems: 'flex-end',
  },
  markAllText: {
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
    borderBottomColor: 'transparent', // tinted per-row via inline style below
  },
  deleteActionContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_BTN_WIDTH,
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
    flex: 1,
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
  },
  listContent: {
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
