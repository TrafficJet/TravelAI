import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBookingStore } from '../../stores/bookingStore';
import { bookingService } from '../../services/bookingService';
import { FlightCard } from '../../components/booking/FlightCard';
import { HotelCard } from '../../components/booking/HotelCard';
import { SkeletonBookingItem } from '../../components/ui/Skeleton';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Radius } from '../../constants/radius';
import { Spacing } from '../../constants/spacing';
import { toast } from '../../lib/toast';
import { EmptyState } from '../../components/ui/EmptyState';
import { useTranslation } from 'react-i18next';
import type { Booking, BookingStatus, FlightDetails, HotelDetails } from '../../types';

type FilterTab = 'ALL' | 'CONFIRMED' | 'CANCELLED';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'ALL', label: 'Все' },
  { key: 'CONFIRMED', label: 'Активные' },
  { key: 'CANCELLED', label: 'Отменённые' },
];

const STATUS_BADGE_COLORS: Record<BookingStatus, string> = {
  PENDING: Colors.warning,
  CONFIRMED: Colors.success,
  CANCELLED: Colors.error,
  FAILED: Colors.error,
};

const STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: 'Ожидает',
  CONFIRMED: 'Подтверждено',
  CANCELLED: 'Отменено',
  FAILED: 'Ошибка',
};

function StatusBadge({ status }: { status: BookingStatus }) {
  const color = STATUS_BADGE_COLORS[status];
  return (
    <View style={[badgeStyles.wrap, { backgroundColor: `${color}22` }]}>
      <View style={[badgeStyles.dot, { backgroundColor: color }]} />
      <Text style={[badgeStyles.label, { color }]}>{STATUS_LABELS[status]}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.chip,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  label: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
});

function getBookingSearchText(booking: Booking): string {
  if (booking.type === 'FLIGHT') {
    const d = booking.details as FlightDetails;
    return `${d.origin} ${d.destination} ${d.airline} ${d.flightNumber}`.toLowerCase();
  }
  const d = booking.details as HotelDetails;
  return `${d.name} ${d.address}`.toLowerCase();
}

const PAGE_SIZE = 20;

export default function BookingsScreen() {
  const { bookings, load, isLoading, appendBookings } = useBookingStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { t } = useTranslation();

  const fetchPage = useCallback(
    async (pageNum: number) => {
      try {
        const response = await bookingService.getBookings({ page: pageNum, limit: PAGE_SIZE });
        setHasMore(pageNum < response.totalPages);
        return response.bookings ?? [];
      } catch {
        toast.error('Ошибка загрузки бронирований');
        return [];
      }
    },
    [],
  );

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
    fetchBookings();
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

  const filtered = useMemo(() => {
    const all = bookings ?? [];
    const byFilter = filter === 'ALL' ? all : all.filter((b) => b.status === filter);
    if (!search.trim()) return byFilter;
    const q = search.toLowerCase();
    return byFilter.filter((b) => getBookingSearchText(b).includes(q));
  }, [bookings, filter, search]);

  if (isLoading && (bookings ?? []).length === 0) {
    return (
      <View style={styles.container}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBookingItem key={i} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск по маршруту или отелю..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTER_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.chip, filter === tab.key && styles.chipActive]}
            onPress={() => setFilter(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, filter === tab.key && styles.chipTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const content = item.type === 'FLIGHT' ? (
            <View>
              <FlightCard booking={item} onPress={() => handleBookingPress(item)} />
              <View style={styles.badgeWrap}>
                <StatusBadge status={item.status} />
              </View>
            </View>
          ) : (
            <View>
              <HotelCard booking={item} onPress={() => handleBookingPress(item)} />
              <View style={styles.badgeWrap}>
                <StatusBadge status={item.status} />
              </View>
            </View>
          );

          return (
            <Animated.View entering={FadeInDown.delay(Math.min(index * 80, 400)).springify()}>
              {content}
            </Animated.View>
          );
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        contentInset={{ top: 12, bottom: 12 }}
        contentContainerStyle={
          filtered.length === 0 ? styles.emptyContainer : styles.listContent
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="briefcase-outline"
            title={t('bookings.empty')}
            subtitle={t('bookings.emptyDesc')}
            onAction={() => router.push('/(tabs)')}
            actionLabel="Начни поиск в чате"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    borderRadius: Radius.input,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: Typography.sizes.base,
    paddingVertical: Spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.chip,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  chipTextActive: {
    color: Colors.textInverse,
  },
  badgeWrap: {
    paddingHorizontal: 16,
    marginTop: -4,
    marginBottom: 8,
  },
  listContent: {
    paddingBottom: 12,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
