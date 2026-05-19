import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Typography } from '../../constants/typography';
import { Radius } from '../../constants/radius';
import { FavoriteButton } from '../ui/FavoriteButton';
import { useTheme } from '../../src/theme/ThemeContext';
import type { Hotel } from '../../types';

interface Props {
  hotel: Hotel;
  onBook?: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(currency: string): string {
  if (currency === 'USD') return '$';
  if (currency === 'EUR') return '€';
  if (currency === 'KZT') return '₸';
  if (currency === 'UAH') return '₴';
  return '$';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  });
}

function nightsCount(checkIn: string, checkOut: string): number {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

// ── StarRow ───────────────────────────────────────────────────────────────────

function StarRow({ count, rating }: { count: number; rating?: number }) {
  const { colors } = useTheme();
  const n = Math.min(5, Math.max(0, Math.round(count)));
  const empty = 5 - n;
  return (
    <View style={starStyles.row}>
      {Array.from({ length: n }).map((_, i) => (
        <Text key={`f${i}`} style={{ fontSize: 12, color: colors.primary }}>{'★'}</Text>
      ))}
      {Array.from({ length: empty }).map((_, i) => (
        <Text key={`e${i}`} style={{ fontSize: 12, color: colors.border }}>{'☆'}</Text>
      ))}
      {rating !== undefined && (
        <Text style={[starStyles.rating, { color: colors.primary }]}>{rating.toFixed(1)}/10</Text>
      )}
    </View>
  );
}

const starStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 1,
  },
  rating: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
});

// ── AmenityChip ───────────────────────────────────────────────────────────────

const AMENITY_LABELS: Record<string, string> = {
  wifi: 'WiFi',
  pool: 'Бассейн',
  breakfast: 'Завтрак',
  spa: 'Спа',
  parking: 'Парковка',
  gym: 'Фитнес',
  restaurant: 'Ресторан',
  bar: 'Бар',
  airport_shuttle: 'Шаттл',
};

function normalizeAmenity(raw: string): string {
  const key = raw.toLowerCase().replace(/[\s-]/g, '_');
  return AMENITY_LABELS[key] ?? raw;
}

type ThemeColors = ReturnType<typeof useTheme>['colors'];

function AmenityChip({ label, colors }: { label: string; colors: ThemeColors }) {
  return (
    <View style={[amenityStyles.chip, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
      <Text style={[amenityStyles.chipText, { color: colors.textMuted }]}>{normalizeAmenity(label)}</Text>
    </View>
  );
}

const amenityStyles = StyleSheet.create({
  chip: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  chipText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
});

// ── HotelCard ─────────────────────────────────────────────────────────────────

const FALLBACK_HOTEL_IMAGE = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80';

export function HotelCard({ hotel, onBook }: Props) {
  const { colors } = useTheme();
  const [imgError, setImgError] = useState(false);
  const nights =
    hotel.checkIn && hotel.checkOut ? nightsCount(hotel.checkIn, hotel.checkOut) : 0;
  const currencySymbol = formatCurrency(hotel.currency);
  const total = nights > 0 ? hotel.pricePerNight * nights : undefined;
  const photoUri = (!imgError && hotel.imageUrl)
    ? hotel.imageUrl
    : FALLBACK_HOTEL_IMAGE;

  function handlePress() {
    router.push({
      pathname: '/hotel-detail',
      params: {
        name: hotel.name,
        address: hotel.address ?? '',
        city: hotel.city ?? '',
        stars: String(hotel.stars ?? 0),
        pricePerNight: String(hotel.pricePerNight),
        currency: hotel.currency,
        checkIn: hotel.checkIn ?? '',
        checkOut: hotel.checkOut ?? '',
        rooms: String(hotel.rooms ?? 1),
        guests: String(hotel.guests ?? 1),
        rating: hotel.rating !== undefined ? String(hotel.rating) : '',
        reviewsCount: hotel.reviewsCount !== undefined ? String(hotel.reviewsCount) : '',
        amenities: hotel.amenities ? hotel.amenities.join(',') : '',
        description: hotel.description ?? '',
      },
    } as never);
  }

  // First 3 amenities for the chip row
  const topAmenities = hotel.amenities ? hotel.amenities.slice(0, 3) : [];

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.82} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>

      {/* ── Photo section with overlay ── */}
      <View style={styles.photoContainer}>
        <Image
          source={{ uri: photoUri }}
          style={styles.photo}
          resizeMode="cover"
          onError={() => setImgError(true)}
        />

        {/* Dark gradient overlay at the bottom of the photo */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.photoOverlay}
        >
          <View style={styles.overlayContent}>
            <Text style={styles.overlayHotelName} numberOfLines={1}>
              {hotel.name}
            </Text>
            <View style={styles.overlayBottom}>
              {(hotel.address || hotel.city) && (
                <View style={styles.locationRow}>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)' }}>{'📍'}</Text>
                  <Text style={styles.locationText} numberOfLines={1}>
                    {[hotel.address, hotel.city].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              )}
              {hotel.stars !== undefined && hotel.stars > 0 && (
                <StarRow count={hotel.stars} rating={hotel.rating} />
              )}
            </View>
          </View>
        </LinearGradient>

        {/* Favourite button — top-right corner of photo */}
        <View style={styles.favWrap}>
          <FavoriteButton type="hotel" item={hotel} size={18} />
        </View>
      </View>

      {/* ── Card body ── */}
      <View style={styles.cardBody}>

        {/* ── 3. Amenities chips (first 3) ── */}
        {topAmenities.length > 0 && (
          <View style={styles.amenitiesRow}>
            {topAmenities.map((a, i) => (
              <AmenityChip key={i} label={a} colors={colors} />
            ))}
          </View>
        )}

        {/* ── Dates row ── */}
        {hotel.checkIn && hotel.checkOut && (
          <View style={styles.datesRow}>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginRight: 4 }}>{'📅'}</Text>
            <Text style={[styles.datesText, { color: colors.text }]}>
              {formatDate(hotel.checkIn)} — {formatDate(hotel.checkOut)}
            </Text>
            {nights > 0 && (
              <Text style={[styles.nightsText, { color: colors.textMuted }]}>
                ({nights} {nights === 1 ? 'ночь' : nights < 5 ? 'ночи' : 'ночей'})
              </Text>
            )}
          </View>
        )}

        {/* ── 4. Price per night (large, amber) ── */}
        <View style={styles.priceRow}>
          <Text style={[styles.pricePerNight, { color: colors.primary }]}>
            {currencySymbol}{hotel.pricePerNight.toLocaleString('ru-RU')}
            <Text style={[styles.pricePerNightLabel, { color: colors.textMuted }]}>/ночь</Text>
          </Text>
          {total !== undefined && (
            <Text style={[styles.totalPrice, { color: colors.textMuted }]}>
              Итого: {currencySymbol}{total.toLocaleString('ru-RU')}
            </Text>
          )}
        </View>

        {/* ── 5. "Посмотреть" button ── */}
        <View style={[styles.bottomDivider, { backgroundColor: colors.border }]} />
        <TouchableOpacity
          style={[styles.bookBtn, { backgroundColor: colors.primary }]}
          onPress={onBook ?? handlePress}
          activeOpacity={0.8}
        >
          <Text style={[styles.bookBtnText, { color: colors.textInverse }]}>Посмотреть →</Text>
        </TouchableOpacity>

      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    marginHorizontal: 0,
    marginVertical: 4,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  // Photo area
  photoContainer: {
    width: '100%',
    height: 140,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: 140,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  overlayContent: {
    gap: 3,
  },
  overlayHotelName: {
    color: '#FFFFFF',
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    fontFamily: 'Sora',
    lineHeight: 22,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  overlayBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  locationText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: Typography.sizes.xs,
    flex: 1,
  },

  // Favourite button over photo
  favWrap: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 20,
    padding: 5,
  },

  // Card body (below photo)
  cardBody: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },

  // 3. Amenities chips
  amenitiesRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'nowrap',
  },

  // Dates
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  datesText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    flexShrink: 1,
  },
  nightsText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
  },

  // 4. Price row
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 0,
  },
  pricePerNight: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    fontFamily: 'Sora',
    lineHeight: 28,
  },
  pricePerNightLabel: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  totalPrice: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
  },

  // 5. Bottom button
  bottomDivider: {
    height: 1,
    marginTop: 12,
    marginBottom: 10,
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.buttonSm,
    paddingVertical: 10,
  },
  bookBtnText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.3,
  },
});
