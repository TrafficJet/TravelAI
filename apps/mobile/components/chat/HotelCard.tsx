import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Typography } from '../../constants/typography';
import { FavoriteButton } from '../ui/FavoriteButton';
import { useTheme } from '../../src/theme/ThemeContext';
import { useChatStore } from '../../stores/chatStore';
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1 },
  rating: { fontFamily: 'Inter', fontSize: 12, fontWeight: '700', marginLeft: 6 },
});

// ── AmenityChip ───────────────────────────────────────────────────────────────

const AMENITY_LABELS: Record<string, string> = {
  wifi: 'WiFi', pool: 'Бассейн', breakfast: 'Завтрак', spa: 'Спа',
  parking: 'Парковка', gym: 'Фитнес', restaurant: 'Ресторан',
  bar: 'Бар', airport_shuttle: 'Шаттл',
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
  chip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  chipText: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.medium },
});

// ── Hotel image placeholder ───────────────────────────────────────────────────

const HOTEL_GRADIENTS: [string, string][] = [
  ['#1A1040', '#3D2A6E'],
  ['#0D2137', '#1A4A6E'],
  ['#1A2A10', '#3D6E2A'],
  ['#37200D', '#6E4A1A'],
  ['#2A0D37', '#6E1A5A'],
  ['#0D3730', '#1A6E5A'],
];

function hotelGradientColors(hotel: Hotel): [string, string] {
  let h = 0;
  const seed = [hotel.name, hotel.address, hotel.city, String(hotel.pricePerNight)]
    .filter(Boolean)
    .join('-')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60);
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return HOTEL_GRADIENTS[h % HOTEL_GRADIENTS.length];
}

function hotelInitials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('');
}

function HotelImagePlaceholder({ hotel }: { hotel: Hotel }) {
  const [g1, g2] = hotelGradientColors(hotel);
  return (
    <LinearGradient
      colors={[g1, g2]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={placeholderStyles.container}
    >
      <Text style={placeholderStyles.initials}>{hotelInitials(hotel.name)}</Text>
    </LinearGradient>
  );
}

const placeholderStyles = StyleSheet.create({
  container: {
    width: '100%',
    height: 140,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: 'rgba(255,255,255,0.35)', fontSize: 48, fontWeight: '800', letterSpacing: 2, fontFamily: 'Inter' },
});

// ── Chat navigation helper ────────────────────────────────────────────────────

async function navigateToBookHotel(hotel: Hotel, nights: number) {
  const store = useChatStore.getState();
  let sessionId = store.sessions[0]?.id;
  const nightsLabel = nights > 0
    ? ` ${nights} ${nights === 1 ? 'ночь' : nights < 5 ? 'ночи' : 'ночей'}`
    : '';
  const datesLabel = hotel.checkIn && hotel.checkOut
    ? ` ${hotel.checkIn}—${hotel.checkOut}`
    : '';
  const message = `Забронируй отель ${hotel.name}${datesLabel}${nightsLabel}`;

  if (!sessionId) {
    try { sessionId = await store.createSession(); } catch { /* ignore */ }
  }
  if (sessionId) {
    router.push({ pathname: '/(tabs)/chat/[sessionId]', params: { sessionId, initialMessage: message } } as never);
  }
}

// ── HotelCard ─────────────────────────────────────────────────────────────────

export function HotelCard({ hotel, onBook }: Props) {
  const { colors } = useTheme();
  const [imgError, setImgError] = useState(false);
  const nights = hotel.checkIn && hotel.checkOut ? nightsCount(hotel.checkIn, hotel.checkOut) : 0;
  const currencySymbol = formatCurrency(hotel.currency);
  const total = nights > 0 ? hotel.pricePerNight * nights : undefined;
  const hasPhoto = !imgError && !!hotel.imageUrl;

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

  function handleBook() {
    if (onBook) { onBook(); } else { void navigateToBookHotel(hotel, nights); }
  }

  const topAmenities = hotel.amenities ? hotel.amenities.slice(0, 3) : [];

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.82} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.photoContainer}>
        {hasPhoto ? (
          <Image
            source={{ uri: hotel.imageUrl }}
            style={styles.photo}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <HotelImagePlaceholder hotel={hotel} />
        )}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.photoOverlay}>
          <View style={styles.overlayContent}>
            <Text style={styles.overlayHotelName} numberOfLines={1}>{hotel.name}</Text>
            <View style={styles.overlayBottom}>
              {(hotel.address || hotel.city) && (
                <View style={styles.locationRow}>
                  <Ionicons name="location-sharp" size={11} color="rgba(255,255,255,0.9)" />
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
        <View style={styles.favWrap}>
          <FavoriteButton type="hotel" item={hotel} size={18} />
        </View>
      </View>

      <View style={styles.cardBody}>
        {topAmenities.length > 0 && (
          <View style={styles.amenitiesRow}>
            {topAmenities.map((a, i) => <AmenityChip key={i} label={a} colors={colors} />)}
          </View>
        )}
        {hotel.checkIn && hotel.checkOut && (
          <View style={styles.datesRow}>
            <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
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
        <View style={[styles.bottomDivider, { backgroundColor: colors.border }]} />
        <TouchableOpacity style={[styles.bookBtn, { backgroundColor: colors.primary }]} onPress={handleBook} activeOpacity={0.8}>
          <Text style={[styles.bookBtnText, { color: colors.textInverse }]}>Забронировать →</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginHorizontal: 0,
    marginVertical: 4,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0px 4px 16px rgba(0,0,0,0.3)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12 },
    }),
    elevation: 3,
  },
  photoContainer: { width: '100%', height: 140, position: 'relative' },
  photo: { width: '100%', height: 140, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  photoOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 90,
    justifyContent: 'flex-end', paddingHorizontal: 12, paddingBottom: 10,
  },
  overlayContent: { gap: 3 },
  overlayHotelName: {
    color: '#FFFFFF', fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold,
    fontFamily: 'Inter', lineHeight: 22,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  overlayBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1 },
  locationText: { color: 'rgba(255,255,255,0.85)', fontSize: Typography.sizes.xs, flex: 1 },
  favWrap: { position: 'absolute', top: 10, right: 10, zIndex: 2, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 20, padding: 5 },
  cardBody: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14 },
  amenitiesRow: { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'nowrap' },
  datesRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10, flexWrap: 'wrap' },
  datesText: { fontFamily: 'Inter', fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium, flexShrink: 1 },
  nightsText: { fontFamily: 'Inter', fontSize: Typography.sizes.xs },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 0 },
  pricePerNight: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, fontFamily: 'Inter', lineHeight: 28 },
  pricePerNightLabel: { fontFamily: 'Inter', fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium },
  totalPrice: { fontFamily: 'Inter', fontSize: Typography.sizes.sm },
  bottomDivider: { height: 1, marginTop: 12, marginBottom: 10 },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 32, paddingVertical: 10,
    shadowColor: '#E8A020', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 4,
  },
  bookBtnText: { fontFamily: 'Inter', fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, letterSpacing: 0.3 },
});
