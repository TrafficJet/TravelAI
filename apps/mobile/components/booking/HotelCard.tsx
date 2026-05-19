import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '../../constants/typography';
import { useTheme } from '../../src/theme/ThemeContext';
import type { Booking, BookingStatus, HotelDetails } from '../../types';

interface Props {
  booking: Booking;
  onPress: () => void;
}

const STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: 'Ожидает',
  CONFIRMED: 'Подтверждено',
  CANCELLED: 'Отменено',
  FAILED: 'Ошибка',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
  });
}

function nightsCount(checkIn: string, checkOut: string): number {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export function HotelCard({ booking, onPress }: Props) {
  const { colors } = useTheme();
  const details = booking.details as HotelDetails;
  const STATUS_COLORS: Record<BookingStatus, string> = {
    PENDING: colors.warning,
    CONFIRMED: colors.success,
    CANCELLED: colors.error,
    FAILED: colors.error,
  };
  const statusColor = STATUS_COLORS[booking.status];
  const statusLabel = STATUS_LABELS[booking.status];
  const nights = nightsCount(details.checkIn, details.checkOut);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="bed-outline" size={16} color={colors.primary} />
          <Text style={[styles.stars, { color: colors.warning }]}>{'★'.repeat(details.stars)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      <Text style={[styles.hotelName, { color: colors.text }]}>{details.name}</Text>
      <Text style={[styles.address, { color: colors.textMuted }]}>{details.address}</Text>

      <View style={styles.datesRow}>
        <Text style={[styles.dates, { color: colors.text }]}>
          {formatDate(details.checkIn)} — {formatDate(details.checkOut)}
        </Text>
        <Text style={[styles.nights, { color: colors.textMuted }]}>{nights} ночей</Text>
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text style={[styles.guests, { color: colors.textMuted }]}>
          {details.rooms} ном. · {details.guests} гост.
        </Text>
        <Text style={[styles.price, { color: colors.primary }]}>
          {booking.totalPrice.toLocaleString('ru-RU')} {booking.currency}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stars: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  hotelName: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    marginBottom: 4,
  },
  address: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    marginBottom: 10,
  },
  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dates: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
  },
  nights: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  guests: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
  },
  price: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
});
