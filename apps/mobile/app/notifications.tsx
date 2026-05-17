import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Typography } from '../constants/typography';

// ── Types ─────────────────────────────────────────────────────────────────────

type NotificationType = 'booking_confirmed' | 'price_drop' | 'flight_reminder' | 'welcome';

interface MockNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  timeLabel: string;
  isRead: boolean;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_NOTIFICATIONS: MockNotification[] = [
  {
    id: '1',
    type: 'booking_confirmed',
    title: 'Бронь подтверждена',
    body: 'Рейс WAW→BCN LO 100 на 31 мая. Электронный билет отправлен на email.',
    timeLabel: '5м',
    isRead: false,
  },
  {
    id: '2',
    type: 'price_drop',
    title: 'Цена упала!',
    body: 'Варшава → Барселона: €149 → €99. Успейте забронировать по выгодной цене.',
    timeLabel: '2ч',
    isRead: false,
  },
  {
    id: '3',
    type: 'flight_reminder',
    title: 'Вылет через 24 часа',
    body: 'Рейс LO 100, терминал 2. Регистрация открыта, онлайн-посадочный доступен.',
    timeLabel: '1д',
    isRead: false,
  },
  {
    id: '4',
    type: 'price_drop',
    title: 'Специальное предложение',
    body: 'Мадрид → Рим: €89. Билеты доступны только 48 часов.',
    timeLabel: '3д',
    isRead: true,
  },
  {
    id: '5',
    type: 'booking_confirmed',
    title: 'Бронь отеля подтверждена',
    body: 'Hotel Arts Barcelona, 31 мая – 5 июня. Номер с видом на море.',
    timeLabel: '5д',
    isRead: true,
  },
  {
    id: '6',
    type: 'flight_reminder',
    title: 'Онлайн-регистрация открыта',
    body: 'Рейс FR 1234 Варшава → Лондон, 10 июня. Зарегистрируйтесь заранее.',
    timeLabel: '1н',
    isRead: true,
  },
  {
    id: '7',
    type: 'welcome',
    title: 'Добро пожаловать в TravelAI',
    body: 'Планируйте путешествия с ИИ-ассистентом. Попробуйте спросить о рейсах в Барселону.',
    timeLabel: '2н',
    isRead: true,
  },
];

// ── Icon / color maps ─────────────────────────────────────────────────────────

const TYPE_EMOJI: Record<NotificationType, string> = {
  booking_confirmed: '🎉',
  price_drop: '💰',
  flight_reminder: '✈️',
  welcome: '👋',
};

const TYPE_COLOR: Record<NotificationType, string> = {
  booking_confirmed: Colors.success,
  price_drop: Colors.primary,
  flight_reminder: Colors.info,
  welcome: Colors.textMuted,
};

// ── Notification item ─────────────────────────────────────────────────────────

interface NotificationItemProps {
  item: MockNotification;
  onPress: (item: MockNotification) => void;
}

function NotificationItem({ item, onPress }: NotificationItemProps) {
  const accentColor = TYPE_COLOR[item.type];

  return (
    <TouchableOpacity
      style={[
        itemStyles.row,
        !item.isRead && itemStyles.rowUnread,
      ]}
      onPress={() => onPress(item)}
      activeOpacity={0.75}
    >
      {/* Unread dot */}
      <View style={itemStyles.dotWrap}>
        {!item.isRead && <View style={itemStyles.dot} />}
      </View>

      {/* Icon badge */}
      <View style={[itemStyles.iconBadge, { backgroundColor: `${accentColor}18` }]}>
        <Text style={itemStyles.emoji}>{TYPE_EMOJI[item.type]}</Text>
      </View>

      {/* Content */}
      <View style={itemStyles.content}>
        <View style={itemStyles.headerRow}>
          <Text
            style={[
              itemStyles.title,
              !item.isRead && itemStyles.titleUnread,
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={itemStyles.time}>{item.timeLabel}</Text>
        </View>
        <Text style={itemStyles.body} numberOfLines={2}>
          {item.body}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const itemStyles = StyleSheet.create({
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
  emoji: {
    fontSize: 20,
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

// ── Main screen ───────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<MockNotification[]>(MOCK_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  function handlePress(item: MockNotification) {
    // Mark as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
    );
    Alert.alert(item.title, item.body, [{ text: 'OK' }]);
  }

  function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

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
          <TouchableOpacity
            onPress={handleMarkAllRead}
            activeOpacity={0.7}
            style={styles.markAllBtn}
          >
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

      {notifications.length === 0 ? (
        <View style={[styles.container, styles.flex]}>
          <EmptyNotifications />
        </View>
      ) : (
        <FlatList
          style={styles.container}
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationItem item={item} onPress={handlePress} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
