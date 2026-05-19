import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChatStore } from '../../stores/chatStore';
import { searchHistoryService } from '../../services/searchHistoryService';
import { SkeletonBookingCard } from '../../components/ui/Skeleton';
import { Typography } from '../../constants/typography';
import { Radius } from '../../constants/radius';
import { Spacing } from '../../constants/spacing';
import { toast } from '../../lib/toast';
import { useTheme } from '../../src/theme/ThemeContext';
import type { SearchHistoryItem } from '../../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
}

function formatSearchDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  });
}

// ── HistoryRow ────────────────────────────────────────────────────────────────

interface HistoryRowProps {
  item: SearchHistoryItem;
  onDelete: (id: string) => void;
  onRepeat: (item: SearchHistoryItem) => void;
}

function HistoryRow({ item, onDelete, onRepeat }: HistoryRowProps) {
  const { colors } = useTheme();
  const isFlight = item.type === 'FLIGHT';

  return (
    <View style={[styles.row, { backgroundColor: colors.card }]}>
      {/* Left icon */}
      <View style={[
        styles.iconWrap,
        { backgroundColor: isFlight ? `${colors.primary}15` : `${colors.success}20` },
      ]}>
        <Text style={{ fontSize: 20, color: isFlight ? colors.primary : colors.success, lineHeight: 24  }}>{'•'}</Text>
      </View>

      {/* Content */}
      <View style={styles.rowContent}>
        <Text style={[styles.query, { color: colors.text }]} numberOfLines={1}>
          {item.route ?? item.query}
        </Text>
        <View style={styles.metaRow}>
          {item.date ? (
            <Text style={[styles.metaText, { color: colors.textMuted }]}>{formatDate(item.date)}</Text>
          ) : null}
          {item.date ? <Text style={[styles.metaDot, { color: colors.textMuted }]}> · </Text> : null}
          <Text style={[styles.metaText, { color: colors.textMuted }]}>Поиск {formatSearchDate(item.createdAt)}</Text>
        </View>

        {/* Repeat button */}
        <TouchableOpacity
          style={[styles.repeatBtn, { borderColor: `${colors.primary}15`, backgroundColor: `${colors.primary}15` }]}
          onPress={() => onRepeat(item)}
          activeOpacity={0.75}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Text style={{ fontSize: 13, color: colors.primary, lineHeight: 17  }}>{'↺'}</Text>
          <Text style={[styles.repeatText, { color: colors.primary }]}>Повторить поиск</Text>
        </TouchableOpacity>
      </View>

      {/* Delete */}
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => onDelete(item.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={{ fontSize: 18, color: colors.error, lineHeight: 22  }}>{'🗑'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── SectionHeader ─────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  iconName: string;
  iconColor: string;
  count: number;
}

function SectionHeader({ title, iconName, iconColor, count }: SectionHeaderProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <Text style={{ fontSize: 16, color: iconColor, lineHeight: 20  }}>{'•'}</Text>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      <View style={[styles.countBadge, { backgroundColor: `${iconColor}22` }]}>
        <Text style={[styles.countText, { color: iconColor }]}>{count}</Text>
      </View>
    </View>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyHistoryState() {
  const { colors } = useTheme();
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyIcon}>🔍</Text>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>История пуста</Text>
      <Text style={[styles.emptySub, { color: colors.textMuted }]}>
        Твои поисковые запросы будут отображаться здесь
      </Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function SearchHistoryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<SearchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { createSession } = useChatStore();

  const load = useCallback(async () => {
    try {
      const response = await searchHistoryService.getHistory();
      setItems(response.data ?? []);
    } catch {
      toast.error('Не удалось загрузить историю поиска');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setIsLoading(false));
  }, [load]);

  async function handleRefresh() {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }

  function handleDelete(id: string) {
    Alert.alert(
      'Удалить запись?',
      'Этот поиск будет удалён из истории.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await searchHistoryService.deleteHistoryItem(id);
              setItems((prev) => prev.filter((i) => i.id !== id));
            } catch {
              toast.error('Не удалось удалить запись');
            }
          },
        },
      ],
    );
  }

  function handleClearAll() {
    if (items.length === 0) return;
    Alert.alert(
      'Очистить историю?',
      'Все записи поиска будут безвозвратно удалены.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Очистить',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(items.map((i) => searchHistoryService.deleteHistoryItem(i.id)));
              setItems([]);
              toast.show('История очищена');
            } catch {
              toast.error('Не удалось очистить историю');
            }
          },
        },
      ],
    );
  }

  async function handleRepeat(item: SearchHistoryItem) {
    try {
      const sessionId = await createSession(item.query);
      router.push({
        pathname: '/(tabs)/chat/[sessionId]',
        params: { sessionId, initialMessage: item.query },
      });
    } catch {
      toast.error('Не удалось открыть чат');
    }
  }

  // Build sections
  const sections = useMemo(() => {
    const flights = items.filter((i) => i.type === 'FLIGHT');
    const hotels = items.filter((i) => i.type === 'HOTEL');
    const result: Array<{ key: string; title: string; data: SearchHistoryItem[] }> = [];
    if (flights.length > 0) result.push({ key: 'FLIGHT', title: 'Рейсы', data: flights });
    if (hotels.length > 0)  result.push({ key: 'HOTEL',  title: 'Отели', data: hotels });
    return result;
  }, [items]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        {/* Custom header while loading */}
        <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>История поисков</Text>
        </View>
        <View style={styles.skeletonWrap}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBookingCard key={i} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Custom header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>История поисков</Text>
        {items.length > 0 && (
          <TouchableOpacity
            style={[styles.clearBtn, { backgroundColor: `${colors.error}15` }]}
            onPress={handleClearAll}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ fontSize: 16, color: colors.error, lineHeight: 20  }}>{'🗑'}</Text>
            <Text style={[styles.clearText, { color: colors.error }]}>Очистить</Text>
          </TouchableOpacity>
        )}
      </View>

      {items.length === 0 ? (
        <EmptyHistoryState />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <HistoryRow item={item} onDelete={handleDelete} onRepeat={handleRepeat} />
          )}
          renderSectionHeader={({ section }) => (
            <SectionHeader
              title={section.title}
              iconName={section.key === 'FLIGHT' ? 'airplane' : 'bed'}
              iconColor={section.key === 'FLIGHT' ? colors.primary : colors.success}
              count={section.data.length}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
          stickySectionHeadersEnabled={false}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Custom header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPaddingH,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontFamily: 'Sora',
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.extrabold,
    letterSpacing: 0.3,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  clearText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  // Skeleton placeholder
  skeletonWrap: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  // List
  listContent: {
    paddingTop: 8,
  },
  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPaddingH,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sectionTitle: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.badge,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.screenPaddingH,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    marginTop: 2,
    flexShrink: 0,
  },
  rowContent: {
    flex: 1,
    gap: 4,
  },
  query: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
  },
  metaDot: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
  },
  repeatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  repeatText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  deleteBtn: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
    marginTop: 2,
    flexShrink: 0,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 74,
  },
  // Empty state
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.screenPaddingH,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: 'Sora',
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    textAlign: 'center',
    lineHeight: 22,
  },
});
