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
import { Colors } from '../../constants/colors';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FlightFilters {
  maxPrice?: number;
  maxStops?: number;
  cabinClass?: 'economy' | 'business' | 'first';
  departureTimeFrom?: string;
  departureTimeTo?: string;
  sortBy?: 'price' | 'duration' | 'departure';
  sortOrder?: 'asc' | 'desc';
}

const DEFAULT_FILTERS: FlightFilters = {};

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
  { label: 'до 10 000', value: 10_000 },
  { label: 'до 20 000', value: 20_000 },
  { label: 'до 30 000', value: 30_000 },
  { label: 'Любая', value: undefined },
];

// ── Stops options ─────────────────────────────────────────────────────────────

const STOPS_OPTIONS: Array<{ label: string; value: number | undefined }> = [
  { label: 'Прямые', value: 0 },
  { label: '≤1 пересадки', value: 1 },
  { label: 'Любые', value: undefined },
];

// ── Cabin options ─────────────────────────────────────────────────────────────

const CABIN_OPTIONS: Array<{ label: string; value: FlightFilters['cabinClass'] }> = [
  { label: 'Эконом', value: 'economy' },
  { label: 'Бизнес', value: 'business' },
  { label: 'Первый', value: 'first' },
];

// ── Sort options ──────────────────────────────────────────────────────────────

const SORT_OPTIONS: Array<{ label: string; value: FlightFilters['sortBy'] }> = [
  { label: 'По цене', value: 'price' },
  { label: 'По времени', value: 'duration' },
  { label: 'По вылету', value: 'departure' },
];

// ── Departure time slots ──────────────────────────────────────────────────────

const TIME_SLOTS: Array<{ label: string; from: string; to: string }> = [
  { label: 'Утро\n06:00–12:00', from: '06:00', to: '12:00' },
  { label: 'День\n12:00–18:00', from: '12:00', to: '18:00' },
  { label: 'Вечер\n18:00–00:00', from: '18:00', to: '00:00' },
  { label: 'Любое', from: '', to: '' },
];

// ── Main component ────────────────────────────────────────────────────────────

interface FlightFiltersSheetProps {
  /** Current active filters */
  filters: FlightFilters;
  /** Called when user taps "Применить" */
  onApply: (filters: FlightFilters) => void;
  /** Whether the sheet is visible */
  visible: boolean;
  /** Called to close the sheet without changes */
  onClose: () => void;
}

export function FlightFiltersSheet({
  filters,
  onApply,
  visible,
  onClose,
}: FlightFiltersSheetProps) {
  // Local draft — only committed when user taps "Применить"
  const [draft, setDraft] = useState<FlightFilters>(filters);

  // Reset draft to latest committed filters when modal opens
  React.useEffect(() => {
    if (visible) setDraft(filters);
  }, [visible, filters]);

  function update<K extends keyof FlightFilters>(key: K, value: FlightFilters[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function handleApply() {
    onApply(draft);
    onClose();
  }

  function handleReset() {
    setDraft(DEFAULT_FILTERS);
  }

  const activeTimeSlot = TIME_SLOTS.find(
    (s) => s.from === (draft.departureTimeFrom ?? '') && s.to === (draft.departureTimeTo ?? ''),
  );

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
            <Text style={styles.headerTitle}>Фильтры рейсов</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Max price */}
            <Section title="Максимальная цена">
              {PRICE_OPTIONS.map((opt) => (
                <OptionButton
                  key={opt.label}
                  label={opt.label}
                  selected={draft.maxPrice === opt.value}
                  onPress={() => update('maxPrice', opt.value)}
                />
              ))}
            </Section>

            {/* Stops */}
            <Section title="Пересадки">
              {STOPS_OPTIONS.map((opt) => (
                <OptionButton
                  key={opt.label}
                  label={opt.label}
                  selected={draft.maxStops === opt.value}
                  onPress={() => update('maxStops', opt.value)}
                />
              ))}
            </Section>

            {/* Cabin class */}
            <Section title="Класс обслуживания">
              {CABIN_OPTIONS.map((opt) => (
                <OptionButton
                  key={opt.label}
                  label={opt.label}
                  selected={draft.cabinClass === opt.value}
                  onPress={() =>
                    update(
                      'cabinClass',
                      draft.cabinClass === opt.value ? undefined : opt.value,
                    )
                  }
                />
              ))}
            </Section>

            {/* Departure time */}
            <Section title="Время вылета">
              {TIME_SLOTS.map((slot) => (
                <OptionButton
                  key={slot.label}
                  label={slot.label}
                  selected={
                    slot === activeTimeSlot ||
                    (slot.from === '' && activeTimeSlot == null)
                  }
                  onPress={() => {
                    if (slot.from === '') {
                      update('departureTimeFrom', undefined);
                      update('departureTimeTo', undefined);
                    } else {
                      update('departureTimeFrom', slot.from);
                      update('departureTimeTo', slot.to);
                    }
                  }}
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
                  onPress={() => {
                    if (draft.sortBy === opt.value) {
                      // Toggle order on second tap
                      update('sortOrder', draft.sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      update('sortBy', opt.value);
                      update('sortOrder', 'asc');
                    }
                  }}
                />
              ))}
              {draft.sortBy && (
                <OptionButton
                  label={draft.sortOrder === 'desc' ? 'По убыванию' : 'По возрастанию'}
                  selected
                  onPress={() =>
                    update('sortOrder', draft.sortOrder === 'asc' ? 'desc' : 'asc')
                  }
                />
              )}
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

// ── Filter trigger bar ────────────────────────────────────────────────────────

interface FlightFilterBarProps {
  filters: FlightFilters;
  onOpenFilters: () => void;
  /** Pre-computed active filter count; falls back to counting from filters if not provided. */
  activeCount?: number;
}

/** Compact bar shown above flight cards. Displays active filter count. */
export function FlightFilterBar({ filters, onOpenFilters, activeCount: activeCountProp }: FlightFilterBarProps) {
  const activeCount = activeCountProp ?? Object.values(filters).filter((v) => v !== undefined).length;

  return (
    <View style={styles.barContainer}>
      <TouchableOpacity
        style={[styles.filterBtn, activeCount > 0 && styles.filterBtnActive]}
        onPress={onOpenFilters}
        activeOpacity={0.8}
      >
        <Text style={[styles.filterBtnText, activeCount > 0 && styles.filterBtnTextActive]}>
          {'⚙️'} Фильтры{activeCount > 0 ? ` (${activeCount})` : ''}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Modal overlay
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

  // Header
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
  closeBtn: {
    color: Colors.textMuted,
    fontSize: 18,
  },

  // Scroll area
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },

  // Section
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

  // Option button
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
    textAlign: 'center',
  },
  optBtnTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },

  // Footer
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

  // Filter bar
  barContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  filterBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  filterBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}22`,
  },
  filterBtnText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  filterBtnTextActive: {
    color: Colors.primary,
  },
});
