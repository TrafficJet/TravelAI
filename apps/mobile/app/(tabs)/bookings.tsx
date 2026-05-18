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
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBookingStore } from '../../stores/bookingStore';
import { bookingService } from '../../services/bookingService';
import { SkeletonBookingItem } from '../../components/ui/Skeleton';
import { Colors } from '../../constants/colors';
import { Typography, TextPresets } from '../../constants/typography';
import { Radius } from '../../constants/radius';
import { Spacing } from '../../constants/spacing';
import { toast } from '../../lib/toast';
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

const STATUS_BADGE_CONFIG: Record<BookingStatus, { bg: string; color: string; label: string }> = {
  CONFIRMED: { bg: Colors.successLight,  color: Colors.success, label: 'ПОДТВЕРЖДЕНО' },
  PENDING:   { bg: Colors.warningLight,  color: Colors.warning, label: 'ОЖИДАЕТ' },
  CANCELLED: { bg: Colors.errorLight,    color: Colors.error,   label: 'ОТМЕНЕНО' },
  FAILED:    { bg: Colors.errorLight,    color: Colors.error,   label: 'ОШИБКА' },
};

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

// ── Custom Header ─────────────────────────────────────────────────────────────

function BookingsHeader() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[headerStyles.container, { paddingTop: insets.top + 6 }]}>
      <View>
        <Text style={headerStyles.title}>Мои Брони</Text>
        <Text style={headerStyles.subtitle}>История поездок</Text>
      </View>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 10,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  title: {
    fontFamily: 'Sora',
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    ...TextPresets.label,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginTop: 2,
  },
});

// ── Filter Tabs ───────────────────────────────────────────────────────────────

interface FilterTabsProps {
  active: FilterTab;
  onChange: (tab: FilterTab) => void;
}

function FilterTabs({ active, onChange }: FilterTabsProps) {
  return (
    <View style={tabStyles.row}>
      {FILTER_TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={tabStyles.tab}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[tabStyles.label, isActive && tabStyles.labelActive]}>
              {tab.label}
            </Text>
            {isActive && <View style={tabStyles.underline} />}
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
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
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
    color: Colors.textMuted,
  },
  labelActive: {
    color: Colors.primary,
    fontWeight: Typography.weights.semibold,
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.primary,
  },
});

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BookingStatus }) {
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

const STATUS_STRIPE_COLOR: Record<BookingStatus, string> = {
  CONFIRMED: Colors.success,
  PENDING:   Colors.warning,
  CANCELLED: Colors.error,
  FAILED:    Colors.error,
};

function FlightCardContent({ booking }: { booking: Booking }) {
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
        <View style={cardStyles.iconCircle}>
          <Ionicons name="airplane-outline" size={18} color={Colors.primary} />
        </View>
        <View style={cardStyles.routeBlock}>
          <Text style={cardStyles.route} numberOfLines={1}>
            {origin} → {destination}
          </Text>
          <Text style={cardStyles.subtitle} numberOfLines={1}>
            {[airline, flightNumber].filter(Boolean).join(' ')}
            {cabin ? ` · ${cabin}` : ''}
          </Text>
        </View>
        <Text style={cardStyles.price}>
          {formatPrice(booking.totalPrice, booking.currency)}
        </Text>
      </View>

      {/* Status + date row */}
      <View style={cardStyles.metaRow}>
        <StatusBadge status={booking.status} />
        <Text style={cardStyles.metaText}>{dateLabel}</Text>
      </View>
    </View>
  );
}

function HotelCardContent({ booking }: { booking: Booking }) {
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
        <View style={cardStyles.iconCircle}>
          <Ionicons name="bed-outline" size={18} color={Colors.primary} />
        </View>
        <View style={cardStyles.routeBlock}>
          <Text style={cardStyles.route} numberOfLines={1}>
            {name}
          </Text>
          {address ? (
            <Text style={cardStyles.subtitle} numberOfLines={1}>
              {address}
            </Text>
          ) : null}
        </View>
        <Text style={cardStyles.price}>
          {formatPrice(booking.totalPrice, booking.currency)}
        </Text>
      </View>

      {/* Status + dates row */}
      <View style={cardStyles.metaRow}>
        <StatusBadge status={booking.status} />
        <Text style={cardStyles.metaText}>{datesLabel}</Text>
      </View>
    </View>
  );
}

function BookingCard({ booking, onPress, index }: BookingCardProps) {
  const stripeColor = STATUS_STRIPE_COLOR[booking.status];
  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 80, 400)).springify()}
      style={cardStyles.animatedWrap}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={cardStyles.card}
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
    backgroundColor: Colors.card,
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
    backgroundColor: Colors.primaryMuted,
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
    color: Colors.text,
    lineHeight: 20,
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  price: {
    fontFamily: 'Inter',
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.primary,
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
    color: Colors.textMuted,
    flex: 1,
    textAlign: 'right',
  },
});

// ── Empty State ───────────────────────────────────────────────────────────────

function BookingsEmptyState() {
  return (
    <View style={emptyStyles.container}>
      <LinearGradient
        colors={['rgba(245,158,11,0.20)', 'rgba(245,158,11,0.05)']}
        style={emptyStyles.iconWrap}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={emptyStyles.icon}>🎫</Text>
      </LinearGradient>

      <Text style={emptyStyles.title}>Пока нет бронирований</Text>
      <Text style={emptyStyles.subtitle}>
        Запросите рейс или отель в чате
      </Text>

      <TouchableOpacity
        style={emptyStyles.btn}
        onPress={() => router.push('/(tabs)')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#F59E0B', '#D97706']}
          style={emptyStyles.btnGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={emptyStyles.btnText}>Открыть чат</Text>
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
    borderColor: `${Colors.primary}40`,
    marginBottom: Spacing.sm,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontFamily: 'Sora',
    fontSize: 22,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    ...TextPresets.body,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  btn: {
    borderRadius: Radius.button,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: Colors.primary,
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
    color: Colors.textInverse,
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
      <View style={styles.container}>
        <BookingsHeader />
        <FilterTabs active={filter} onChange={setFilter} />
        <SkeletonList />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BookingsHeader />
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
            tintColor={Colors.primary}
            colors={[Colors.primary]}
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
              <ActivityIndicator color={Colors.primary} />
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
    backgroundColor: Colors.background,
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
