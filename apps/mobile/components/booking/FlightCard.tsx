import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import type { Booking, BookingStatus, FlightDetails } from '../../types';

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

// Deterministic colour from airline IATA code
const IATA_PALETTE = [
  '#6366F1', '#0EA5E9', '#10B981', '#F59E0B',
  '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6',
];

function iataColor(code: string): string {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = (hash * 31 + code.charCodeAt(i)) & 0xffffffff;
  }
  return IATA_PALETTE[Math.abs(hash) % IATA_PALETTE.length];
}

function AirlineLogo({ code }: { code: string }) {
  const letters = code.slice(0, 2).toUpperCase();
  const bg = iataColor(code);
  return (
    <View style={[logoStyles.wrap, { backgroundColor: bg }]}>
      <Text style={logoStyles.letters}>{letters}</Text>
    </View>
  );
}

const logoStyles = StyleSheet.create({
  wrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letters: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.5,
  },
});

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}ч ${m}мин` : `${m}мин`;
}

/**
 * Parse ISO 8601 duration string (e.g. "PT2H30M") into minutes.
 * Returns null if the string doesn't match the expected format.
 */
function parseIsoDuration(iso: string): number | null {
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/);
  if (!match) return null;
  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const mins = match[2] ? parseInt(match[2], 10) : 0;
  return hours * 60 + mins;
}

function StopsBadge({ stops }: { stops: number }) {
  const label =
    stops === 0 ? 'Прямой' : stops === 1 ? '1 пересадка' : `${stops} пересадки`;
  const color = stops === 0 ? Colors.success : stops === 1 ? Colors.warning : Colors.error;

  return (
    <View style={[stopStyles.wrap, { backgroundColor: `${color}22` }]}>
      <Text style={[stopStyles.text, { color }]}>{label}</Text>
    </View>
  );
}

const stopStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export function FlightCard({ booking, onPress }: Props) {
  const details = booking.details as FlightDetails;
  const statusColor = STATUS_COLORS[booking.status];
  const statusLabel = STATUS_LABELS[booking.status];

  // Derive stops: booking.details may carry stops field from search result
  const stops = (details as FlightDetails & { stops?: number }).stops ?? 0;

  // Support both numeric minutes and ISO 8601 duration string (e.g. "PT2H30M")
  const rawDuration = (details as FlightDetails & { durationMin?: number; duration?: string }).durationMin
    ?? (() => {
      const iso = (details as FlightDetails & { duration?: string }).duration;
      if (iso) return parseIsoDuration(iso) ?? undefined;
      return undefined;
    })();
  const durationMin = rawDuration;

  const scaleAnim = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      damping: 20,
      stiffness: 300,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 20,
      stiffness: 300,
    }).start();
  }

  async function handleShare() {
    try {
      const price =
        typeof booking.totalPrice === 'number'
          ? booking.totalPrice.toLocaleString('ru-RU')
          : Number(booking.totalPrice).toLocaleString('ru-RU');
      await Share.share({
        message:
          `${details.origin} → ${details.destination}, ${formatDate(details.departureDate)}, от $${price}`,
      });
    } catch {
      // Share dialog dismissed or error — no visible feedback needed
    }
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.card}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <AirlineLogo code={details.flightNumber.slice(0, 2) || details.airline.slice(0, 2)} />
            <View style={styles.headerInfo}>
              <Text style={styles.airline}>{details.airline}</Text>
              <Text style={styles.flightNum}>{details.flightNumber}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
              <Ionicons name="share-outline" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>
        </View>

        {/* Route */}
        <View style={styles.routeRow}>
          <View style={styles.routePoint}>
            <Text style={styles.city}>{details.origin}</Text>
            <Text style={styles.date}>{formatDate(details.departureDate)}</Text>
          </View>

          <View style={styles.routeCenter}>
            <Ionicons name="airplane" size={18} color={Colors.primary} />
            {durationMin !== undefined && (
              <Text style={styles.duration}>{formatDuration(durationMin)}</Text>
            )}
          </View>

          <View style={[styles.routePoint, styles.routePointRight]}>
            <Text style={styles.city}>{details.destination}</Text>
            {details.returnDate && (
              <Text style={styles.date}>обр. {formatDate(details.returnDate)}</Text>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <StopsBadge stops={stops} />
          <Text style={styles.price}>
            {booking.totalPrice.toLocaleString('ru-RU')} {booking.currency}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
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
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerInfo: {
    gap: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  airline: {
    color: Colors.text,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  flightNum: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
  },
  shareBtn: {
    padding: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  routePoint: {
    flex: 1,
  },
  routePointRight: {
    alignItems: 'flex-end',
  },
  routeCenter: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  city: {
    color: Colors.text,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  date: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  duration: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  price: {
    color: Colors.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
});
