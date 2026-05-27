import React, { useCallback, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography } from '../constants/typography';
import { useChatStore } from '../stores/chatStore';
import { FavoriteButton } from '../components/ui/FavoriteButton';
import { useTheme } from '../src/theme/ThemeContext';
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
  const { colors } = useTheme();
  const n = Math.min(5, Math.max(0, Math.round(count)));
  return (
    <View style={starStyles.row}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Text key={i} style={[starStyles.star, { color: colors.border }, i < n && { color: colors.primary }]}>
          ★
        </Text>
      ))}
    </View>
  );
}

const starStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 3 },
  star: { fontSize: 18 },
});

// ── RatingBlock ────────────────────────────────────────────────────────────────

function RatingBlock({ rating, reviewsCount }: { rating: number; reviewsCount?: number }) {
  const { colors } = useTheme();
  return (
    <View style={ratingStyles.wrap}>
      <View style={ratingStyles.scoreWrap}>
        <Text style={[ratingStyles.score, { color: colors.success }]}>{rating.toFixed(1)}</Text>
        <Text style={[ratingStyles.outOf, { color: colors.textMuted }]}>/10</Text>
      </View>
      {reviewsCount !== undefined && (
        <Text style={[ratingStyles.reviews, { color: colors.textMuted }]}>{reviewsCount} отзывов</Text>
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
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.extrabold,
    fontFamily: 'Sora',
    lineHeight: 36,
  },
  outOf: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    marginBottom: 2,
  },
  reviews: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
  },
});

// ── Amenity icons & labels ─────────────────────────────────────────────────────

const AMENITY_ICONS: Record<string, string> = {
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
  const { colors } = useTheme();
  const icon = AMENITY_ICONS[id] ?? 'checkmark-circle';
  const label = AMENITY_LABELS[id] ?? id;
  return (
    <View style={amenityStyles.tile}>
      <View style={[
        amenityStyles.iconWrap,
        { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` },
      ]}>
        <Ionicons name={(AMENITY_ICONS[id] ?? 'checkmark-circle') as any} size={22} color={colors.primary} />
      </View>
      <Text style={[amenityStyles.label, { color: colors.textMuted }]} numberOfLines={1}>{label}</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  label: {
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
  icon: string;
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[row.container, { borderBottomColor: colors.border }]}>
      <View style={[row.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
        <Ionicons name={icon as any} size={18} color={colors.primary} />
      </View>
      <View style={row.content}>
        <Text style={[row.label, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[row.value, { color: colors.text }]}>{value}</Text>
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
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: { flex: 1 },
  label: { fontFamily: 'Inter', fontSize: Typography.sizes.xs, marginBottom: 2 },
  value: { fontFamily: 'Inter', fontSize: Typography.sizes.base, fontWeight: Typography.weights.medium },
});

const guestCounterStyles = StyleSheet.create({
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
});

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function HotelDetailScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const raw = useLocalSearchParams();
  const [guestCount, setGuestCount] = useState<number | null>(null);
  const [roomCount, setRoomCount] = useState<number | null>(null);

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

  const effectiveGuests = guestCount ?? parseInt(guests, 10);
  const effectiveRooms = roomCount ?? parseInt(rooms, 10);

  const handleBook = useCallback(async () => {
    if (bookingId) {
      router.push(`/bookings/${bookingId}` as Parameters<typeof router.push>[0]);
      return;
    }
    try {
      const { createSession } = useChatStore.getState();
      const newSessionId = await createSession();
      const guestsNum = effectiveGuests;
      const roomsNum = effectiveRooms;
      const msg = `Забронируй отель "${name}"${city ? ` в ${city}` : ''}${checkIn ? ` с заездом ${checkIn}` : ''}${checkOut ? ` по ${checkOut}` : ''}, ${guestsNum} ${guestsNum === 1 ? 'гость' : guestsNum < 5 ? 'гостя' : 'гостей'}, ${roomsNum} ${roomsNum === 1 ? 'номер' : 'номера'}. Цена: ${formattedPricePerNight}/ночь.`;
      router.push({
        pathname: '/(tabs)/chat/[sessionId]',
        params: { sessionId: newSessionId, initialMessage: msg },
      } as never);
    } catch {
      router.push('/(tabs)' as Parameters<typeof router.push>[0]);
    }
  }, [bookingId, name, city, checkIn, checkOut, effectiveGuests, effectiveRooms, formattedPricePerNight]);

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Hero Section ───────────────────────────────────────────────────── */}
      <View style={styles.heroWrapper}>
        {/* Photo placeholder with gradient overlay */}
        <LinearGradient
          colors={[colors.card, colors.surface, colors.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.photoPlaceholder, { paddingTop: insets.top }]}
        >
          {/* Decorative background pattern */}
          <View style={styles.photoBgPattern} pointerEvents="none">
            <View style={[styles.photoBgCircle1, { backgroundColor: `${colors.surface}08` }]} />
            <View style={[styles.photoBgCircle2, { backgroundColor: `${colors.primary}06` }]} />
          </View>

          {/* Top bar */}
          <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={{ fontSize: 24, color: colors.text, lineHeight: 28  }}>{'‹'}</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Детали отеля</Text>
            <View style={styles.headerRight}>
              <FavoriteButton type="hotel" item={hotelForFavorite} size={22} />
              <TouchableOpacity
                style={styles.shareBtn}
                onPress={handleShare}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={{ fontSize: 22, color: colors.text, lineHeight: 26  }}>{'↑'}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Photo placeholder icon */}
          <Animated.View entering={FadeIn.duration(400)} style={styles.photoIconArea}>
            <Ionicons name="business" size={56} color={colors.primary} />
          </Animated.View>

          {/* Name overlaid on photo */}
          <Animated.View entering={FadeIn.duration(500)} style={styles.heroOverlay}>
            <LinearGradient
              colors={['transparent', 'rgba(10,10,20,0.85)', colors.background]}
              style={styles.heroGradientOverlay}
            >
              <View style={styles.heroNameRow}>
                <View style={styles.heroNameBlock}>
                  <Text style={[styles.heroName, { color: colors.text }]} numberOfLines={2}>{name}</Text>
                  {stars > 0 ? <StarRow count={stars} /> : null}
                  {(address || city) ? (
                    <View style={styles.locationRow}>
                      <Ionicons name="location-sharp" size={13} color={colors.textMuted} />
                      <Text style={[styles.locationText, { color: colors.textMuted }]} numberOfLines={1}>
                        {[address, city].filter(Boolean).join(', ')}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {rating !== undefined && !isNaN(rating) ? (
                  <View style={[styles.ratingCard, { backgroundColor: `${colors.success}15`, borderColor: `${colors.success}30` }]}>
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
          <Animated.View entering={FadeInUp.delay(80).springify()} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Удобства</Text>
            <View style={styles.amenitiesGrid}>
              {amenities.map((id) => (
                <AmenityTile key={id} id={id} />
              ))}
            </View>
          </Animated.View>
        ) : null}

        {/* ── Dates & guests ────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(140).springify()} style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Проживание</Text>
          {checkIn ? (
            <InfoRow icon="calendar-outline" label="Заезд" value={formatDate(checkIn)} />
          ) : null}
          {checkOut ? (
            <InfoRow icon="calendar-outline" label="Выезд" value={formatDate(checkOut)} />
          ) : null}
          {nights > 0 ? (
            <InfoRow icon="moon-outline" label="Ночей" value={String(nights)} />
          ) : null}
          {/* ── Guest counter ── */}
          <View style={[row.container, { borderBottomColor: colors.border }]}>
            <View style={[row.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
              <Ionicons name={'people-outline' as any} size={18} color={colors.primary} />
            </View>
            <View style={row.content}>
              <Text style={[row.label, { color: colors.textMuted }]}>Взрослые</Text>
              <Text style={[row.value, { color: colors.text }]}>{effectiveGuests}</Text>
            </View>
            <View style={guestCounterStyles.controls}>
              <TouchableOpacity
                style={[guestCounterStyles.btn, { borderColor: colors.border }]}
                onPress={() => setGuestCount(Math.max(1, effectiveGuests - 1))}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[guestCounterStyles.btnText, { color: colors.primary }]}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[guestCounterStyles.btn, { borderColor: colors.border }]}
                onPress={() => setGuestCount(Math.min(10, effectiveGuests + 1))}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[guestCounterStyles.btnText, { color: colors.primary }]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* ── Rooms counter ── */}
          <View style={[row.container, { borderBottomColor: colors.border }]}>
            <View style={[row.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
              <Ionicons name={'bed-outline' as any} size={18} color={colors.primary} />
            </View>
            <View style={row.content}>
              <Text style={[row.label, { color: colors.textMuted }]}>Номеров</Text>
              <Text style={[row.value, { color: colors.text }]}>{effectiveRooms}</Text>
            </View>
            <View style={guestCounterStyles.controls}>
              <TouchableOpacity
                style={[guestCounterStyles.btn, { borderColor: colors.border }]}
                onPress={() => setRoomCount(Math.max(1, effectiveRooms - 1))}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[guestCounterStyles.btnText, { color: colors.primary }]}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[guestCounterStyles.btn, { borderColor: colors.border }]}
                onPress={() => setRoomCount(Math.min(10, effectiveRooms + 1))}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[guestCounterStyles.btnText, { color: colors.primary }]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* ── Room options ──────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(170).springify()} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Варианты номеров</Text>
          {[
            { type: 'Стандарт', desc: 'Завтрак включён', price: pricePerNight, highlights: ['Завтрак включён'] },
            { type: 'Делюкс с видом', desc: 'Завтрак + трансфер', price: Math.round(pricePerNight * 1.3), highlights: ['Завтрак + трансфер'] },
          ].map((room, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={handleBook}
              activeOpacity={0.85}
              style={[{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 12,
                borderTopWidth: idx > 0 ? StyleSheet.hairlineWidth : 0,
                borderTopColor: colors.border,
              }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '600', color: colors.text }}>{room.type}</Text>
                <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{room.desc}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={{ fontFamily: 'Sora', fontSize: 17, fontWeight: '700', color: colors.primary }}>{currencySymbol}{room.price.toLocaleString('ru-RU')}</Text>
                <Text style={{ fontFamily: 'Inter', fontSize: 10, color: colors.textMuted }}>/ {nights > 0 ? `${nights} ноч.` : 'ночь'}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* ── Price card ────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(200).springify()} style={[styles.priceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Стоимость</Text>

          {/* Per night price */}
          <View style={styles.priceMainRow}>
            <Text style={[styles.priceMainValue, { color: colors.primary }]}>{formattedPricePerNight}</Text>
            <Text style={[styles.pricePerNightLabel, { color: colors.textMuted }]}>/ночь</Text>
          </View>

          <View style={[styles.priceDivider, { backgroundColor: colors.border }]} />

          {/* Check-in / check-out */}
          {checkIn ? (
            <View style={styles.priceDateRow}>
              <Text style={[styles.priceDateLabel, { color: colors.textMuted }]}>Заезд</Text>
              <Text style={[styles.priceDateValue, { color: colors.text }]}>{formatDate(checkIn)}</Text>
            </View>
          ) : null}
          {checkOut ? (
            <View style={styles.priceDateRow}>
              <Text style={[styles.priceDateLabel, { color: colors.textMuted }]}>Выезд</Text>
              <Text style={[styles.priceDateValue, { color: colors.text }]}>{formatDate(checkOut)}</Text>
            </View>
          ) : null}

          {/* Total */}
          {nights > 0 ? (
            <View style={[styles.priceTotalRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.priceTotalLabel, { color: colors.textMuted }]}>Итого за {nights} {nights === 1 ? 'ночь' : nights < 5 ? 'ночи' : 'ночей'}:</Text>
              <Text style={[styles.priceTotalValue, { color: colors.text }]}>{formattedTotal}</Text>
            </View>
          ) : null}
        </Animated.View>

        {/* ── Location map placeholder ──────────────────────────────────────── */}
        {(address || city) ? (
          <Animated.View entering={FadeInUp.delay(230).springify()} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Расположение</Text>
            {/* Map placeholder */}
            <LinearGradient
              colors={['#12202E', '#0E1A28', '#101820']}
              style={[styles.mapPlaceholder, { borderColor: colors.border }]}
            >
              {/* Grid lines */}
              <View style={styles.mapGrid}>
                {[...Array(4)].map((_, i) => (
                  <View key={`h${i}`} style={[styles.mapGridLine, styles.mapGridLineH, { top: `${25 * (i + 1)}%`, backgroundColor: `${colors.border}60` }]} />
                ))}
                {[...Array(4)].map((_, i) => (
                  <View key={`v${i}`} style={[styles.mapGridLine, styles.mapGridLineV, { left: `${25 * (i + 1)}%`, backgroundColor: `${colors.border}60` }]} />
                ))}
              </View>
              {/* Pin */}
              <View style={styles.mapPin}>
                <View style={[styles.mapPinCircle, { backgroundColor: `${colors.primary}20`, borderColor: colors.primary, shadowColor: colors.primary }]}>
                  <Ionicons name="location-sharp" size={20} color={colors.primary} />
                </View>
                <View style={[styles.mapPinTail, { backgroundColor: colors.primary }]} />
              </View>
              <Text style={[styles.mapLabel, { color: colors.textMuted }]}>Карта</Text>
            </LinearGradient>
            {/* Address row */}
            <View style={styles.addressRow}>
              <Ionicons name="location-sharp" size={16} color={colors.primary} />
              <Text style={[styles.addressText, { color: colors.text }]}>
                {[address, city].filter(Boolean).join(', ')}
              </Text>
            </View>
          </Animated.View>
        ) : null}

        {/* ── Description ───────────────────────────────────────────────────── */}
        {description ? (
          <Animated.View entering={FadeInUp.delay(260).springify()} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Описание</Text>
            <Text style={[styles.description, { color: colors.text }]}>{description}</Text>
          </Animated.View>
        ) : null}
      </ScrollView>

      {/* ── Fixed bottom book button ──────────────────────────────────────── */}
      <Animated.View
        entering={FadeInUp.delay(200).springify()}
        style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + 16 }]}
      >
        <TouchableOpacity
          style={[styles.bookBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
          onPress={handleBook}
          activeOpacity={0.85}
        >
          <Text style={[styles.bookBtnText, { color: colors.textInverse }]}>
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
    top: -60,
    right: -40,
  },
  photoBgCircle2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
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
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingHorizontal: 20,
  },
  heroNameBlock: {
    flex: 1,
    gap: 8,
  },
  heroName: {
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
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    flex: 1,
  },
  ratingCard: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
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
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },

  // Section with InfoRows
  section: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
    borderWidth: 1,
  },

  sectionTitle: {
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
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  mapPinTail: {
    width: 2,
    height: 8,
    borderRadius: 1,
  },
  mapLabel: {
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
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    flex: 1,
    lineHeight: 20,
  },

  // Price card
  priceCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  priceMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  priceMainValue: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.extrabold,
    fontFamily: 'Sora',
    lineHeight: 36,
  },
  pricePerNightLabel: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    marginBottom: 2,
  },
  priceDivider: {
    height: StyleSheet.hairlineWidth,
  },
  priceDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceDateLabel: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
  },
  priceDateValue: {
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
  },
  priceTotalLabel: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
  },
  priceTotalValue: {
    fontFamily: 'Sora',
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.extrabold,
  },

  // Footer
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  bookBtn: {
    borderRadius: 100,
    paddingVertical: 17,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  bookBtnText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.3,
  },
});
