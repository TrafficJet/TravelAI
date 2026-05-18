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
import type { Hotel } from '../types';

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function calcNights(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  const diff = b.getTime() - a.getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

// ── StarRow ────────────────────────────────────────────────────────────────────

function StarRow({ count }: { count: number }) {
  const n = Math.min(5, Math.max(0, Math.round(count)));
  return (
    <View style={starStyles.row}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Text key={i} style={[starStyles.star, i < n && starStyles.starActive]}>
          ★
        </Text>
      ))}
    </View>
  );
}

const starStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 3 },
  star: { fontSize: 18, color: Colors.border },
  starActive: { color: Colors.primary },
});

// ── RatingBlock ────────────────────────────────────────────────────────────────

function RatingBlock({ rating, reviewsCount }: { rating: number; reviewsCount?: number }) {
  return (
    <View style={ratingStyles.wrap}>
      <View style={ratingStyles.scoreWrap}>
        <Text style={ratingStyles.score}>{rating.toFixed(1)}</Text>
        <Text style={ratingStyles.outOf}>/10</Text>
      </View>
      {reviewsCount !== undefined && (
        <Text style={ratingStyles.reviews}>{reviewsCount} отзывов</Text>
      )}
    </View>
  );
}

const ratingStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 2,
  },
  scoreWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  score: {
    color: Colors.success,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.extrabold,
    fontFamily: 'Sora',
    lineHeight: 36,
  },
  outOf: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    marginBottom: 2,
  },
  reviews: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
  },
});

// ── Amenity icons & labels ─────────────────────────────────────────────────────

const AMENITY_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  wifi: 'wifi',
  pool: 'water',
  gym: 'barbell',
  spa: 'sparkles',
  parking: 'car',
  restaurant: 'restaurant',
  bar: 'wine',
};

const AMENITY_LABELS: Record<string, string> = {
  wifi: 'Wi-Fi',
  pool: 'Бассейн',
  gym: 'Фитнес',
  spa: 'SPA',
  parking: 'Парковка',
  restaurant: 'Ресторан',
  bar: 'Бар',
};

function AmenityTile({ id }: { id: string }) {
  const icon = AMENITY_ICONS[id] ?? 'checkmark-circle';
  const label = AMENITY_LABELS[id] ?? id;
  return (
    <View style={amenityStyles.tile}>
      <View style={amenityStyles.iconWrap}>
        <Ionicons name={icon} size={20} color={Colors.primary} />
      </View>
      <Text style={amenityStyles.label} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const amenityStyles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    gap: 6,
    width: '20%',
    minWidth: 56,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  label: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
  },
});

// ── InfoRow ────────────────────────────────────────────────────────────────────

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
  content: { flex: 1 },
  label: { color: Colors.textMuted, fontFamily: 'Inter', fontSize: Typography.sizes.xs, marginBottom: 2 },
  value: { color: Colors.text, fontFamily: 'Inter', fontSize: Typography.sizes.base, fontWeight: Typography.weights.medium },
});

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function HotelDetailScreen() {
  const insets = useSafeAreaInsets();
  const raw = useLocalSearchParams();

  function str(v: string | string[] | undefined, fallback = ''): string {
    if (Array.isArray(v)) return v[0] ?? fallback;
    return v ?? fallback;
  }

  const name = str(raw.name, 'Отель');
  const address = str(raw.address);
  const city = str(raw.city);
  const stars = parseInt(str(raw.stars, '0'), 10);
  const pricePerNight = parseFloat(str(raw.pricePerNight, '0'));
  const currency = str(raw.currency, 'USD');
  const checkIn = str(raw.checkIn);
  const checkOut = str(raw.checkOut);
  const rooms = str(raw.rooms, '1');
  const guests = str(raw.guests, '1');
  const ratingStr = raw.rating ? str(raw.rating) : undefined;
  const reviewsCountStr = raw.reviewsCount ? str(raw.reviewsCount) : undefined;
  const amenitiesStr = raw.amenities ? str(raw.amenities) : undefined;
  const description = raw.description ? str(raw.description) : undefined;
  const bookingId = raw.bookingId ? str(raw.bookingId) : undefined;
  const hotelId = raw.hotelId
    ? str(raw.hotelId)
    : `hotel-${name}-${city}`.replace(/\s+/g, '-');

  const rating = ratingStr ? parseFloat(ratingStr) : undefined;
  const reviewsCount = reviewsCountStr ? parseInt(reviewsCountStr, 10) : undefined;
  const amenities = amenitiesStr
    ? amenitiesStr.split(',').map((a) => a.trim()).filter(Boolean)
    : [];
  const nights = calcNights(checkIn, checkOut);

  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency;
  const formattedPricePerNight =
    pricePerNight > 0 ? `${currencySymbol}${pricePerNight.toLocaleString('ru-RU')}` : '—';
  const totalPrice = pricePerNight * nights;
  const formattedTotal =
    totalPrice > 0 ? `${currencySymbol}${totalPrice.toLocaleString('ru-RU')}` : '—';

  const hotelForFavorite: Hotel = {
    id: hotelId,
    name,
    address: address || undefined,
    city: city || undefined,
    stars: stars > 0 ? stars : undefined,
    pricePerNight,
    currency,
    rating,
    reviewsCount,
    amenities: amenitiesStr
      ? amenitiesStr.split(',').map((a) => a.trim()).filter(Boolean)
      : undefined,
    description: description || undefined,
    checkIn: checkIn || undefined,
    checkOut: checkOut || undefined,
    rooms: parseInt(rooms, 10),
    guests: parseInt(guests, 10),
  };

  const handleBook = useCallback(() => {
    if (bookingId) {
      router.push(`/bookings/${bookingId}`);
    } else {
      toast.info('Воспользуйтесь чатом с AI');
    }
  }, [bookingId]);

  const handleShare = useCallback(async () => {
    try {
      const location = [name, city].filter(Boolean).join(', ');
      await Share.share({
        message: `${location} — ${formattedPricePerNight}/ночь`,
      });
    } catch {
      // dismissed
    }
  }, [name, city, formattedPricePerNight]);

  return (
    <View style={styles.container}>
      {/* ── Hero Section ───────────────────────────────────────────────────── */}
      <View style={styles.heroWrapper}>
        {/* Photo placeholder with gradient overlay */}
        <LinearGradient
          colors={['#1C1C2E', '#0E1628', '#0A1020']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.photoPlaceholder, { paddingTop: insets.top }]}
        >
          {/* Decorative background pattern */}
          <View style={styles.photoBgPattern} pointerEvents="none">
            <View style={styles.photoBgCircle1} />
            <View style={styles.photoBgCircle2} />
          </View>

          {/* Top bar */}
          <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Детали отеля</Text>
            <View style={styles.headerRight}>
              <FavoriteButton type="hotel" item={hotelForFavorite} size={22} />
              <TouchableOpacity
                style={styles.shareBtn}
                onPress={handleShare}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="share-outline" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Photo placeholder icon */}
          <Animated.View entering={FadeIn.duration(400)} style={styles.photoIconArea}>
            <Text style={styles.photoIcon}>🏨</Text>
          </Animated.View>

          {/* Name overlaid on photo */}
          <Animated.View entering={FadeIn.duration(500)} style={styles.heroOverlay}>
            <LinearGradient
              colors={['transparent', 'rgba(10,10,20,0.85)', '#0A0A14']}
              style={styles.heroGradientOverlay}
            >
              <View style={styles.heroNameRow}>
                <View style={styles.heroNameBlock}>
                  <Text style={styles.heroName} numberOfLines={2}>{name}</Text>
                  {stars > 0 ? <StarRow count={stars} /> : null}
                  {(address || city) ? (
                    <View style={styles.locationRow}>
                      <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
                      <Text style={styles.locationText} numberOfLines={1}>
                        {[address, city].filter(Boolean).join(', ')}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {rating !== undefined && !isNaN(rating) ? (
                  <View style={styles.ratingCard}>
                    <RatingBlock rating={rating} reviewsCount={reviewsCount} />
                  </View>
                ) : null}
              </View>
            </LinearGradient>
          </Animated.View>
        </LinearGradient>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Amenities grid ────────────────────────────────────────────────── */}
        {amenities.length > 0 ? (
          <Animated.View entering={FadeInUp.delay(80).springify()} style={styles.card}>
            <Text style={styles.sectionTitle}>Удобства</Text>
            <View style={styles.amenitiesGrid}>
              {amenities.map((id) => (
                <AmenityTile key={id} id={id} />
              ))}
            </View>
          </Animated.View>
        ) : null}

        {/* ── Dates & guests ────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(140).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Проживание</Text>
          {checkIn ? (
            <InfoRow icon="calendar-outline" label="Заезд" value={formatDate(checkIn)} />
          ) : null}
          {checkOut ? (
            <InfoRow icon="calendar-outline" label="Выезд" value={formatDate(checkOut)} />
          ) : null}
          {nights > 0 ? (
            <InfoRow icon="moon-outline" label="Ночей" value={String(nights)} />
          ) : null}
          <InfoRow icon="people-outline" label="Гости" value={guests} />
          <InfoRow icon="bed-outline" label="Номеров" value={rooms} />
        </Animated.View>

        {/* ── Price card ────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.priceCard}>
          <Text style={styles.sectionTitle}>Стоимость</Text>

          {/* Per night price */}
          <View style={styles.priceMainRow}>
            <Text style={styles.priceMainValue}>{formattedPricePerNight}</Text>
            <Text style={styles.pricePerNightLabel}>/ночь</Text>
          </View>

          <View style={styles.priceDivider} />

          {/* Check-in / check-out */}
          {checkIn ? (
            <View style={styles.priceDateRow}>
              <Text style={styles.priceDateLabel}>Заезд</Text>
              <Text style={styles.priceDateValue}>{formatDate(checkIn)}</Text>
            </View>
          ) : null}
          {checkOut ? (
            <View style={styles.priceDateRow}>
              <Text style={styles.priceDateLabel}>Выезд</Text>
              <Text style={styles.priceDateValue}>{formatDate(checkOut)}</Text>
            </View>
          ) : null}

          {/* Total */}
          {nights > 0 ? (
            <View style={styles.priceTotalRow}>
              <Text style={styles.priceTotalLabel}>Итого за {nights} {nights === 1 ? 'ночь' : nights < 5 ? 'ночи' : 'ночей'}:</Text>
              <Text style={styles.priceTotalValue}>{formattedTotal}</Text>
            </View>
          ) : null}
        </Animated.View>

        {/* ── Location map placeholder ──────────────────────────────────────── */}
        {(address || city) ? (
          <Animated.View entering={FadeInUp.delay(230).springify()} style={styles.card}>
            <Text style={styles.sectionTitle}>Расположение</Text>
            {/* Map placeholder */}
            <LinearGradient
              colors={['#12202E', '#0E1A28', '#101820']}
              style={styles.mapPlaceholder}
            >
              {/* Grid lines */}
              <View style={styles.mapGrid}>
                {[...Array(4)].map((_, i) => (
                  <View key={`h${i}`} style={[styles.mapGridLine, styles.mapGridLineH, { top: `${25 * (i + 1)}%` }]} />
                ))}
                {[...Array(4)].map((_, i) => (
                  <View key={`v${i}`} style={[styles.mapGridLine, styles.mapGridLineV, { left: `${25 * (i + 1)}%` }]} />
                ))}
              </View>
              {/* Pin */}
              <View style={styles.mapPin}>
                <View style={styles.mapPinCircle}>
                  <Ionicons name="location" size={20} color={Colors.primary} />
                </View>
                <View style={styles.mapPinTail} />
              </View>
              <Text style={styles.mapLabel}>Карта</Text>
            </LinearGradient>
            {/* Address row */}
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={16} color={Colors.primary} />
              <Text style={styles.addressText}>
                {[address, city].filter(Boolean).join(', ')}
              </Text>
            </View>
          </Animated.View>
        ) : null}

        {/* ── Description ───────────────────────────────────────────────────── */}
        {description ? (
          <Animated.View entering={FadeInUp.delay(260).springify()} style={styles.card}>
            <Text style={styles.sectionTitle}>Описание</Text>
            <Text style={styles.description}>{description}</Text>
          </Animated.View>
        ) : null}
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
            Забронировать{pricePerNight > 0 ? ` · ${formattedPricePerNight}/ночь` : ''}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Hero
  heroWrapper: {
    overflow: 'hidden',
  },
  photoPlaceholder: {
    minHeight: 240,
    position: 'relative',
  },
  photoBgPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  photoBgCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: `${Colors.secondary}08`,
    top: -60,
    right: -40,
  },
  photoBgCircle2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: `${Colors.primary}06`,
    bottom: 20,
    left: -30,
  },
  photoIconArea: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  photoIcon: {
    fontSize: 56,
  },
  heroOverlay: {
    flex: 1,
  },
  heroGradientOverlay: {
    paddingTop: 12,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
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
  shareBtn: { padding: 4 },
  heroContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  heroNameBlock: {
    flex: 1,
    gap: 8,
  },
  heroName: {
    color: Colors.text,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.extrabold,
    fontFamily: 'Sora',
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    flex: 1,
  },
  ratingCard: {
    backgroundColor: `${Colors.success}15`,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: `${Colors.success}30`,
    alignItems: 'center',
    minWidth: 72,
  },

  // Scroll
  scroll: { flex: 1 },
  content: {
    padding: 16,
    gap: 12,
  },

  // Generic card
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },

  // Section with InfoRows
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
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingVertical: 12,
  },

  // Amenities grid
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingBottom: 4,
  },

  // Description
  description: {
    color: Colors.text,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    lineHeight: 22,
  },

  // Map placeholder
  mapPlaceholder: {
    height: 140,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mapGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mapGridLine: {
    position: 'absolute',
    backgroundColor: `${Colors.border}60`,
  },
  mapGridLineH: {
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  mapGridLineV: {
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
  },
  mapPin: {
    alignItems: 'center',
  },
  mapPinCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}20`,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  mapPinTail: {
    width: 2,
    height: 8,
    backgroundColor: Colors.primary,
    borderRadius: 1,
  },
  mapLabel: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    position: 'absolute',
    bottom: 8,
    right: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  addressText: {
    color: Colors.text,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    flex: 1,
    lineHeight: 20,
  },

  // Price card
  priceCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  priceMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  priceMainValue: {
    color: Colors.primary,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.extrabold,
    fontFamily: 'Sora',
    lineHeight: 36,
  },
  pricePerNightLabel: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    marginBottom: 2,
  },
  priceDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  priceDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceDateLabel: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
  },
  priceDateValue: {
    color: Colors.text,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  priceTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  priceTotalLabel: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
  },
  priceTotalValue: {
    color: Colors.text,
    fontFamily: 'Sora',
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.extrabold,
  },

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
