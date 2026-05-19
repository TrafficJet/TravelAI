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
import { useTheme } from '../../src/theme/ThemeContext';

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
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        optBtnStyles.base,
        { borderColor: colors.border, backgroundColor: colors.card },
        selected && { borderColor: colors.primary, backgroundColor: `${colors.primary}22` },
      ]}
    >
      <Text style={[
        optBtnStyles.text,
        { color: colors.textMuted },
        selected && { color: colors.primary, fontWeight: '700' },
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const optBtnStyles = StyleSheet.create({
  base: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
  },
});

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={sectionStyles.section}>
      <Text style={[sectionStyles.title, { color: colors.textMuted }]}>{title}</Text>
      <View style={sectionStyles.optRow}>{children}</View>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 4,
  },
  title: {
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
});

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
  const { colors } = useTheme();
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
      <View style={staticStyles.overlay}>
        <TouchableOpacity style={staticStyles.backdrop} activeOpacity={1} onPress={onClose} />

        <SafeAreaView style={[staticStyles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Handle */}
          <View style={[staticStyles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={[staticStyles.header, { borderBottomColor: colors.border }]}>
            <Text style={[staticStyles.headerTitle, { color: colors.text }]}>Фильтры отелей</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 22, color: {colors.text}, lineHeight: 26 }}>{'×'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={staticStyles.scroll}
            contentContainerStyle={staticStyles.scrollContent}
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
          <View style={[staticStyles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[staticStyles.resetBtn, { borderColor: colors.border }]}
              onPress={handleReset}
              activeOpacity={0.8}
            >
              <Text style={[staticStyles.resetBtnText, { color: colors.textMuted }]}>Сбросить</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[staticStyles.applyBtn, { backgroundColor: colors.primary }]}
              onPress={handleApply}
              activeOpacity={0.8}
            >
              <Text style={staticStyles.applyBtnText}>Применить</Text>
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
  const { colors } = useTheme();
  const amenityCount = filters.amenities?.length ?? 0;
  const activeCount =
    (filters.maxPrice !== undefined ? 1 : 0) +
    (filters.stars !== undefined ? 1 : 0) +
    amenityCount +
    (filters.sortBy !== undefined ? 1 : 0);

  return (
    <TouchableOpacity
      style={[
        staticStyles.filterBtn,
        { borderColor: colors.border, backgroundColor: colors.card },
        activeCount > 0 && { borderColor: colors.warning, backgroundColor: `${colors.warning}22` },
      ]}
      onPress={onOpenFilters}
      activeOpacity={0.8}
    >
      <Text style={[
        staticStyles.filterBtnText,
        { color: colors.textMuted },
        activeCount > 0 && { color: colors.warning },
      ]}>
        Отели{activeCount > 0 ? ` (${activeCount})` : ''}
      </Text>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const staticStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
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
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  resetBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
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
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
