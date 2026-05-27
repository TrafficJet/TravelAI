import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Typography } from '../../constants/typography';
import { Radius } from '../../constants/radius';
import { Spacing } from '../../constants/spacing';
import { useChatStore } from '../../stores/chatStore';
import { toast } from '../../lib/toast';
import { Skeleton } from '../../components/ui/Skeleton';
import { MultiCityForm } from '../../components/chat/MultiCityForm';
import { useTheme } from '../../src/theme/ThemeContext';
import api from '../../services/api';

// ── Static route data ─────────────────────────────────────────────────────────

interface StaticRoute {
  origin: string;
  destination: string;
  city: string;
  price: string;
  duration: string;
}

const WARSAW_ROUTES: StaticRoute[] = [
  { origin: 'WAW', destination: 'BCN', city: 'Барселона', price: 'от €49', duration: '3ч' },
  { origin: 'WAW', destination: 'LHR', city: 'Лондон', price: 'от €49', duration: '2ч 40м' },
  { origin: 'WAW', destination: 'FCO', city: 'Рим', price: 'от €49', duration: '2ч 45м' },
  { origin: 'WAW', destination: 'AMS', city: 'Амстердам', price: 'от €49', duration: '2ч 10м' },
];

const KYIV_ROUTES: StaticRoute[] = [
  { origin: 'KBP', destination: 'BCN', city: 'Барселона', price: 'от €59', duration: '3ч 30м' },
  { origin: 'KBP', destination: 'IST', city: 'Стамбул', price: 'от €80', duration: '2ч 20м' },
];

// ── Static route card ─────────────────────────────────────────────────────────

interface StaticRouteCardProps {
  item: StaticRoute;
  onPress: () => void;
  index: number;
}

function StaticRouteCard({ item, onPress, index }: StaticRouteCardProps) {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(index * 70).springify()}>
      <TouchableOpacity
        style={[routeCardStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={onPress}
        activeOpacity={0.75}
      >
        {/* Route code row with right arrow */}
        <View style={routeCardStyles.headerRow}>
          <View style={routeCardStyles.routeRow}>
            <Text style={[routeCardStyles.iata, { color: colors.text }]}>{item.origin}</Text>
            <Text style={[routeCardStyles.separator, { color: colors.primary }]}> → </Text>
            <Text style={[routeCardStyles.iata, { color: colors.text }]}>{item.destination}</Text>
          </View>
          <Text style={{ fontSize: 14, color: colors.textMuted, lineHeight: 18  }}>{'›'}</Text>
        </View>

        {/* City name */}
        <Text style={[routeCardStyles.city, { color: colors.textMuted }]} numberOfLines={1}>{item.city}</Text>

        {/* Price + duration */}
        <View style={routeCardStyles.footer}>
          <Text style={[routeCardStyles.price, { color: colors.primary }]}>{item.price}</Text>
          <Text style={[routeCardStyles.duration, { color: colors.textMuted }]}>{item.duration}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const routeCardStyles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    padding: 14,
    marginRight: Spacing.sm,
    width: 168,
    borderWidth: 1,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iata: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.3,
  },
  separator: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  city: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  duration: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
  },
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface PopularFlight {
  origin: string;
  destination: string;
  label: string;
  count: number;
}

interface PopularHotel {
  city: string;
  country: string;
  code: string;
  count: number;
}

// ── Country flag / emoji helpers ──────────────────────────────────────────────

const CITY_EMOJI: Record<string, string> = {
  AE: '🇦🇪',
  TH: '🇹🇭',
  TR: '🇹🇷',
  EG: '🇪🇬',
  ES: '🇪🇸',
  IT: '🇮🇹',
  FR: '🇫🇷',
  DE: '🇩🇪',
  JP: '🇯🇵',
  ID: '🇮🇩',
  MV: '🇲🇻',
  GR: '🇬🇷',
  CY: '🇨🇾',
  ME: '🇲🇪',
  GE: '🇬🇪',
  CZ: '🇨🇿',
  HU: '🇭🇺',
  RS: '🇷🇸',
  US: '🇺🇸',
  TN: '🇹🇳',
  MA: '🇲🇦',
  PT: '🇵🇹',
  CN: '🇨🇳',
};

function getCountryEmoji(code: string): string {
  return CITY_EMOJI[code.toUpperCase()] ?? '🌍';
}

// ── Flight card ───────────────────────────────────────────────────────────────

interface FlightCardProps {
  item: PopularFlight;
  onPress: () => void;
  index: number;
}

function FlightCard({ item, onPress, index }: FlightCardProps) {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
      <TouchableOpacity
        style={[flightStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={onPress}
        activeOpacity={0.75}
      >
        <Text style={[flightStyles.label, { color: colors.text }]}>{item.label}</Text>
        <View style={flightStyles.routeRow}>
          <Text style={[flightStyles.route, { color: colors.textMuted }]}>
            {item.origin}
          </Text>
          <Text style={[flightStyles.arrow, { fontSize: 12, color: colors.textMuted }]}>{'→'}</Text>
          <Text style={[flightStyles.route, { color: colors.textMuted }]}>
            {item.destination}
          </Text>
        </View>
        <Text style={[flightStyles.count, { color: colors.primary }]}>
          {item.count.toLocaleString('ru-RU')} запросов
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const flightStyles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    padding: Spacing.md,
    marginRight: Spacing.sm,
    width: 160,
    borderWidth: 1,
    justifyContent: 'space-between',
    minHeight: 110,
  },
  label: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.xs,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  route: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  arrow: {
    marginHorizontal: Spacing.xs,
  },
  count: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
});

// ── Hotel card ────────────────────────────────────────────────────────────────

interface HotelCardProps {
  item: PopularHotel;
  onPress: () => void;
  index: number;
}

function HotelCard({ item, onPress, index }: HotelCardProps) {
  const { colors } = useTheme();
  const emoji = getCountryEmoji(item.code);
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).springify()}
      style={{ flex: 1 }}
    >
      <TouchableOpacity
        style={[hotelStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={onPress}
        activeOpacity={0.75}
      >
        <Text style={hotelStyles.emoji}>{emoji}</Text>
        <Text style={[hotelStyles.city, { color: colors.text }]} numberOfLines={1}>
          {item.city}
        </Text>
        <Text style={[hotelStyles.country, { color: colors.textMuted }]} numberOfLines={1}>
          {item.country}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const hotelStyles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    padding: Spacing.md,
    flex: 1,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
  },
  emoji: {
    fontSize: Typography.sizes['2xl'],
    marginBottom: Spacing.sm,
  },
  city: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
  },
  country: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
    marginTop: 2,
  },
});

// ── Quick filter chips ────────────────────────────────────────────────────────

interface QuickFilter {
  label: string;
  emoji: string;
  query: string;
}

const QUICK_FILTERS: QuickFilter[] = [
  { label: 'Пляж', emoji: '🏖️', query: 'Пляжный отдых у моря' },
  { label: 'Горы', emoji: '⛰️', query: 'Отдых в горах' },
  { label: 'Города', emoji: '🏙️', query: 'Экскурсионный тур в крупный город' },
  { label: 'Экзотика', emoji: '🌴', query: 'Экзотический тур на острова' },
];

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { colors } = useTheme();
  return (
    <View style={sectionStyles.wrapper}>
      <View style={[sectionStyles.accent, { backgroundColor: colors.primary }]} />
      <View>
        <Text style={[sectionStyles.title, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[sectionStyles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  accent: {
    width: 3,
    height: 20,
    borderRadius: 2,
  },
  title: {
    fontFamily: 'Sora',
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    marginTop: 1,
  },
});

// ── Skeleton placeholders (shimmer-based) ──────────────────────────────────────

function SkeletonFlightRow() {
  return (
    <View style={skeletonStyles.row}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={skeletonStyles.flightCardWrap}>
          <Skeleton width={160} height={110} borderRadius={14} />
        </View>
      ))}
    </View>
  );
}

function SkeletonHotelGrid() {
  return (
    <View style={skeletonStyles.grid}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={skeletonStyles.hotelCardWrap}>
          <Skeleton width="100%" height={110} borderRadius={14} />
        </View>
      ))}
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 0,
  },
  flightCardWrap: {
    marginRight: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  hotelCardWrap: {
    width: '47%',
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ExploreScreen() {
  const { colors } = useTheme();
  const { createSession } = useChatStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [flights, setFlights] = useState<PopularFlight[]>([]);
  const [hotels, setHotels] = useState<PopularHotel[]>([]);
  const [flightsLoading, setFlightsLoading] = useState(true);
  const [hotelsLoading, setHotelsLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);

  // ── Fetch popular data ──────────────────────────────────────────────────

  useEffect(() => {
    api
      .get<PopularFlight[]>('/flights/popular')
      .then(({ data }) => setFlights(data))
      .catch(() => {}) // non-fatal — list stays empty
      .finally(() => setFlightsLoading(false));

    api
      .get<PopularHotel[]>('/hotels/popular')
      .then(({ data }) => setHotels(data))
      .catch(() => {})
      .finally(() => setHotelsLoading(false));
  }, []);

  // ── Navigate to chat with message ───────────────────────────────────────

  const openChat = useCallback(
    async (message: string) => {
      if (isNavigating) return;
      setIsNavigating(true);
      try {
        const sessionId = await createSession(message);
        router.push({
          pathname: '/chat/[sessionId]',
          params: { sessionId, initialMessage: message },
        });
      } catch {
        toast.error('Не удалось открыть чат. Попробуйте снова.');
      } finally {
        setIsNavigating(false);
      }
    },
    [createSession, isNavigating],
  );

  function handleSearchSubmit() {
    const q = searchQuery.trim();
    if (!q) return;
    openChat(q);
  }

  // ── Hotels grid (2 columns) ─────────────────────────────────────────────

  // Split hotels into rows of 2 for a 2-column grid
  const hotelRows: [PopularHotel, PopularHotel | null][] = [];
  for (let i = 0; i < Math.min(hotels.length, 6); i += 2) {
    hotelRows.push([hotels[i], hotels[i + 1] ?? null]);
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Search bar + map button */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.searchRow}>
        <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.searchIcon, { fontSize: 16, color: colors.textMuted }]}>{'⌕'}</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Куда летим?"
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            clearButtonMode="while-editing"
            editable={!isNavigating}
          />
          {isNavigating && (
            <ActivityIndicator size="small" color={colors.primary} style={styles.searchSpinner} />
          )}
        </View>
        <TouchableOpacity
          style={[styles.mapBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
          onPress={() => router.push('/hotels-map')}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 18, color: colors.textInverse, lineHeight: 22 }}>{'🗺'}</Text>
          <Text style={[styles.mapBtnText, { color: colors.textInverse }]}>Карта</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Warsaw routes */}
      <Animated.View entering={FadeInDown.delay(40).springify()} style={styles.section}>
        <SectionHeader title="Популярные из Варшавы" subtitle="Лучшие направления этой недели" />
        <FlatList
          data={WARSAW_ROUTES}
          keyExtractor={(item) => `${item.origin}-${item.destination}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          renderItem={({ item, index }) => (
            <StaticRouteCard
              item={item}
              index={index}
              onPress={() =>
                openChat(`Найди рейс из Варшавы ${item.origin} → ${item.destination} (${item.city})`)
              }
            />
          )}
        />
      </Animated.View>

      {/* Kyiv routes */}
      <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.section}>
        <SectionHeader title="Популярные из Киева" subtitle="Прямые и со стыковкой" />
        <FlatList
          data={KYIV_ROUTES}
          keyExtractor={(item) => `${item.origin}-${item.destination}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          renderItem={({ item, index }) => (
            <StaticRouteCard
              item={item}
              index={index}
              onPress={() =>
                openChat(`Найди рейс из Киева ${item.origin} → ${item.destination} (${item.city})`)
              }
            />
          )}
        />
      </Animated.View>

      {/* Popular flights */}
      <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.section}>
        <SectionHeader title="Популярные рейсы" />
        {flightsLoading ? (
          <SkeletonFlightRow />
        ) : flights.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Нет данных</Text>
        ) : (
          <FlatList
            data={flights}
            keyExtractor={(item) => `${item.origin}-${item.destination}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            renderItem={({ item, index }) => (
              <FlightCard
                item={item}
                index={index}
                onPress={() =>
                  openChat(`Найди рейс ${item.origin} → ${item.destination}`)
                }
              />
            )}
          />
        )}
      </Animated.View>

      {/* Popular destinations — hotels */}
      <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.section}>
        <SectionHeader title="Популярные направления" />
        {hotelsLoading ? (
          <SkeletonHotelGrid />
        ) : hotels.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Нет данных</Text>
        ) : (
          <View style={styles.grid}>
            {hotelRows.map((row, rowIdx) => (
              <View key={rowIdx} style={styles.gridRow}>
                <HotelCard
                  item={row[0]}
                  index={rowIdx * 2}
                  onPress={() =>
                    openChat(`Найди отели в ${row[0].city}`)
                  }
                />
                {row[1] ? (
                  <HotelCard
                    item={row[1]}
                    index={rowIdx * 2 + 1}
                    onPress={() =>
                      openChat(`Найди отели в ${row[1]!.city}`)
                    }
                  />
                ) : (
                  <View style={styles.gridEmpty} />
                )}
              </View>
            ))}
          </View>
        )}
      </Animated.View>

      {/* Quick filters */}
      <Animated.View entering={FadeInDown.delay(240).springify()} style={styles.section}>
        <SectionHeader title="Быстрые фильтры" />
        <View style={styles.chipRow}>
          {QUICK_FILTERS.map((f, i) => (
            <Animated.View key={f.label} entering={FadeInDown.delay(240 + i * 60).springify()}>
              <TouchableOpacity
                style={[styles.filterChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => openChat(f.query)}
                activeOpacity={0.75}
                disabled={isNavigating}
              >
                <Text style={styles.filterChipEmoji}>{f.emoji}</Text>
                <Text style={[styles.filterChipText, { color: colors.text }]}>{f.label}</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </Animated.View>

      {/* Multi-city section */}
      <Animated.View entering={FadeInDown.delay(320).springify()} style={styles.section}>
        <MultiCityForm onSearch={openChat} disabled={isNavigating} />
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 20,
    gap: 10,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.card,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.md,
    paddingVertical: 14,
  },
  searchSpinner: {
    marginLeft: Spacing.sm,
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.card,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  mapBtnText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  horizontalList: {
    paddingRight: 0,
  },
  grid: {
    gap: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridEmpty: {
    flex: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.chip,
    gap: Spacing.xs,
  },
  filterChipEmoji: {
    fontSize: Typography.sizes.md,
  },
  filterChipText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  emptyText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
});
