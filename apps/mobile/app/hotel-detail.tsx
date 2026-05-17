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

// ── Sub-components ─────────────────────────────────────────────────────────────

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
  row: { flexDirection: 'row', gap: 2 },
  star: { fontSize: Typography.sizes.md, color: Colors.warning },
  starActive: { color: Colors.warning },
});

function RatingBadge({ rating, reviewsCount }: { rating: number; reviewsCount?: number }) {
  return (
    <View style={ratingStyles.wrap}>
      <Text style={ratingStyles.score}>{rating.toFixed(1)}</Text>
      {reviewsCount !== undefined && (
        <Text style={ratingStyles.reviews}>{reviewsCount} отзывов</Text>
      )}
    </View>
  );
}

const ratingStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: `${Colors.success}22`,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  score: {
    color: Colors.success,
    fontWeight: Typography.weights.bold,
    fontSize: Typography.sizes.base,
  },
  reviews: {
    color: Colors.success,
    fontSize: Typography.sizes.sm,
  },
});

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
  label: { color: Colors.textMuted, fontSize: Typography.sizes.xs, marginBottom: 2 },
  value: { color: Colors.text, fontSize: Typography.sizes.base, fontWeight: Typography.weights.medium },
});

// Amenity icon map
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

function AmenityChip({ id }: { id: string }) {
  const icon = AMENITY_ICONS[id] ?? 'checkmark-circle';
  const label = AMENITY_LABELS[id] ?? id;
  return (
    <View style={chipStyles.chip}>
      <Ionicons name={icon} size={14} color={Colors.primary} />
      <Text style={chipStyles.label}>{label}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: `${Colors.primary}18`,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  label: { color: Colors.primary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium },
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
  const currency = str(raw.currency, 'RUB');
  const checkIn = str(raw.checkIn);
  const checkOut = str(raw.checkOut);
  const rooms = str(raw.rooms, '1');
  const guests = str(raw.guests, '1');
  const ratingStr = raw.rating ? str(raw.rating) : undefined;
  const reviewsCountStr = raw.reviewsCount ? str(raw.reviewsCount) : undefined;
  const amenitiesStr = raw.amenities ? str(raw.amenities) : undefined;
  const description = raw.description ? str(raw.description) : undefined;
  const bookingId = raw.bookingId ? str(raw.bookingId) : undefined;
  const hotelId = raw.hotelId ? str(raw.hotelId) : `hotel-${name}-${city}`.replace(/\s+/g, '-');

  const rating = ratingStr ? parseFloat(ratingStr) : undefined;

  const reviewsCount = reviewsCountStr ? parseInt(reviewsCountStr, 10) : undefined;
  const amenities = amenitiesStr ? amenitiesStr.split(',').map((a) => a.trim()).filter(Boolean) : [];
  const nights = calcNights(checkIn, checkOut);

  const currencySymbol = currency === 'RUB' ? '₽' : currency;
  const formattedPricePerNight = pricePerNight > 0
    ? `${pricePerNight.toLocaleString('ru-RU')} ${currencySymbol}`
    : '—';
  const totalPrice = pricePerNight * nights;
  const formattedTotal = totalPrice > 0
    ? `${totalPrice.toLocaleString('ru-RU')} ${currencySymbol}`
    : '—';

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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero — FadeIn */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.heroCard}>
          <Text style={styles.hotelName}>{name}</Text>
          <StarRow count={stars} />
          {(address || city) ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.locationText}>
                {[address, city].filter(Boolean).join(', ')}
              </Text>
            </View>
          ) : null}
          {rating !== undefined && !isNaN(rating) ? (
            <View style={styles.ratingWrap}>
              <RatingBadge rating={rating} reviewsCount={reviewsCount} />
            </View>
          ) : null}
        </Animated.View>

        {/* Dates & guests — FadeInUp delay 80 */}
        <Animated.View entering={FadeInUp.delay(80).springify()} style={styles.section}>
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

        {/* Amenities — FadeInUp delay 160 */}
        {amenities.length > 0 ? (
          <Animated.View entering={FadeInUp.delay(160).springify()} style={styles.sectionNoRows}>
            <Text style={styles.sectionTitle}>Удобства</Text>
            <View style={styles.chipsWrap}>
              {amenities.map((id) => (
                <AmenityChip key={id} id={id} />
              ))}
            </View>
          </Animated.View>
        ) : null}

        {/* Description — FadeInUp delay 240 */}
        {description ? (
          <Animated.View entering={FadeInUp.delay(240).springify()} style={styles.sectionNoRows}>
            <Text style={styles.sectionTitle}>Описание</Text>
            <Text style={styles.description}>{description}</Text>
          </Animated.View>
        ) : null}
      </ScrollView>

      {/* Footer */}
      <Animated.View
        entering={FadeInUp.delay(160).springify()}
        style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}
      >
        <View style={styles.priceBlock}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>За ночь</Text>
            <Text style={styles.priceNight}>{formattedPricePerNight}</Text>
          </View>
          {nights > 0 ? (
            <View style={styles.priceRow}>
              <Text style={styles.totalLabel}>Итого ({nights} ночей)</Text>
              <Text style={styles.totalValue}>{formattedTotal}</Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity style={styles.bookBtn} onPress={handleBook} activeOpacity={0.85}>
          <Text style={styles.bookBtnText}>Забронировать</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4 },
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
  shareBtn: { padding: 4 },
  scroll: { flex: 1 },
  content: {
    padding: 16,
    gap: 16,
  },
  // Hero
  heroCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  hotelName: {
    color: Colors.text,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.extrabold,
    lineHeight: 32,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    flex: 1,
  },
  ratingWrap: {
    marginTop: 2,
  },
  // Section with rows
  section: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionNoRows: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  sectionTitle: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingVertical: 12,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  description: {
    color: Colors.text,
    fontSize: Typography.sizes.base,
    lineHeight: 22,
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
  priceBlock: {
    gap: 4,
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
  priceNight: {
    color: Colors.text,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  totalLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
  },
  totalValue: {
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
