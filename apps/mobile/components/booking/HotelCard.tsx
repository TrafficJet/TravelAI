import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
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

const STATUS_COLORS: Record<BookingStatus, string> = {
  PENDING: Colors.warning,
  CONFIRMED: Colors.success,
  CANCELLED: Colors.error,
  FAILED: Colors.error,
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
  const details = booking.details as HotelDetails;
  const statusColor = STATUS_COLORS[booking.status];
  const statusLabel = STATUS_LABELS[booking.status];
  const nights = nightsCount(details.checkIn, details.checkOut);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.typeIcon}>🏨</Text>
          <Text style={styles.stars}>{'★'.repeat(details.stars)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      <Text style={styles.hotelName}>{details.name}</Text>
      <Text style={styles.address}>{details.address}</Text>

      <View style={styles.datesRow}>
        <Text style={styles.dates}>
          {formatDate(details.checkIn)} — {formatDate(details.checkOut)}
        </Text>
        <Text style={styles.nights}>{nights} ночей</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.guests}>
          {details.rooms} ном. · {details.guests} гост.
        </Text>
        <Text style={styles.price}>
          {booking.totalPrice.toLocaleString('ru-RU')} {booking.currency}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
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
  typeIcon: {
    fontSize: 20,
  },
  stars: {
    color: Colors.warning,
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
    color: Colors.text,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    marginBottom: 4,
  },
  address: {
    color: Colors.textMuted,
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
    color: Colors.text,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
  },
  nights: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  guests: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
  },
  price: {
    color: Colors.primary,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
});
