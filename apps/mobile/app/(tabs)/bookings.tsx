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
  CONFIRMED: { bg: 'rgba(16,185,129,0.15)',  color: '#10B981', label: 'ПОДТВЕРЖДЕНО' },
  PENDING:   { bg: 'rgba(245,158,11,0.15)',  color: '#F59E0B', label: 'ОЖИДАЕТ' },
  CANCELLED: { bg: 'rgba(244,63,94,0.15)',   color: '#F43F5E', label: 'ОТМЕНЕНО' },
  FAILED:    { bg: 'rgba(244,63,94,0.15)',   color: '#F43F5E', label: 'ОШИБКА' },
};

function getTypeIcon(booking: Booking): string {
  if (booking.type === 'HOTEL') return '🏨';
  return '✈️';
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
    if (booking.type === 'FLIGHT') {
      const details = booking.details as FlightDetails;
      return new Date(details.departureDate).getTime() < Date.now();
    }
    const details = booking.details as HotelDetails;
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
  const details = booking.details as FlightDetails;
  const departureStr = details.departureDate ?? '';
  const dateLabel = departureStr
    ? `${formatDepartureDate(departureStr)}, ${formatDepartureTime(departureStr)}`
    : '—';

  return (
    <>
      {/* Row 1: route + status */}
      <View style={cardStyles.topRow}>
        <View style={cardStyles.routeWrap}>
          <Text style={cardStyles.typeIcon}>✈️</Text>
          <Text style={cardStyles.route}>
            {details.origin} → {details.destination}
          </Text>
        </View>
        <StatusBadge status={booking.status} />
      </View>

      {/* Subtitle: airline + cabin */}
      <Text style={cardStyles.subtitle} numberOfLines={1}>
        {details.airline} {details.flightNumber}
        {details.cabin ? ` · ${details.cabin}` : ''}
      </Text>

      {/* Divider */}
      <View style={cardStyles.divider} />

      {/* Details rows */}
      <View style={cardStyles.detailRow}>
        <Text style={cardStyles.detailIcon}>📅</Text>
        <Text style={cardStyles.detailText}>{dateLabel}</Text>
      </View>
      <View style={cardStyles.detailRow}>
        <Text style={cardStyles.detailIcon}>💺</Text>
        <Text style={cardStyles.detailText}>
          {details.passengers} {details.passengers === 1 ? 'пассажир' : 'пассажира'}
        </Text>
      </View>
      <View style={cardStyles.detailRow}>
        <Text style={cardStyles.detailIcon}>💰</Text>
        <Text style={[cardStyles.detailText, cardStyles.price]}>
          {formatPrice(booking.totalPrice, booking.currency)}
        </Text>
      </View>
    </>
  );
}

function HotelCardContent({ booking }: { booking: Booking }) {
  const details = booking.details as HotelDetails;

  return (
    <>
      {/* Row 1: name + status */}
      <View style={cardStyles.topRow}>
        <View style={cardStyles.routeWrap}>
          <Text style={cardStyles.typeIcon}>🏨</Text>
          <Text style={cardStyles.route} numberOfLines={1}>
            {details.name}
          </Text>
        </View>
        <StatusBadge status={booking.status} />
      </View>

      {/* Subtitle: address */}
      <Text style={cardStyles.subtitle} numberOfLines={1}>
        {details.address}
      </Text>

      {/* Divider */}
      <View style={cardStyles.divider} />

      {/* Details rows */}
      <View style={cardStyles.detailRow}>
        <Text style={cardStyles.detailIcon}>📅</Text>
        <Text style={cardStyles.detailText}>
          {formatDepartureDate(details.checkIn)} — {formatDepartureDate(details.checkOut)}
        </Text>
      </View>
      <View style={cardStyles.detailRow}>
        <Text style={cardStyles.detailIcon}>🛏️</Text>
        <Text style={cardStyles.detailText}>
          {details.rooms} ном. · {details.guests} гост.
        </Text>
      </View>
      <View style={cardStyles.detailRow}>
        <Text style={cardStyles.detailIcon}>💰</Text>
        <Text style={[cardStyles.detailText, cardStyles.price]}>
          {formatPrice(booking.totalPrice, booking.currency)}
        </Text>
      </View>
    </>
  );
}

function BookingCard({ booking, onPress, index }: BookingCardProps) {
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
        {booking.type === 'FLIGHT' ? (
          <FlightCardContent booking={booking} />
        ) : (
          <HotelCardContent booking={booking} />
        )}

        {/* Divider before CTA */}
        <View style={cardStyles.divider} />

        {/* CTA row */}
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.7}
          style={cardStyles.ctaRow}
        >
          <Text style={cardStyles.ctaText}>Детали бронирования</Text>
          <Text style={cardStyles.ctaArrow}>→</Text>
        </TouchableOpacity>
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
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
    gap: Spacing.sm,
  },
  routeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  typeIcon: {
    fontSize: 18,
  },
  route: {
    ...TextPresets.bodyMedium,
    color: Colors.text,
    fontWeight: '600' as const,
    flex: 1,
  },
  subtitle: {
    ...TextPresets.small,
    color: Colors.textMuted,
    marginBottom: 10,
    marginLeft: 24,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  detailIcon: {
    fontSize: 14,
    width: 20,
    textAlign: 'center',
  },
  detailText: {
    ...TextPresets.small,
    color: Colors.text,
    flex: 1,
  },
  price: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  ctaText: {
    ...TextPresets.small,
    color: Colors.primary,
    fontWeight: '500' as const,
  },
  ctaArrow: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '400' as const,
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
    borderColor: 'rgba(245,158,11,0.25)',
    marginBottom: 8,
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
    fontFamily: 'Sora',
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
