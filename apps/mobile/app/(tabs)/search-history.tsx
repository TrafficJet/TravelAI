import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../../stores/chatStore';
import { searchHistoryService } from '../../services/searchHistoryService';
import { SkeletonBookingCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Radius } from '../../constants/radius';
import { Spacing } from '../../constants/spacing';
import { toast } from '../../lib/toast';
import type { SearchHistoryItem } from '../../types';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
}

interface HistoryRowProps {
  item: SearchHistoryItem;
  onDelete: (id: string) => void;
  onPress: (item: SearchHistoryItem) => void;
}

function HistoryRow({ item, onDelete, onPress }: HistoryRowProps) {
  const isFlight = item.type === 'FLIGHT';

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onPress(item)}
      activeOpacity={0.75}
    >
      <View style={[styles.iconWrap, { backgroundColor: isFlight ? Colors.primaryMuted : Colors.successLight }]}>
        <Ionicons
          name={isFlight ? 'airplane' : 'bed'}
          size={20}
          color={isFlight ? Colors.primary : Colors.success}
        />
      </View>

      <View style={styles.rowContent}>
        <Text style={styles.query} numberOfLines={1}>
          {item.route ?? item.query}
        </Text>
        <View style={styles.meta}>
          {item.date ? (
            <Text style={styles.metaText}>{formatDate(item.date)}</Text>
          ) : null}
          <Text style={styles.metaDot}>{item.date ? ' · ' : ''}</Text>
          <Text style={styles.metaText}>{item.resultsCount} результ.</Text>
          <Text style={styles.metaDot}> · </Text>
          <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => onDelete(item.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="trash-outline" size={18} color={Colors.error} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function SearchHistoryScreen() {
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

  async function handlePress(item: SearchHistoryItem) {
    try {
      let sessionId = item.sessionId;
      if (!sessionId) {
        sessionId = await createSession(item.query);
      }
      router.push(`/chat/${sessionId}`);
    } catch {
      toast.error('Не удалось открыть чат');
    }
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBookingCard key={i} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <HistoryRow item={item} onDelete={handleDelete} onPress={handlePress} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
        contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            title="История пуста"
            subtitle="Твои поисковые запросы появятся здесь"
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
  listContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 68,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.card,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  rowContent: {
    flex: 1,
  },
  query: {
    color: Colors.text,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
  },
  metaDot: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
  },
  deleteBtn: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
});
