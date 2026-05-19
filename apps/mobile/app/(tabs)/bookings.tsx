import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useBookingStore } from '../../stores/bookingStore';
import { bookingService } from '../../services/bookingService';
import { SkeletonBookingItem } from '../../components/ui/Skeleton';
import { Typography, TextPresets } from '../../constants/typography';
import { Radius } from '../../constants/radius';
import { Spacing } from '../../constants/spacing';
import { toast } from '../../lib/toast';
import { useTheme } from '../../src/theme/ThemeContext';
import type { Booking, BookingStatus, FlightDetails, HotelDetails } from '../../types';

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterTab = 'ALL' | 'ACTIVE' | 'PAST' | 'CANCELLED';

interface FilterTabConfig {
  key: FilterTab;
  label: string;
}

const FILTER_TABS: FilterTabConfig[] = [
  { key: 'ALL',       label: 'Все' },
  { key: 'ACTIVE',    label: 'Активные' },
  { key: 'PAST',      label: 'Прошлые' },
  { key: 'CANCELLED', label: 'Отменённые' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTypeIconName(booking: Booking): React.ComponentProps<typeof Ionicons>['name'] {
  if (booking.type === 'HOTEL') return 'bed-outline';
  return 'airplane-outline';
}

function formatPrice(price: number | string, currency: string): string {
  const num = typeof price === 'number' ? price : Number(price);
  const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency;
  return `${symbol}${num.toFixed(2)}`;
}

function formatDepartureDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDepartureTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/**
 * "Past" means the departure/check-in date is before today.
 */
function isBookingPast(booking: Booking): boolean {
  try {
    if (!booking.details) return false;
    if (booking.type === 'FLIGHT') {
      const details = booking.details as Partial<FlightDetails>;
      if (!details.departureDate) return false;
      return new Date(details.departureDate).getTime() < Date.now();
    }
    const details = booking.details as Partial<HotelDetails>;
    if (!details.checkOut) return false;
    return new Date(details.checkOut).getTime() < Date.now();
  } catch {
    return false;
  }
}

function filterBookings(bookings: Booking[], tab: FilterTab): Booking[] {
  switch (tab) {
    case 'ACTIVE':
      return bookings.filter(
        (b) => (b.status === 'CONFIRMED' || b.status === 'PENDING') && !isBookingPast(b),
      );
    case 'PAST':
      return bookings.filter(
        (b) => b.status === 'CONFIRMED' && isBookingPast(b),
      );
    case 'CANCELLED':
      return bookings.filter((b) => b.status === 'CANCELLED' || b.status === 'FAILED');
    default:
      return bookings;
  }
}

const PAGE_SIZE = 20;

// ── Filter Tabs ───────────────────────────────────────────────────────────────

interface FilterTabsProps {
  active: FilterTab;
  onChange: (tab: FilterTab) => void;
}

function FilterTabs({ active, onChange }: FilterTabsProps) {
  const { colors } = useTheme();
  return (
    <View style={[tabStyles.row, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      {FILTER_TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={tabStyles.tab}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[tabStyles.label, { color: colors.textMuted }, isActive && { color: colors.primary, fontWeight: Typography.weights.semibold }]}>
              {tab.label}
            </Text>
            {isActive && <View style={[tabStyles.underline, { backgroundColor: colors.primary }]} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  tab: {
    marginRight: Spacing.lg,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  label: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
  },
});

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BookingStatus }) {
  const { colors } = useTheme();

  const STATUS_BADGE_CONFIG: Record<BookingStatus, { bg: string; color: string; label: string }> = {
    CONFIRMED: { bg: `${colors.success}20`, color: colors.success, label: 'ПОДТВЕРЖДЕНО' },
    PENDING:   { bg: `${colors.warning}20`, color: colors.warning, label: 'ОЖИДАЕТ' },
    CANCELLED: { bg: `${colors.error}15`,   color: colors.error,   label: 'ОТМЕНЕНО' },
    FAILED:    { bg: `${colors.error}15`,   color: colors.error,   label: 'ОШИБКА' },
  };

  const { bg, color, label } = STATUS_BADGE_CONFIG[status];
  const checkmark = status === 'CONFIRMED' ? ' ✓' : '';
  return (
    <View style={[badgeStyles.wrap, { backgroundColor: bg }]}>
      <Text style={[badgeStyles.label, { color }]}>
        {label}{checkmark}
      </Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.tag,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    letterSpacing: 0.5,
  },
});

// ── Booking Card ──────────────────────────────────────────────────────────────

interface BookingCardProps {
  booking: Booking;
  onPress: () => void;
  index: number;
}

function FlightCardContent({ booking }: { booking: Booking }) {
  const { colors } = useTheme();
  const details = (booking.details ?? {}) as Partial<FlightDetails>;
  const departureStr = details.departureDate ?? '';
  const dateLabel = departureStr
    ? `${formatDepartureDate(departureStr)}, ${formatDepartureTime(departureStr)}`
    : '—';
  const origin = details.origin ?? '—';
  const destination = details.destination ?? '—';
  const airline = details.airline ?? '';
  const flightNumber = details.flightNumber ?? '';
  const cabin = details.cabin ?? '';

  return (
    <View style={cardStyles.innerContent}>
      {/* Top row: icon + route + price */}
      <View style={cardStyles.topRow}>
        <View style={[cardStyles.iconCircle, { backgroundColor: `${colors.primary}15` }]}>
          <Ionicons name="airplane-outline" size={18} color={colors.primary} />
        </View>
        <View style={cardStyles.routeBlock}>
          <Text style={[cardStyles.route, { color: colors.text }]} numberOfLines={1}>
            {origin} → {destination}
          </Text>
          <Text style={[cardStyles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
            {[airline, flightNumber].filter(Boolean).join(' ')}
            {cabin ? ` · ${cabin}` : ''}
          </Text>
        </View>
        <Text style={[cardStyles.price, { color: colors.primary }]}>
          {formatPrice(booking.totalPrice, booking.currency)}
        </Text>
      </View>

      {/* Status + date row */}
      <View style={cardStyles.metaRow}>
        <StatusBadge status={booking.status} />
        <Text style={[cardStyles.metaText, { color: colors.textMuted }]}>{dateLabel}</Text>
      </View>
    </View>
  );
}

function HotelCardContent({ booking }: { booking: Booking }) {
  const { colors } = useTheme();
  const details = (booking.details ?? {}) as Partial<HotelDetails>;
  const name = details.name ?? 'Отель';
  const address = details.address ?? '';
  const checkIn = details.checkIn ?? '';
  const checkOut = details.checkOut ?? '';
  const datesLabel =
    checkIn && checkOut
      ? `${formatDepartureDate(checkIn)} — ${formatDepartureDate(checkOut)}`
      : '—';

  return (
    <View style={cardStyles.innerContent}>
      {/* Top row: icon + name + price */}
      <View style={cardStyles.topRow}>
        <View style={[cardStyles.iconCircle, { backgroundColor: `${colors.primary}15` }]}>
          <Ionicons name="bed-outline" size={18} color={colors.primary} />
        </View>
        <View style={cardStyles.routeBlock}>
          <Text style={[cardStyles.route, { color: colors.text }]} numberOfLines={1}>
            {name}
          </Text>
          {address ? (
            <Text style={[cardStyles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
              {address}
            </Text>
          ) : null}
        </View>
        <Text style={[cardStyles.price, { color: colors.primary }]}>
          {formatPrice(booking.totalPrice, booking.currency)}
        </Text>
      </View>

      {/* Status + dates row */}
      <View style={cardStyles.metaRow}>
        <StatusBadge status={booking.status} />
        <Text style={[cardStyles.metaText, { color: colors.textMuted }]}>{datesLabel}</Text>
      </View>
    </View>
  );
}

function BookingCard({ booking, onPress, index }: BookingCardProps) {
  const { colors } = useTheme();

  const STATUS_STRIPE_COLOR: Record<BookingStatus, string> = {
    CONFIRMED: colors.success,
    PENDING:   colors.warning,
    CANCELLED: colors.error,
    FAILED:    colors.error,
  };

  const stripeColor = STATUS_STRIPE_COLOR[booking.status];
  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 80, 400)).springify()}
      style={cardStyles.animatedWrap}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={[cardStyles.card, { backgroundColor: colors.card }]}
      >
        {/* Left status stripe */}
        <View style={[cardStyles.statusStripe, { backgroundColor: stripeColor }]} />

        {booking.type === 'FLIGHT' ? (
          <FlightCardContent booking={booking} />
        ) : (
          <HotelCardContent booking={booking} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const cardStyles = StyleSheet.create({
  animatedWrap: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  card: {
    borderRadius: Radius.card,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  statusStripe: {
    width: 4,
    borderRadius: 0,
  },
  innerContent: {
    flex: 1,
    padding: Spacing.md,
    gap: Spacing.itemGap,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  routeBlock: {
    flex: 1,
    gap: 2,
  },
  route: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700' as const,
    lineHeight: 20,
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  price: {
    fontFamily: 'Inter',
    fontSize: 17,
    fontWeight: '700' as const,
    flexShrink: 0,
    textAlign: 'right',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  metaText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '400' as const,
    flex: 1,
    textAlign: 'right',
  },
});

// ── Empty State ───────────────────────────────────────────────────────────────

function BookingsEmptyState() {
  const { colors } = useTheme();
  return (
    <View style={emptyStyles.container}>
      <LinearGradient
        colors={['rgba(245,158,11,0.20)', 'rgba(245,158,11,0.05)']}
        style={[emptyStyles.iconWrap, { borderColor: `${colors.primary}40` }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name="ticket-outline" size={38} color={colors.primary} />
      </LinearGradient>

      <Text style={[emptyStyles.title, { color: colors.text }]}>Пока нет бронирований</Text>
      <Text style={[emptyStyles.subtitle, { color: colors.textMuted }]}>
        Запросите рейс или отель в чате
      </Text>

      <TouchableOpacity
        style={[emptyStyles.btn, { shadowColor: colors.primary }]}
        onPress={() => router.replace('/(tabs)')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={emptyStyles.btnGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="arrow-back" size={18} color={colors.textInverse} />
            <Text style={[emptyStyles.btnText, { color: colors.textInverse }]}>В чат</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 40,
    gap: 16,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: 'Sora',
    fontSize: 22,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  subtitle: {
    ...TextPresets.body,
    textAlign: 'center',
  },
  btn: {
    borderRadius: Radius.button,
    overflow: 'hidden',
    marginTop: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  btnGradient: {
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: Radius.button,
    alignItems: 'center',
  },
  btnText: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
});

// ── Skeleton list ─────────────────────────────────────────────────────────────

function SkeletonList() {
  return (
    <View style={{ paddingTop: 12 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonBookingItem key={i} />
      ))}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function BookingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { bookings, load, isLoading, appendBookings } = useBookingStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('ALL');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchPage = useCallback(async (pageNum: number) => {
    try {
      const response = await bookingService.getBookings({ page: pageNum, limit: PAGE_SIZE });
      setHasMore(pageNum < response.totalPages);
      return response.bookings ?? [];
    } catch {
      toast.error('Ошибка загрузки бронирований');
      return [];
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      await load();
      setPage(1);
      const response = await bookingService.getBookings({ page: 1, limit: PAGE_SIZE });
      setHasMore(1 < response.totalPages);
    } catch {
      toast.error('Не удалось загрузить бронирования');
    }
  }, [load]);

  useEffect(() => {
    void fetchBookings();
  }, [fetchBookings]);

  async function handleRefresh() {
    setIsRefreshing(true);
    await fetchBookings();
    setIsRefreshing(false);
  }

  async function handleLoadMore() {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    const newBookings = await fetchPage(nextPage);
    appendBookings(newBookings);
    setPage(nextPage);
    setIsLoadingMore(false);
  }

  function handleBookingPress(booking: Booking) {
    router.push(`/bookings/${booking.id}`);
  }

  const filtered = useMemo(
    () => filterBookings(bookings ?? [], filter),
    [bookings, filter],
  );

  if (isLoading && (bookings ?? []).length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <FilterTabs active={filter} onChange={setFilter} />
        <SkeletonList />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <FilterTabs active={filter} onChange={setFilter} />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <BookingCard
            booking={item}
            index={index}
            onPress={() => handleBookingPress(item)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => { void handleRefresh(); }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={
          filtered.length === 0 ? styles.emptyContainer : styles.listContent
        }
        onEndReached={() => { void handleLoadMore(); }}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={<View style={{ height: Spacing.sm }} />}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={<BookingsEmptyState />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
