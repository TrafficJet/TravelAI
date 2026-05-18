import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

// ── StopsBadge ────────────────────────────────────────────────────────────────

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
    alignSelf: 'center',
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
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
});

// ── InfoCard ──────────────────────────────────────────────────────────────────

function InfoCard({
  icon,
  title,
  rows,
}: {
  icon: string;
  title: string;
  rows: { label: string; value: string; valueColor?: string; valueLarge?: boolean }[];
}) {
  return (
    <View style={card.wrap}>
      <View style={card.header}>
        <Text style={card.icon}>{icon}</Text>
        <Text style={card.title}>{title}</Text>
      </View>
      {rows.map((r, i) => (
        <View
          key={i}
          style={[card.row, i < rows.length - 1 && card.rowDivider]}
        >
          <Text style={card.label}>{r.label}</Text>
          <Text
            style={[
              card.value,
              r.valueColor ? { color: r.valueColor } : undefined,
              r.valueLarge ? card.valueLarge : undefined,
            ]}
          >
            {r.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const card = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  icon: {
    fontSize: 18,
  },
  title: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  label: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
  },
  value: {
    color: Colors.text,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  valueLarge: {
    fontFamily: 'Sora',
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.extrabold,
    color: Colors.primary,
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

  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency;
  const formattedPrice = priceNum > 0
    ? `${currencySymbol}${priceNum.toLocaleString('ru-RU')}`
    : price || '—';

  const cabinLabel =
    cabin === 'economy' ? 'Эконом'
    : cabin === 'business' ? 'Бизнес'
    : cabin === 'first' ? 'Первый'
    : cabin || '—';

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
    <View style={styles.container}>
      {/* ── Hero Section ─────────────────────────────────────────────────────── */}
      <View style={styles.heroWrapper}>
        <LinearGradient
          colors={['#0A0A14', '#1A1008', `${Colors.primary}28`]}
          locations={[0, 0.45, 1]}
          style={[styles.heroGradient, { paddingTop: insets.top }]}
        >
          {/* Top bar */}
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

          {/* Route hero title */}
          <Animated.View entering={FadeIn.duration(500)} style={styles.heroContent}>
            <Text style={styles.heroRoute}>
              {origin || '???'} → {destination || '???'}
            </Text>
            {(airline || flightNumber) ? (
              <Text style={styles.heroSub}>
                {[airline, flightNumber].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
          </Animated.View>
        </LinearGradient>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Flight timeline card ──────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(60).springify()} style={styles.timelineCard}>
          {/* Times row */}
          <View style={styles.timeRow}>
            <View style={styles.timeBlock}>
              <Text style={styles.timeValue}>{departureTime ?? '--:--'}</Text>
              <Text style={styles.timeAirport}>{origin || '???'}</Text>
            </View>

            <View style={styles.timeCenter}>
              {durationNum !== undefined && (
                <Text style={styles.durationLabel}>{formatDuration(durationNum)}</Text>
              )}
              {/* Line with plane */}
              <View style={styles.flightLine}>
                <View style={styles.flightLineDash} />
                <Text style={styles.planeIcon}>✈</Text>
                <View style={styles.flightLineDash} />
              </View>
              <StopsBadge stops={stopsNum} />
            </View>

            <View style={[styles.timeBlock, styles.timeBlockRight]}>
              <Text style={styles.timeValue}>{arrivalTime ?? '--:--'}</Text>
              <Text style={styles.timeAirport}>{destination || '???'}</Text>
            </View>
          </View>

          {/* City names row */}
          <View style={styles.cityRow}>
            <Text style={styles.cityName} numberOfLines={1}>
              {origin}
            </Text>
            <Text style={[styles.cityName, styles.cityNameRight]} numberOfLines={1}>
              {destination}
            </Text>
          </View>

          {departureDate ? (
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.dateText}>{formatDate(departureDate)}</Text>
            </View>
          ) : null}
        </Animated.View>

        {/* ── Flight info card ──────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(120).springify()}>
          <InfoCard
            icon="✈️"
            title="Рейс"
            rows={[
              { label: 'Авиакомпания', value: airline || '—' },
              { label: 'Номер рейса', value: flightNumber || '—' },
              { label: 'Класс', value: cabinLabel },
            ]}
          />
        </Animated.View>

        {/* ── Date & time card ──────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(180).springify()}>
          <InfoCard
            icon="📅"
            title="Дата и время"
            rows={[
              { label: 'Дата вылета', value: departureDate ? formatDate(departureDate) : '—' },
              { label: 'Вылет', value: departureTime ?? '—' },
              { label: 'Прилёт', value: arrivalTime ?? '—' },
              ...(durationNum !== undefined
                ? [{ label: 'Время в пути', value: formatDuration(durationNum) }]
                : []),
            ]}
          />
        </Animated.View>

        {/* ── Included services card ───────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(240).springify()} style={includedCard.wrap}>
          <Text style={includedCard.title}>ВКЛЮЧЕНО В РЕЙС</Text>
          <View style={includedCard.grid}>
            <View style={includedCard.item}>
              <View style={includedCard.iconCircle}>
                <Text style={includedCard.iconEmoji}>🎒</Text>
              </View>
              <Text style={includedCard.itemLabel}>Ручная{'\n'}кладь</Text>
              <Text style={includedCard.itemValue}>1 × 10 кг</Text>
            </View>
            <View style={includedCard.item}>
              <View style={includedCard.iconCircle}>
                <Text style={includedCard.iconEmoji}>🧳</Text>
              </View>
              <Text style={includedCard.itemLabel}>Багаж{'\n'}в салон</Text>
              <Text style={includedCard.itemValue}>{cabinLabel === 'Эконом' ? '1 × 23 кг' : '2 × 32 кг'}</Text>
            </View>
            <View style={includedCard.item}>
              <View style={includedCard.iconCircle}>
                <Text style={includedCard.iconEmoji}>🍽️</Text>
              </View>
              <Text style={includedCard.itemLabel}>Питание{'\n'}на борту</Text>
              <Text style={includedCard.itemValue}>{cabinLabel === 'Эконом' ? 'Снеки' : 'Меню'}</Text>
            </View>
            <View style={includedCard.item}>
              <View style={includedCard.iconCircle}>
                <Text style={includedCard.iconEmoji}>💺</Text>
              </View>
              <Text style={includedCard.itemLabel}>Выбор{'\n'}места</Text>
              <Text style={includedCard.itemValue}>{cabinLabel === 'Эконом' ? 'Платно' : 'Бесплатно'}</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Airline card ─────────────────────────────────────────────────── */}
        {airline ? (
          <Animated.View entering={FadeInUp.delay(270).springify()} style={airlineCard.wrap}>
            <Text style={airlineCard.sectionTitle}>АВИАКОМПАНИЯ</Text>
            <View style={airlineCard.row}>
              <View style={airlineCard.logoWrap}>
                <Text style={airlineCard.logoEmoji}>✈️</Text>
              </View>
              <View style={airlineCard.info}>
                <Text style={airlineCard.name}>{airline}</Text>
                {flightNumber ? (
                  <Text style={airlineCard.flightNum}>Рейс {flightNumber}</Text>
                ) : null}
              </View>
              <View style={airlineCard.ratingWrap}>
                <Text style={airlineCard.ratingVal}>8.4</Text>
                <Text style={airlineCard.ratingLabel}>/ 10</Text>
                <View style={airlineCard.starsRow}>
                  {['★','★','★','★','☆'].map((s, i) => (
                    <Text key={i} style={[airlineCard.star, i < 4 && airlineCard.starActive]}>{s}</Text>
                  ))}
                </View>
              </View>
            </View>
          </Animated.View>
        ) : null}

        {/* ── Price card ───────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(300).springify()}>
          <InfoCard
            icon="💰"
            title="Стоимость"
            rows={[
              {
                label: 'Цена за перелёт',
                value: formattedPrice,
                valueColor: Colors.primary,
                valueLarge: true,
              },
            ]}
          />
        </Animated.View>
      </ScrollView>

      {/* ── Fixed bottom book button ──────────────────────────────────────── */}
      <Animated.View
        entering={FadeInUp.delay(200).springify()}
        style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}
      >
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={handleBook}
          activeOpacity={0.85}
        >
          <Text style={styles.bookBtnText}>
            Забронировать{priceNum > 0 ? ` · ${formattedPrice}` : ''}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ── Included services styles ───────────────────────────────────────────────────

const includedCard = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  item: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 22,
  },
  itemLabel: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
    lineHeight: 16,
  },
  itemValue: {
    color: Colors.text,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    textAlign: 'center',
  },
});

// ── Airline card styles ────────────────────────────────────────────────────────

const airlineCard = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: {
    fontSize: 24,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: Colors.text,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  flightNum: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
  },
  ratingWrap: {
    alignItems: 'flex-end',
    gap: 2,
  },
  ratingVal: {
    color: Colors.success,
    fontFamily: 'Sora',
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.extrabold,
    lineHeight: 28,
  },
  ratingLabel: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    position: 'absolute',
    right: 0,
    bottom: 18,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 1,
  },
  star: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: Colors.border,
  },
  starActive: {
    color: Colors.primary,
  },
});

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Hero
  heroWrapper: {
    overflow: 'hidden',
  },
  heroGradient: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    color: Colors.text,
    fontFamily: 'Inter',
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
  heroContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 6,
  },
  heroRoute: {
    color: Colors.text,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.extrabold,
    fontFamily: 'Sora',
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  heroSub: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },

  // Timeline card
  timelineCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeBlock: {
    flex: 1,
    gap: 4,
  },
  timeBlockRight: {
    alignItems: 'flex-end',
  },
  timeValue: {
    color: Colors.text,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.extrabold,
    fontFamily: 'Sora',
    letterSpacing: -0.5,
  },
  timeAirport: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    letterSpacing: 1,
  },
  timeCenter: {
    alignItems: 'center',
    gap: 6,
    flex: 1.2,
  },
  durationLabel: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  flightLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: '100%',
    justifyContent: 'center',
  },
  flightLineDash: {
    flex: 1,
    height: 1.5,
    backgroundColor: Colors.border,
    borderRadius: 1,
  },
  planeIcon: {
    fontSize: 18,
  },
  cityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  cityName: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    flex: 1,
  },
  cityNameRight: {
    textAlign: 'right',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dateText: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
  },

  // Included & Airline (inline styles below)
  // Footer
  footer: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  bookBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 100,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  bookBtnText: {
    color: Colors.textInverse,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.3,
  },
});
