import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

// ── Types ─────────────────────────────────────────────────────────────────────

export type HotelAmenity = 'wifi' | 'pool' | 'breakfast';

export interface HotelFilters {
  maxPrice?: number;
  stars?: number;
  amenities?: HotelAmenity[];
  sortBy?: 'price' | 'rating' | 'distance';
}

const DEFAULT_FILTERS: HotelFilters = {};

// ── Option helpers ────────────────────────────────────────────────────────────

interface OptionButtonProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function OptionButton({ label, selected, onPress }: OptionButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.optBtn, selected && styles.optBtnSelected]}
    >
      <Text style={[styles.optBtnText, selected && styles.optBtnTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.optRow}>{children}</View>
    </View>
  );
}

// ── Price options ─────────────────────────────────────────────────────────────

const PRICE_OPTIONS: Array<{ label: string; value: number | undefined }> = [
  { label: 'до 3 000', value: 3_000 },
  { label: 'до 7 000', value: 7_000 },
  { label: 'до 15 000', value: 15_000 },
  { label: 'Любая', value: undefined },
];

// ── Stars options ─────────────────────────────────────────────────────────────

const STARS_OPTIONS: Array<{ label: string; value: number | undefined }> = [
  { label: '3*', value: 3 },
  { label: '4*', value: 4 },
  { label: '5*', value: 5 },
  { label: 'Любые', value: undefined },
];

// ── Amenities options ─────────────────────────────────────────────────────────

const AMENITY_OPTIONS: Array<{ label: string; value: HotelAmenity }> = [
  { label: 'Wi-Fi', value: 'wifi' },
  { label: 'Бассейн', value: 'pool' },
  { label: 'Завтрак', value: 'breakfast' },
];

// ── Sort options ──────────────────────────────────────────────────────────────

const SORT_OPTIONS: Array<{ label: string; value: HotelFilters['sortBy'] }> = [
  { label: 'По цене', value: 'price' },
  { label: 'По рейтингу', value: 'rating' },
  { label: 'По расстоянию', value: 'distance' },
];

// ── Main component ────────────────────────────────────────────────────────────

interface HotelFiltersSheetProps {
  filters: HotelFilters;
  onApply: (filters: HotelFilters) => void;
  visible: boolean;
  onClose: () => void;
}

export function HotelFiltersSheet({
  filters,
  onApply,
  visible,
  onClose,
}: HotelFiltersSheetProps) {
  const [draft, setDraft] = useState<HotelFilters>(filters);

  React.useEffect(() => {
    if (visible) setDraft(filters);
  }, [visible, filters]);

  function update<K extends keyof HotelFilters>(key: K, value: HotelFilters[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function toggleAmenity(amenity: HotelAmenity) {
    setDraft((prev) => {
      const current = prev.amenities ?? [];
      const next = current.includes(amenity)
        ? current.filter((a) => a !== amenity)
        : [...current, amenity];
      return { ...prev, amenities: next.length > 0 ? next : undefined };
    });
  }

  function handleApply() {
    onApply(draft);
    onClose();
  }

  function handleReset() {
    setDraft(DEFAULT_FILTERS);
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <SafeAreaView style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Фильтры отелей</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Max price */}
            <Section title="Максимальная цена (за ночь)">
              {PRICE_OPTIONS.map((opt) => (
                <OptionButton
                  key={opt.label}
                  label={opt.label}
                  selected={draft.maxPrice === opt.value}
                  onPress={() => update('maxPrice', opt.value)}
                />
              ))}
            </Section>

            {/* Stars */}
            <Section title="Звёздность">
              {STARS_OPTIONS.map((opt) => (
                <OptionButton
                  key={opt.label}
                  label={opt.label}
                  selected={draft.stars === opt.value}
                  onPress={() => update('stars', opt.value)}
                />
              ))}
            </Section>

            {/* Amenities */}
            <Section title="Удобства">
              {AMENITY_OPTIONS.map((opt) => (
                <OptionButton
                  key={opt.value}
                  label={opt.label}
                  selected={(draft.amenities ?? []).includes(opt.value)}
                  onPress={() => toggleAmenity(opt.value)}
                />
              ))}
            </Section>

            {/* Sort */}
            <Section title="Сортировка">
              {SORT_OPTIONS.map((opt) => (
                <OptionButton
                  key={opt.label}
                  label={opt.label}
                  selected={draft.sortBy === opt.value}
                  onPress={() =>
                    update('sortBy', draft.sortBy === opt.value ? undefined : opt.value)
                  }
                />
              ))}
            </Section>
          </ScrollView>

          {/* Footer actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.8}>
              <Text style={styles.resetBtnText}>Сбросить</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply} activeOpacity={0.8}>
              <Text style={styles.applyBtnText}>Применить</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ── Filter trigger button ─────────────────────────────────────────────────────

interface HotelFilterBarProps {
  filters: HotelFilters;
  onOpenFilters: () => void;
}

/** Compact bar for hotel filters. */
export function HotelFilterBar({ filters, onOpenFilters }: HotelFilterBarProps) {
  const amenityCount = filters.amenities?.length ?? 0;
  const activeCount =
    (filters.maxPrice !== undefined ? 1 : 0) +
    (filters.stars !== undefined ? 1 : 0) +
    amenityCount +
    (filters.sortBy !== undefined ? 1 : 0);

  return (
    <TouchableOpacity
      style={[styles.filterBtn, activeCount > 0 && styles.filterBtnActive]}
      onPress={onOpenFilters}
      activeOpacity={0.8}
    >
      <Text style={[styles.filterBtnText, activeCount > 0 && styles.filterBtnTextActive]}>
        Отели{activeCount > 0 ? ` (${activeCount})` : ''}
      </Text>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.border,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 4,
  },
  sectionTitle: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  optRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  optBtnSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}22`,
  },
  optBtnText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  optBtnTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  resetBtnText: {
    color: Colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  filterBtnActive: {
    borderColor: Colors.warning,
    backgroundColor: `${Colors.warning}22`,
  },
  filterBtnText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  filterBtnTextActive: {
    color: Colors.warning,
  },
});
