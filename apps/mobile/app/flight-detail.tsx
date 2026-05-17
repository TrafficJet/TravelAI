import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { Typography } from '../constants/typography';
import { toast } from '../lib/toast';
import { FavoriteButton } from '../components/ui/FavoriteButton';
import type { FlightOffer } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}ч ${m}мин` : `${m}мин`;
}

function StopsBadge({ stops }: { stops: number }) {
  const label =
    stops === 0 ? 'Прямой' : stops === 1 ? '1 пересадка' : `${stops} пересадки`;
  const color =
    stops === 0 ? Colors.success : stops === 1 ? Colors.warning : Colors.error;
  return (
    <View style={[badge.wrap, { backgroundColor: `${color}22` }]}>
      <View style={[badge.dot, { backgroundColor: color }]} />
      <Text style={[badge.text, { color }]}>{label}</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  text: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
});

// ── InfoRow ───────────────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={row.container}>
      <View style={row.iconWrap}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>
      <View style={row.content}>
        <Text style={row.label}>{label}</Text>
        <Text style={row.value}>{value}</Text>
      </View>
    </View>
  );
}

const row = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${Colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  label: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    marginBottom: 2,
  },
  value: {
    color: Colors.text,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
});

// ── Screen ────────────────────────────────────────────────────────────────────

export default function FlightDetailScreen() {
  const insets = useSafeAreaInsets();
  const raw = useLocalSearchParams();

  function str(v: string | string[] | undefined, fallback = ''): string {
    if (Array.isArray(v)) return v[0] ?? fallback;
    return v ?? fallback;
  }

  const origin = str(raw.origin);
  const destination = str(raw.destination);
  const departureDate = str(raw.departureDate);
  const departureTime = raw.departureTime ? str(raw.departureTime) : undefined;
  const arrivalTime = raw.arrivalTime ? str(raw.arrivalTime) : undefined;
  const airline = str(raw.airline);
  const flightNumber = str(raw.flightNumber);
  const cabin = str(raw.cabin);
  const stops = raw.stops ? str(raw.stops) : undefined;
  const durationMin = raw.durationMin ? str(raw.durationMin) : undefined;
  const price = str(raw.price);
  const currency = str(raw.currency, 'USD');
  const bookingId = raw.bookingId ? str(raw.bookingId) : undefined;

  const stopsNum = stops !== undefined ? parseInt(stops, 10) : 0;
  const durationNum = durationMin !== undefined ? parseInt(durationMin, 10) : undefined;
  const priceNum = price ? Number(price) : 0;
  const flightId = raw.flightId
    ? (Array.isArray(raw.flightId) ? raw.flightId[0] : raw.flightId)
    : `flight-${flightNumber}-${departureDate}`.replace(/\s+/g, '-');

  const formattedPrice = priceNum > 0
    ? `${priceNum.toLocaleString('ru-RU')} ${currency === 'USD' ? '$' : currency}`
    : price || '—';

  const flightForFavorite: FlightOffer = {
    id: flightId ?? `flight-${flightNumber}`,
    origin,
    destination,
    departureDate,
    airline,
    flightNumber,
    cabin,
    stops: stopsNum,
    durationMin: durationNum,
    price: priceNum,
    currency,
    departureTime: departureTime || undefined,
    arrivalTime: arrivalTime || undefined,
  };

  const handleBook = useCallback(() => {
    if (bookingId) {
      router.push(`/bookings/${bookingId}`);
    } else {
      toast.info('Для бронирования воспользуйтесь чатом с AI');
    }
  }, [bookingId]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `${origin} → ${destination}, ${formatDate(departureDate)}, от ${formattedPrice}`,
      });
    } catch {
      // dismissed
    }
  }, [origin, destination, departureDate, formattedPrice]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header — FadeIn */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Детали рейса</Text>
        <View style={styles.headerRight}>
          <FavoriteButton type="flight" item={flightForFavorite} size={22} />
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShare}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="share-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Route card — FadeIn (hero) */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.routeCard}>
          <View style={styles.routePoint}>
            <Text style={styles.airportCode}>{origin}</Text>
            {departureTime ? (
              <Text style={styles.time}>{departureTime}</Text>
            ) : null}
            <Text style={styles.dateText}>{formatDate(departureDate)}</Text>
          </View>

          <View style={styles.routeMiddle}>
            {durationNum !== undefined && (
              <Text style={styles.durationText}>{formatDuration(durationNum)}</Text>
            )}
            <View style={styles.routeLine}>
              <View style={styles.routeDot} />
              <View style={styles.routeDash} />
              <Ionicons name="airplane" size={20} color={Colors.primary} />
              <View style={styles.routeDash} />
              <View style={styles.routeDot} />
            </View>
            <StopsBadge stops={stopsNum} />
          </View>

          <View style={[styles.routePoint, styles.routePointRight]}>
            <Text style={styles.airportCode}>{destination}</Text>
            {arrivalTime ? (
              <Text style={styles.time}>{arrivalTime}</Text>
            ) : null}
          </View>
        </Animated.View>

        {/* Flight details section — FadeInUp delay 80 */}
        <Animated.View entering={FadeInUp.delay(80).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Детали рейса</Text>
          {airline ? (
            <InfoRow icon="business" label="Авиакомпания" value={airline} />
          ) : null}
          {flightNumber ? (
            <InfoRow icon="barcode-outline" label="Номер рейса" value={flightNumber} />
          ) : null}
          {cabin ? (
            <InfoRow
              icon="star-outline"
              label="Класс"
              value={
                cabin === 'economy'
                  ? 'Эконом'
                  : cabin === 'business'
                  ? 'Бизнес'
                  : cabin === 'first'
                  ? 'Первый'
                  : cabin
              }
            />
          ) : null}
          {departureDate ? (
            <InfoRow icon="calendar-outline" label="Дата вылета" value={formatDate(departureDate)} />
          ) : null}
          {departureTime ? (
            <InfoRow icon="time-outline" label="Время вылета" value={departureTime} />
          ) : null}
          {arrivalTime ? (
            <InfoRow icon="time-outline" label="Время прилёта" value={arrivalTime} />
          ) : null}
        </Animated.View>
      </ScrollView>

      {/* Book button — FadeInUp delay 160 */}
      <Animated.View
        entering={FadeInUp.delay(160).springify()}
        style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}
      >
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Цена</Text>
          <Text style={styles.priceValue}>{formattedPrice}</Text>
        </View>
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={handleBook}
          activeOpacity={0.85}
        >
          <Text style={styles.bookBtnText}>Забронировать</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shareBtn: {
    padding: 4,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 20,
  },
  // Route card
  routeCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routePoint: {
    flex: 1,
    gap: 4,
  },
  routePointRight: {
    alignItems: 'flex-end',
  },
  airportCode: {
    color: Colors.text,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.extrabold,
    letterSpacing: 1,
  },
  time: {
    color: Colors.text,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
  },
  dateText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
  },
  routeMiddle: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  durationText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  routeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  routeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  routeDash: {
    height: 1,
    width: 14,
    backgroundColor: Colors.border,
  },
  // Section
  section: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingVertical: 12,
  },
  // Footer
  footer: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
  },
  priceValue: {
    color: Colors.text,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.extrabold,
  },
  bookBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  bookBtnText: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
});
