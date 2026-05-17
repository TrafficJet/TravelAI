import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ListRenderItemInfo,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Radius } from '../../constants/radius';
import { Spacing } from '../../constants/spacing';
import { useFavoritesStore } from '../../stores/favoritesStore';
import type { Hotel, FlightOffer } from '../../types';

// ── Tab selector ──────────────────────────────────────────────────────────────

type TabType = 'hotels' | 'flights';

interface TabSelectorProps {
  active: TabType;
  onChange: (tab: TabType) => void;
}

function TabSelector({ active, onChange }: TabSelectorProps) {
  return (
    <View style={tabStyles.container}>
      <TouchableOpacity
        style={[tabStyles.tab, active === 'hotels' && tabStyles.tabActive]}
        onPress={() => onChange('hotels')}
        activeOpacity={0.75}
      >
        <Text style={[tabStyles.label, active === 'hotels' && tabStyles.labelActive]}>
          Отели
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[tabStyles.tab, active === 'flights' && tabStyles.tabActive]}
        onPress={() => onChange('flights')}
        activeOpacity={0.75}
      >
        <Text style={[tabStyles.label, active === 'flights' && tabStyles.labelActive]}>
          Рейсы
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.xs,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  label: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  labelActive: {
    color: Colors.textInverse,
  },
});

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View style={emptyStyles.container}>
      <View style={emptyStyles.iconWrap}>
        <Ionicons name="heart-outline" size={48} color={Colors.textMuted} />
      </View>
      <Text style={emptyStyles.title}>Пока пусто</Text>
      <Text style={emptyStyles.subtitle}>
        Добавьте отели и рейсы в избранное
      </Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: 60,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: Radius.avatar,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    color: Colors.text,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    lineHeight: Typography.sizes.sm * Typography.lineHeights.normal,
  },
});

// ── Hotel row ─────────────────────────────────────────────────────────────────

interface HotelRowProps {
  hotel: Hotel;
  index: number;
  onRemove: () => void;
}

function HotelRow({ hotel, index, onRemove }: HotelRowProps) {
  const currencySymbol = hotel.currency === 'RUB' ? '₽' : hotel.currency;

  function handlePress() {
    router.push({
      pathname: '/hotel-detail',
      params: {
        hotelId: hotel.id,
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
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <TouchableOpacity style={rowStyles.card} onPress={handlePress} activeOpacity={0.8}>
        <View style={rowStyles.iconWrap}>
          <Text style={rowStyles.typeIcon}>🏨</Text>
        </View>
        <View style={rowStyles.info}>
          <Text style={rowStyles.name} numberOfLines={1}>{hotel.name}</Text>
          {(hotel.city || hotel.address) && (
            <Text style={rowStyles.sub} numberOfLines={1}>
              {[hotel.city, hotel.address].filter(Boolean).join(', ')}
            </Text>
          )}
          <Text style={rowStyles.price}>
            {hotel.pricePerNight.toLocaleString('ru-RU')} {currencySymbol}/ночь
          </Text>
        </View>
        <TouchableOpacity
          style={rowStyles.removeBtn}
          onPress={onRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={20} color={Colors.error} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Flight row ────────────────────────────────────────────────────────────────

interface FlightRowProps {
  flight: FlightOffer;
  index: number;
  onRemove: () => void;
}

function FlightRow({ flight, index, onRemove }: FlightRowProps) {
  const currencySymbol = flight.currency === 'RUB' ? '₽' : flight.currency;

  function handlePress() {
    router.push({
      pathname: '/flight-detail',
      params: {
        flightId: flight.id,
        origin: flight.origin,
        destination: flight.destination,
        departureDate: flight.departureDate,
        departureTime: flight.departureTime ?? '',
        arrivalTime: flight.arrivalTime ?? '',
        airline: flight.airline,
        flightNumber: flight.flightNumber,
        cabin: flight.cabin,
        stops: String(flight.stops ?? 0),
        durationMin: flight.durationMin !== undefined ? String(flight.durationMin) : '',
        price: String(flight.price),
        currency: flight.currency,
      },
    });
  }

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <TouchableOpacity style={rowStyles.card} onPress={handlePress} activeOpacity={0.8}>
        <View style={rowStyles.iconWrap}>
          <Ionicons name="airplane" size={22} color={Colors.primary} />
        </View>
        <View style={rowStyles.info}>
          <Text style={rowStyles.name} numberOfLines={1}>
            {flight.origin} → {flight.destination}
          </Text>
          <Text style={rowStyles.sub} numberOfLines={1}>
            {flight.airline} · {flight.flightNumber}
          </Text>
          <Text style={rowStyles.price}>
            {flight.price.toLocaleString('ru-RU')} {currencySymbol}
          </Text>
        </View>
        <TouchableOpacity
          style={rowStyles.removeBtn}
          onPress={onRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={20} color={Colors.error} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const rowStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.card,
    padding: 14,
    marginHorizontal: Spacing.md,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIcon: {
    fontSize: Typography.sizes.lg,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    color: Colors.text,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  sub: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
  },
  price: {
    color: Colors.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  removeBtn: {
    padding: Spacing.xs,
  },
});

// ── Screen ────────────────────────────────────────────────────────────────────

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>('hotels');
  const { hotels, flights, removeHotel, removeFlight } = useFavoritesStore();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Избранное</Text>
      </View>

      <TabSelector active={activeTab} onChange={setActiveTab} />

      {activeTab === 'hotels' ? (
        hotels.length === 0 ? (
          <EmptyState />
        ) : (
          <FlatList
            data={hotels}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }: ListRenderItemInfo<Hotel>) => (
              <HotelRow
                hotel={item}
                index={index}
                onRemove={() => removeHotel(item.id)}
              />
            )}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 16 },
            ]}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : flights.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={flights}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }: ListRenderItemInfo<FlightOffer>) => (
            <FlightRow
              flight={item}
              index={index}
              onRemove={() => removeFlight(item.id)}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 16 },
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.md,
  },
  title: {
    color: Colors.text,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.extrabold,
  },
  listContent: {
    paddingTop: Spacing.xs,
  },
});
