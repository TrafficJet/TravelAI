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

  const STATUS_BADGE_CONFIG: Record<BookingStatus, { bg: string; color: string; label: string; showCheck: boolean }> = {
    CONFIRMED: { bg: `${colors.success}20`, color: colors.success, label: 'ПОДТВЕРЖДЕНО', showCheck: true },
    PENDING:   { bg: `${colors.warning}20`, color: colors.warning, label: 'ОЖИДАЕТ',      showCheck: false },
    CANCELLED: { bg: `${colors.error}15`,   color: colors.error,   label: 'ОТМЕНЕНО',     showCheck: false },
    FAILED:    { bg: `${colors.error}15`,   color: colors.error,   label: 'ОШИБКА',       showCheck: false },
  };

  const { bg, color, label, showCheck } = STATUS_BADGE_CONFIG[status];
  return (
    <View style={[badgeStyles.wrap, { backgroundColor: bg, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
      {showCheck && <Ionicons name="checkmark" size={10} color={color} />}
      <Text style={[badgeStyles.label, { color }]}>
        {label}
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

// ── Active Trip Card — "СЛЕДУЮЩАЯ ПОЕЗДКА" ────────────────────────────────────

interface ActiveTripCardProps {
  booking: Booking;
  onPress: () => void;
}

function ActiveTripCard({ booking, onPress }: ActiveTripCardProps) {
  const { colors } = useTheme();
  const isFlight = booking.type === 'FLIGHT';
  const details = (booking.details ?? {}) as Partial<FlightDetails> & Partial<HotelDetails>;
  const title = isFlight
    ? `${details.origin ?? '—'} → ${details.destination ?? '—'}`
    : (details.name ?? 'Отель');
  const subtitle = isFlight
    ? [details.airline, details.flightNumber].filter(Boolean).join(' ')
    : (details.address ?? '');
  const dateStr = isFlight ? (details.departureDate ?? '') : (details.checkIn ?? '');
  const dateLabel = dateStr ? formatDepartureDate(dateStr) : '';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={activeTripStyles.card}
    >
      <LinearGradient
        colors={['rgba(245,158,11,0.11)', 'rgba(20,184,166,0.07)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={activeTripStyles.gradient}
      >
        <Text style={activeTripStyles.nextLabel}>СЛЕДУЮЩАЯ ПОЕЗДКА</Text>

        <View style={activeTripStyles.titleRow}>
          <Ionicons
            name={isFlight ? 'airplane-outline' : 'bed-outline'}
            size={18}
            color={colors.primary}
            style={{ marginRight: 8 }}
          />
          <Text style={[activeTripStyles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        </View>

        {subtitle ? (
          <Text style={[activeTripStyles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>{subtitle}</Text>
        ) : null}

        <View style={activeTripStyles.footerRow}>
          {dateLabel ? (
            <Text style={[activeTripStyles.date, { color: colors.textMuted }]}>{dateLabel}</Text>
          ) : null}
          <View style={activeTripStyles.confirmedBadge}>
            <Text style={activeTripStyles.confirmedText}>Подтверждено</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const activeTripStyles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.28)',
    overflow: 'hidden',
  },
  gradient: {
    padding: 16,
  },
  nextLabel: {
    fontSize: 9,
    fontWeight: '600' as const,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#F59E0B',
    marginBottom: 10,
    fontFamily: 'Inter',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontFamily: 'Sora',
    fontSize: 16,
    fontWeight: '700' as const,
    flex: 1,
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  date: {
    fontFamily: 'Inter',
    fontSize: 11,
  },
  confirmedBadge: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  confirmedText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '600' as const,
    fontFamily: 'Inter',
  },
});

// ── Past Trip Card ────────────────────────────────────────────────────────────

interface PastTripCardProps {
  booking: Booking & { _section?: string };
  onPress: () => void;
  index: number;
}

const TRIP_EMOJIS: Record<string, string> = {
  FLIGHT: '✈️',
  HOTEL: '🏨',
};

function PastTripCard({ booking, onPress, index }: PastTripCardProps) {
  const { colors } = useTheme();
  const isFlight = booking.type === 'FLIGHT';
  const details = (booking.details ?? {}) as Partial<FlightDetails> & Partial<HotelDetails>;
  const title = isFlight
    ? `${details.origin ?? '—'} → ${details.destination ?? '—'}`
    : (details.name ?? 'Отель');
  const dateStr = isFlight ? (details.departureDate ?? '') : (details.checkIn ?? '');
  const dateLabel = dateStr ? formatDepartureDate(dateStr) : '';
  const emoji = TRIP_EMOJIS[booking.type] ?? '🗺️';

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 80, 400)).springify()}
      style={pastCardStyles.wrap}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={[pastCardStyles.card, { backgroundColor: '#1C1C2E', borderColor: '#2A2A42' }]}
      >
        <View style={pastCardStyles.emojiBlock}>
          <Text style={pastCardStyles.emoji}>{emoji}</Text>
        </View>

        <View style={pastCardStyles.content}>
          <Text style={[pastCardStyles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
          {dateLabel ? (
            <Text style={[pastCardStyles.date, { color: colors.textMuted }]}>{dateLabel}</Text>
          ) : null}
          <View style={pastCardStyles.tagsRow}>
            <View style={pastCardStyles.tagGreen}>
              <Text style={pastCardStyles.tagGreenText}>Завершено</Text>
            </View>
            {isFlight && (
              <View style={pastCardStyles.tagBlue}>
                <Text style={pastCardStyles.tagBlueText}>Рейс</Text>
              </View>
            )}
            {!isFlight && (
              <View style={pastCardStyles.tagAmber}>
                <Text style={pastCardStyles.tagAmberText}>Отель</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={pastCardStyles.price}>{formatPrice(booking.totalPrice, booking.currency)}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const pastCardStyles = StyleSheet.create({
  wrap: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  card: {
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  emojiBlock: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emoji: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  date: {
    fontFamily: 'Inter',
    fontSize: 11,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  tagGreen: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagGreenText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '600' as const,
    fontFamily: 'Inter',
  },
  tagBlue: {
    backgroundColor: 'rgba(56,189,248,0.12)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagBlueText: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '600' as const,
    fontFamily: 'Inter',
  },
  tagAmber: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagAmberText: {
    color: '#F59E0B',
    fontSize: 9,
    fontWeight: '600' as const,
    fontFamily: 'Inter',
  },
  price: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#F4F4F8',
    flexShrink: 0,
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

  const allBookings = bookings ?? [];
  const filtered = useMemo(
    () => filterBookings(allBookings, filter),
    [allBookings, filter],
  );

  // Split into active (upcoming confirmed) and past
  const activeBookings = useMemo(
    () => filtered.filter((b) => (b.status === 'CONFIRMED' || b.status === 'PENDING') && !isBookingPast(b)),
    [filtered],
  );
  const pastBookings = useMemo(
    () => filtered.filter((b) => b.status === 'CONFIRMED' && isBookingPast(b)),
    [filtered],
  );
  const otherBookings = useMemo(
    () => filtered.filter(
      (b) => !(activeBookings.includes(b)) && !(pastBookings.includes(b)),
    ),
    [filtered, activeBookings, pastBookings],
  );

  if (isLoading && allBookings.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Мои поездки</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>Загрузка...</Text>
        </View>
        <FilterTabs active={filter} onChange={setFilter} />
        <SkeletonList />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Design header: "Мои поездки" in Sora bold 22px */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Мои поездки</Text>
        <Text style={[styles.headerSub, { color: colors.textMuted }]}>
          {allBookings.length} {allBookings.length === 1 ? 'поездка' : allBookings.length < 5 ? 'поездки' : 'поездок'}
          {activeBookings.length > 0 ? ` · ${activeBookings.length} активная` : ''}
        </Text>
      </View>

      <FilterTabs active={filter} onChange={setFilter} />

      <FlatList
        data={[
          // Active trips rendered via ListHeaderComponent
          ...pastBookings.map((b) => ({ ...b, _section: 'past' as const })),
          ...otherBookings.map((b) => ({ ...b, _section: 'other' as const })),
        ]}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <PastTripCard
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
        ListHeaderComponent={
          <View>
            {/* Active trip cards */}
            {activeBookings.map((b) => (
              <ActiveTripCard
                key={b.id}
                booking={b}
                onPress={() => handleBookingPress(b)}
              />
            ))}
            {/* Section label for past trips */}
            {pastBookings.length > 0 && (
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                Прошлые поездки
              </Text>
            )}
          </View>
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={activeBookings.length === 0 ? <BookingsEmptyState /> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    paddingTop: 4,
  },
  headerTitle: {
    fontFamily: 'Sora',
    fontSize: 22,
    fontWeight: '700',
    color: '#F4F4F8',
  },
  headerSub: {
    fontSize: 10,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingBottom: 8,
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
