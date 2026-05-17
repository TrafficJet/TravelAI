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
  row: { flexDirection: 'row', gap: 1 },
  star: { fontSize: 13, color: Colors.border },
  starActive: { color: Colors.warning },
});

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

export function HotelCard({ hotel, onBook }: Props) {
  const nights =
    hotel.checkIn && hotel.checkOut ? nightsCount(hotel.checkIn, hotel.checkOut) : 0;
  const currencySymbol = hotel.currency === 'RUB' ? '₽' : hotel.currency;

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
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8} style={styles.card}>
      {/* Favorite button — top right corner */}
      <View style={styles.favBtn}>
        <FavoriteButton type="hotel" item={hotel} size={20} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.typeIcon}>🏨</Text>
        {hotel.stars !== undefined && hotel.stars > 0 && <StarRow count={hotel.stars} />}
      </View>

      <Text style={styles.hotelName} numberOfLines={2}>{hotel.name}</Text>

      {(hotel.address || hotel.city) && (
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
          <Text style={styles.address} numberOfLines={1}>
            {[hotel.address, hotel.city].filter(Boolean).join(', ')}
          </Text>
        </View>
      )}

      {hotel.checkIn && hotel.checkOut && (
        <View style={styles.datesRow}>
          <Text style={styles.dates}>
            {formatDate(hotel.checkIn)} — {formatDate(hotel.checkOut)}
          </Text>
          {nights > 0 && <Text style={styles.nights}>{nights} ночей</Text>}
        </View>
      )}

      <View style={styles.footer}>
        {hotel.rating !== undefined && (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={11} color={Colors.warning} />
            <Text style={styles.ratingText}>{hotel.rating.toFixed(1)}</Text>
          </View>
        )}
        <Text style={styles.price}>
          {hotel.pricePerNight.toLocaleString('ru-RU')} {currencySymbol}/ночь
        </Text>
        {onBook && (
          <TouchableOpacity style={styles.bookBtn} onPress={onBook}>
            <Text style={styles.bookBtnText}>Забронировать</Text>
          </TouchableOpacity>
        )}
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
  favBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingRight: 32,
  },
  typeIcon: {
    fontSize: 18,
  },
  hotelName: {
    color: Colors.text,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    marginBottom: 4,
    paddingRight: 32,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 8,
  },
  address: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    flex: 1,
  },
  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dates: {
    color: Colors.text,
    fontSize: Typography.sizes.sm,
  },
  nights: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexWrap: 'wrap',
    gap: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: `${Colors.warning}22`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ratingText: {
    color: Colors.warning,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  price: {
    color: Colors.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  bookBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  bookBtnText: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
});
