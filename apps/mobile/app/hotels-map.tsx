import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/theme/ThemeContext';
import type { Hotel } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MOSCOW_REGION: Region = {
  latitude: 55.7558,
  longitude: 37.6176,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

// ── Price marker ──────────────────────────────────────────────────────────────

interface PriceMarkerProps {
  price: number;
  currency: string;
  selected: boolean;
  onPress: () => void;
}

function PriceMarker({ price, currency, selected, onPress }: PriceMarkerProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(selected ? 1.2 : 1);

  useEffect(() => {
    scale.value = withSpring(selected ? 1.2 : 1, { damping: 12, stiffness: 200 });
  }, [selected, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const currencySymbol = currency === 'USD' ? '$' : currency;
  const label =
    price >= 1000
      ? `${Math.round(price / 1000)}к ${currencySymbol}`
      : `${price} ${currencySymbol}`;

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={[
          markerStyles.bubble,
          {
            backgroundColor: selected ? colors.primary : colors.card,
            borderColor: selected ? colors.primary : colors.border,
            shadowColor: colors.background,
          },
        ]}
      >
        <Text style={[markerStyles.text, { color: selected ? '#fff' : colors.text }]}>
          {label}
        </Text>
      </TouchableOpacity>
      <View style={[
        markerStyles.pin,
        {
          backgroundColor: selected ? colors.primary : colors.card,
          borderColor: selected ? colors.primary : colors.border,
          shadowColor: colors.background,
        },
      ]} />
    </Animated.View>
  );
}

const markerStyles = StyleSheet.create({
  bubble: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1.5,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
  pin: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    alignSelf: 'center',
    marginTop: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
});

// ── Mini hotel card ───────────────────────────────────────────────────────────

interface MiniCardProps {
  hotel: Hotel;
  onClose: () => void;
  onOpen: () => void;
}

function MiniCard({ hotel, onClose, onOpen }: MiniCardProps) {
  const { colors } = useTheme();
  const currencySymbol = hotel.currency === 'USD' ? '$' : hotel.currency;
  return (
    <Animated.View entering={FadeInDown.springify()} style={miniCardStyles.wrapper}>
      <TouchableOpacity
        style={[
          miniCardStyles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.background,
          },
        ]}
        onPress={onOpen}
        activeOpacity={0.85}
      >
        <View style={miniCardStyles.content}>
          <Text style={[miniCardStyles.name, { color: colors.text }]} numberOfLines={1}>{hotel.name}</Text>
          {hotel.city && (
            <View style={miniCardStyles.locationRow}>
              <Ionicons name="location-outline" size={12} color={colors.textMuted} />
              <Text style={[miniCardStyles.city, { color: colors.textMuted }]}>{hotel.city}</Text>
            </View>
          )}
          <View style={miniCardStyles.footer}>
            {hotel.rating !== undefined && (
              <View style={[miniCardStyles.ratingBadge, { backgroundColor: `${colors.warning}22` }]}>
                <Ionicons name="star" size={11} color={colors.warning} />
                <Text style={[miniCardStyles.ratingText, { color: colors.warning }]}>{hotel.rating.toFixed(1)}</Text>
              </View>
            )}
            <Text style={[miniCardStyles.price, { color: colors.primary }]}>
              {hotel.pricePerNight.toLocaleString('ru-RU')} {currencySymbol}/ночь
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={miniCardStyles.closeBtn}
          onPress={onClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const miniCardStyles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  city: {
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
});

// ── Screen ────────────────────────────────────────────────────────────────────

export default function HotelsMapScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const raw = useLocalSearchParams();
  const mapRef = useRef<MapView>(null);

  const [region, setRegion] = useState<Region>(MOSCOW_REGION);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);

  // Parse hotels from params (JSON string) or use mock
  const hotels: Hotel[] = (() => {
    try {
      const param = Array.isArray(raw.hotels) ? raw.hotels[0] : raw.hotels;
      if (param) return JSON.parse(param) as Hotel[];
    } catch {
      // Fall through to empty
    }
    return [];
  })();

  // Request location on mount
  useEffect(() => {
    if (Platform.OS === 'web') return;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      });
    })();
  }, []);

  function handleMarkerPress(hotel: Hotel) {
    setSelectedHotel((prev) => (prev?.id === hotel.id ? null : hotel));
  }

  function handleMiniCardOpen() {
    if (!selectedHotel) return;
    router.push({
      pathname: '/hotel-detail',
      params: {
        hotelId: selectedHotel.id,
        name: selectedHotel.name,
        address: selectedHotel.address ?? '',
        city: selectedHotel.city ?? '',
        stars: String(selectedHotel.stars ?? 0),
        pricePerNight: String(selectedHotel.pricePerNight),
        currency: selectedHotel.currency,
        checkIn: selectedHotel.checkIn ?? '',
        checkOut: selectedHotel.checkOut ?? '',
        rooms: String(selectedHotel.rooms ?? 1),
        guests: String(selectedHotel.guests ?? 1),
        rating: selectedHotel.rating !== undefined ? String(selectedHotel.rating) : '',
        description: selectedHotel.description ?? '',
      },
    });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {hotels.map((hotel) =>
          hotel.latitude !== undefined && hotel.longitude !== undefined ? (
            <Marker
              key={hotel.id}
              coordinate={{ latitude: hotel.latitude, longitude: hotel.longitude }}
              onPress={() => handleMarkerPress(hotel)}
              tracksViewChanges={false}
            >
              <PriceMarker
                price={hotel.pricePerNight}
                currency={hotel.currency}
                selected={selectedHotel?.id === hotel.id}
                onPress={() => handleMarkerPress(hotel)}
              />
            </Marker>
          ) : null,
        )}
      </MapView>

      {/* Back button */}
      <TouchableOpacity
        style={[
          styles.backBtn,
          {
            top: insets.top + 12,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.background,
          },
        ]}
        onPress={() => router.back()}
        activeOpacity={0.85}
      >
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </TouchableOpacity>

      {/* Header title */}
      <View style={[styles.headerTitle, { top: insets.top + 12 }]}>
        <Text style={[
          styles.headerText,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}>Отели на карте</Text>
      </View>

      {/* List button — bottom right */}
      <TouchableOpacity
        style={[
          styles.listBtn,
          {
            bottom: insets.bottom + 24,
            backgroundColor: colors.primary,
            shadowColor: colors.primary,
          },
        ]}
        onPress={() => router.back()}
        activeOpacity={0.85}
      >
        <Ionicons name="list" size={18} color="#fff" />
        <Text style={styles.listBtnText}>Список</Text>
      </TouchableOpacity>

      {/* Mini hotel card */}
      {selectedHotel && (
        <MiniCard
          hotel={selectedHotel}
          onClose={() => setSelectedHotel(null)}
          onOpen={handleMiniCardOpen}
        />
      )}

      {/* Empty state when no hotels have coordinates */}
      {hotels.length === 0 && (
        <View style={[styles.emptyOverlay, { top: insets.top + 70 }]}>
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="map-outline" size={24} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Нет отелей для отображения</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
  },
  headerTitle: {
    position: 'absolute',
    alignSelf: 'center',
    left: 72,
    right: 72,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  listBtn: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  listBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  emptyText: {
    fontSize: 14,
  },
});
