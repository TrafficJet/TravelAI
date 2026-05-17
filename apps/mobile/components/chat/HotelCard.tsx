import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { FavoriteButton } from '../ui/FavoriteButton';
import type { Hotel } from '../../types';

interface Props {
  hotel: Hotel;
  onBook?: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(currency: string): string {
  if (currency === 'USD') return '$';
  if (currency === 'EUR') return '€';
  if (currency === 'RUB') return '₽';
  return currency;
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

function StarRow({ count }: { count: number }) {
  const n = Math.min(5, Math.max(0, Math.round(count)));
  const empty = 5 - n;
  return (
    <View style={starStyles.row}>
      {Array.from({ length: n }).map((_, i) => (
        <Ionicons key={`f${i}`} name="star" size={12} color="#F59E0B" />
      ))}
      {Array.from({ length: empty }).map((_, i) => (
        <Ionicons key={`e${i}`} name="star-outline" size={12} color={Colors.border} />
      ))}
      <Text style={starStyles.label}>{count}-звёздочный</Text>
    </View>
  );
}

const starStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 1,
  },
  label: {
    color: Colors.textMuted,
    fontSize: 10,
    marginLeft: 4,
  },
});

// ── AmenityChip ───────────────────────────────────────────────────────────────

const AMENITY_ICONS: Record<string, string> = {
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
  return AMENITY_ICONS[key] ?? raw;
}

function AmenityChip({ label }: { label: string }) {
  return (
    <View style={amenityStyles.chip}>
      <Text style={amenityStyles.chipText}>{normalizeAmenity(label)}</Text>
    </View>
  );
}

const amenityStyles = StyleSheet.create({
  chip: {
    backgroundColor: Colors.elevated,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
  },
});

// ── HotelCard ─────────────────────────────────────────────────────────────────

export function HotelCard({ hotel, onBook }: Props) {
  const nights =
    hotel.checkIn && hotel.checkOut ? nightsCount(hotel.checkIn, hotel.checkOut) : 0;
  const currencySymbol = formatCurrency(hotel.currency);
  const total = nights > 0 ? hotel.pricePerNight * nights : undefined;

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
    });
  }

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.82} style={styles.card}>

      {/* Favorite — absolute top-right */}
      <View style={styles.favWrap}>
        <FavoriteButton type="hotel" item={hotel} size={18} />
      </View>

      {/* ── Header: icon + name + stars ── */}
      <View style={styles.headerRow}>
        <Text style={styles.hotelIcon}>🏨</Text>
        <View style={styles.headerMiddle}>
          <Text style={styles.hotelName} numberOfLines={2}>
            {hotel.name}
          </Text>
          {hotel.stars !== undefined && hotel.stars > 0 && (
            <StarRow count={hotel.stars} />
          )}
        </View>
      </View>

      {/* ── Location ── */}
      {(hotel.address || hotel.city) && (
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
          <Text style={styles.locationText} numberOfLines={1}>
            {[hotel.address, hotel.city].filter(Boolean).join(' · ')}
          </Text>
        </View>
      )}

      {/* ── Divider ── */}
      <View style={styles.divider} />

      {/* ── Dates row ── */}
      {hotel.checkIn && hotel.checkOut && (
        <View style={styles.datesRow}>
          <Text style={styles.datesIcon}>📅</Text>
          <Text style={styles.datesText}>
            {formatDate(hotel.checkIn)} — {formatDate(hotel.checkOut)}
          </Text>
          {nights > 0 && (
            <Text style={styles.nightsText}>({nights} {nights === 1 ? 'ночь' : nights < 5 ? 'ночи' : 'ночей'})</Text>
          )}
        </View>
      )}

      {/* ── Price row ── */}
      <View style={styles.priceRow}>
        <View style={styles.priceLeft}>
          <Text style={styles.pricePerNight}>
            {currencySymbol}{hotel.pricePerNight.toLocaleString('ru-RU')}
            <Text style={styles.pricePerNightLabel}>/ночь</Text>
          </Text>
          {total !== undefined && (
            <Text style={styles.totalPrice}>
              Итого: {currencySymbol}{total.toLocaleString('ru-RU')}
            </Text>
          )}
        </View>
      </View>

      {/* ── Amenities ── */}
      {hotel.amenities && hotel.amenities.length > 0 && (
        <>
          <View style={styles.divider} />
          <View style={styles.amenitiesRow}>
            {hotel.amenities.slice(0, 5).map((a, i) => (
              <AmenityChip key={i} label={a} />
            ))}
          </View>
        </>
      )}

      {/* ── Bottom action ── */}
      <View style={styles.bottomDivider} />
      <TouchableOpacity
        style={styles.bookBtn}
        onPress={onBook ?? handlePress}
        activeOpacity={0.8}
      >
        <Text style={styles.bookBtnText}>Посмотреть и забронировать</Text>
        <Text style={styles.bookBtnArrow}>→</Text>
      </TouchableOpacity>

    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    marginHorizontal: 0,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Fav
  favWrap: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
    paddingRight: 28,
  },
  hotelIcon: {
    fontSize: 20,
    lineHeight: 26,
    flexShrink: 0,
  },
  headerMiddle: {
    flex: 1,
    gap: 3,
  },
  hotelName: {
    color: Colors.text,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    fontFamily: 'Sora',
    lineHeight: 20,
  },

  // Location
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 10,
  },
  locationText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    flex: 1,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 10,
  },

  // Dates
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  datesIcon: {
    fontSize: 13,
  },
  datesText: {
    color: Colors.text,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    flexShrink: 1,
  },
  nightsText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
  },

  // Price row
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  priceLeft: {
    flex: 1,
    gap: 2,
  },
  pricePerNight: {
    color: Colors.primary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    fontFamily: 'Sora',
    lineHeight: 28,
  },
  pricePerNightLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.textMuted,
  },
  totalPrice: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
  },

  // Bottom action
  bottomDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginTop: 14,
    marginBottom: 10,
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: `${Colors.primary}50`,
    borderRadius: 12,
    paddingVertical: 10,
    gap: 6,
  },
  bookBtnText: {
    color: Colors.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    letterSpacing: 0.2,
  },
  bookBtnArrow: {
    color: Colors.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },

  // Amenities
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
});
