import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Typography } from '../constants/typography';
import { Radius } from '../constants/radius';
import { Spacing } from '../constants/spacing';

// ── Mock hotel data ───────────────────────────────────────────────────────────

interface MockHotel {
  id: string;
  name: string;
  city: string;
  stars: number;
  pricePerNight: number;
  currency: string;
  rating: number;
  emoji: string;
}

const MOCK_HOTELS: MockHotel[] = [
  { id: '1', name: 'Hotel Arts Barcelona', city: 'Барселона', stars: 5, pricePerNight: 320, currency: '€', rating: 9.2, emoji: '🏨' },
  { id: '2', name: 'Catalonia Plaza', city: 'Барселона', stars: 4, pricePerNight: 145, currency: '€', rating: 8.4, emoji: '🏩' },
  { id: '3', name: 'Hotel W Barcelona', city: 'Барселона', stars: 5, pricePerNight: 410, currency: '€', rating: 9.0, emoji: '🌊' },
  { id: '4', name: 'Praktik Rambla', city: 'Барселона', stars: 4, pricePerNight: 98, currency: '€', rating: 8.1, emoji: '🛏️' },
  { id: '5', name: 'Nobu Hotel Barcelona', city: 'Барселона', stars: 5, pricePerNight: 280, currency: '€', rating: 8.8, emoji: '🍾' },
  { id: '6', name: 'Generator Barcelona', city: 'Барселона', stars: 3, pricePerNight: 55, currency: '€', rating: 7.9, emoji: '🎒' },
];

// ── Hotel list card ───────────────────────────────────────────────────────────

interface HotelListCardProps {
  hotel: MockHotel;
}

function HotelListCard({ hotel }: HotelListCardProps) {
  const stars = '★'.repeat(hotel.stars) + '☆'.repeat(5 - hotel.stars);
  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.emojiWrap}>
        <Text style={cardStyles.emoji}>{hotel.emoji}</Text>
      </View>
      <View style={cardStyles.info}>
        <Text style={cardStyles.name} numberOfLines={1}>{hotel.name}</Text>
        <Text style={cardStyles.stars}>{stars}</Text>
        <Text style={cardStyles.city}>{hotel.city}</Text>
      </View>
      <View style={cardStyles.priceBlock}>
        <Text style={cardStyles.price}>
          {hotel.currency}{hotel.pricePerNight}
        </Text>
        <Text style={cardStyles.perNight}>/ночь</Text>
        <View style={cardStyles.ratingBadge}>
          <Text style={cardStyles.ratingText}>{hotel.rating.toFixed(1)}</Text>
        </View>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  emojiWrap: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: `${Colors.primary}15`,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 26,
  },
  info: {
    flex: 1,
  },
  name: {
    color: Colors.text,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    marginBottom: 2,
  },
  stars: {
    color: Colors.primary,
    fontSize: Typography.sizes.xs,
    marginBottom: 2,
  },
  city: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
  },
  priceBlock: {
    alignItems: 'flex-end',
    gap: 4,
  },
  price: {
    color: Colors.primary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  perNight: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    marginTop: -4,
  },
  ratingBadge: {
    backgroundColor: Colors.success,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 2,
  },
  ratingText: {
    color: '#fff',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
});

// ── Screen ────────────────────────────────────────────────────────────────────

export default function HotelsMapWeb() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Карта отелей</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Map placeholder */}
        <LinearGradient
          colors={['#12121F', '#1A2340', '#12121F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.mapPlaceholder}
        >
          {/* Grid lines decorative — static positions */}
          <View style={[styles.gridLineH, { top: 70 }]} pointerEvents="none" />
          <View style={[styles.gridLineH, { top: 140 }]} pointerEvents="none" />
          <View style={[styles.gridLineH, { top: 210 }]} pointerEvents="none" />
          <View style={[styles.gridLineV, { left: 70 }]} pointerEvents="none" />
          <View style={[styles.gridLineV, { left: 150 }]} pointerEvents="none" />
          <View style={[styles.gridLineV, { left: 230 }]} pointerEvents="none" />
          <View style={[styles.gridLineV, { left: 310 }]} pointerEvents="none" />

          {/* Mock map pins */}
          <View style={[styles.mapPin, { top: 70, left: 60 }]}>
            <Text style={styles.pinText}>€320</Text>
          </View>
          <View style={[styles.mapPin, styles.mapPinSelected, { top: 110, left: 160 }]}>
            <Text style={[styles.pinText, styles.pinTextSelected]}>€145</Text>
          </View>
          <View style={[styles.mapPin, { top: 160, left: 100 }]}>
            <Text style={styles.pinText}>€98</Text>
          </View>
          <View style={[styles.mapPin, { top: 55, left: 230 }]}>
            <Text style={styles.pinText}>€410</Text>
          </View>

          {/* Overlay message */}
          <View style={styles.overlayMsg}>
            <Ionicons name="map-outline" size={32} color={Colors.primary} />
            <Text style={styles.overlayTitle}>Карта отелей</Text>
            <Text style={styles.overlaySubtitle}>
              Интерактивная карта доступна{'\n'}в мобильном приложении
            </Text>
            <View style={styles.appBadge}>
              <Text style={styles.appBadgeText}>Expo Go / iOS / Android</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Hotel list section */}
        <View style={styles.listSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.accent} />
            <View>
              <Text style={styles.sectionTitle}>Отели в Барселоне</Text>
              <Text style={styles.sectionSubtitle}>{MOCK_HOTELS.length} вариантов</Text>
            </View>
          </View>

          {MOCK_HOTELS.map((hotel) => (
            <HotelListCard key={hotel.id} hotel={hotel} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    color: Colors.text,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  mapPlaceholder: {
    height: 280,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: `${Colors.border}60`,
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: `${Colors.border}60`,
  },
  mapPin: {
    position: 'absolute',
    backgroundColor: Colors.card,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  mapPinSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pinText: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: Typography.weights.bold,
  },
  pinTextSelected: {
    color: Colors.textInverse,
  },
  overlayMsg: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,10,20,0.72)',
    gap: 8,
  },
  overlayTitle: {
    color: Colors.text,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  overlaySubtitle: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.base,
    textAlign: 'center',
    lineHeight: 22,
  },
  appBadge: {
    marginTop: 4,
    backgroundColor: `${Colors.primary}20`,
    borderWidth: 1,
    borderColor: `${Colors.primary}50`,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  appBadgeText: {
    color: Colors.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  listSection: {
    paddingHorizontal: 16,
    marginTop: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing.md,
  },
  accent: {
    width: 3,
    height: 20,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  sectionSubtitle: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    marginTop: 1,
  },
});
