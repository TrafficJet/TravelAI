import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TextInput,
  PanResponder,
  LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

const PRICE_MIN = 0;
const PRICE_MAX = 5000;
const PRICE_STEP = 50;

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
      {children}
    </View>
  );
}

// ── Price slider ──────────────────────────────────────────────────────────────

interface PriceSliderProps {
  value: number;
  onChange: (v: number) => void;
}

function PriceSlider({ value, onChange }: PriceSliderProps) {
  const [sliderWidth, setSliderWidth] = useState(0);
  const [inputText, setInputText] = useState(String(value));
  const startX = useRef(0);
  const startValue = useRef(value);

  // Keep inputText in sync when value changes externally (e.g. reset)
  React.useEffect(() => {
    setInputText(String(value));
  }, [value]);

  const clampStep = useCallback((raw: number): number => {
    const stepped = Math.round(raw / PRICE_STEP) * PRICE_STEP;
    return Math.max(PRICE_MIN, Math.min(PRICE_MAX, stepped));
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_e, gs) => {
        startX.current = gs.x0;
        startValue.current = value;
      },
      onPanResponderMove: (_e, gs) => {
        if (sliderWidth <= 0) return;
        const dx = gs.moveX - startX.current;
        const ratio = dx / sliderWidth;
        const newValue = clampStep(startValue.current + ratio * (PRICE_MAX - PRICE_MIN));
        onChange(newValue);
      },
    }),
  ).current;

  // Re-create panResponder handlers when sliderWidth or value changes isn't
  // possible with the static ref approach, so we store them in a ref instead.
  const sliderWidthRef = useRef(sliderWidth);
  const valueRef = useRef(value);
  sliderWidthRef.current = sliderWidth;
  valueRef.current = value;

  const dynamicPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_e, gs) => {
        startX.current = gs.x0;
        startValue.current = valueRef.current;
      },
      onPanResponderMove: (_e, gs) => {
        const w = sliderWidthRef.current;
        if (w <= 0) return;
        const dx = gs.moveX - startX.current;
        const ratio = dx / w;
        const newValue = clampStep(startValue.current + ratio * (PRICE_MAX - PRICE_MIN));
        onChange(newValue);
      },
    }),
  ).current;

  const thumbPercent = sliderWidth > 0
    ? ((value - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100
    : 0;

  function handleTrackPress(e: { nativeEvent: { locationX: number } }) {
    if (sliderWidth <= 0) return;
    const ratio = e.nativeEvent.locationX / sliderWidth;
    onChange(clampStep(PRICE_MIN + ratio * (PRICE_MAX - PRICE_MIN)));
  }

  function handleInputChange(text: string) {
    setInputText(text);
    const num = parseInt(text, 10);
    if (!isNaN(num)) {
      onChange(clampStep(num));
    }
  }

  function handleInputBlur() {
    const num = parseInt(inputText, 10);
    if (isNaN(num)) {
      setInputText(String(value));
    } else {
      const clamped = clampStep(num);
      onChange(clamped);
      setInputText(String(clamped));
    }
  }

  return (
    <View style={sliderStyles.wrapper}>
      {/* Track */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleTrackPress}
        style={sliderStyles.trackWrap}
        onLayout={(e: LayoutChangeEvent) => setSliderWidth(e.nativeEvent.layout.width)}
      >
        {/* Filled portion */}
        <View style={sliderStyles.track}>
          <View style={[sliderStyles.fill, { width: `${thumbPercent}%` }]} />
        </View>
        {/* Thumb */}
        <View
          style={[sliderStyles.thumb, { left: `${thumbPercent}%` }]}
          {...dynamicPanResponder.panHandlers}
        />
      </TouchableOpacity>

      {/* Range labels */}
      <View style={sliderStyles.rangeRow}>
        <Text style={sliderStyles.rangeLabel}>{PRICE_MIN}$</Text>
        <Text style={sliderStyles.rangeLabel}>{PRICE_MAX}$</Text>
      </View>

      {/* Manual input */}
      <View style={sliderStyles.inputRow}>
        <Text style={sliderStyles.inputLabel}>Максимум:</Text>
        <TextInput
          style={sliderStyles.input}
          value={inputText}
          onChangeText={handleInputChange}
          onBlur={handleInputBlur}
          keyboardType="number-pad"
          returnKeyType="done"
          placeholderTextColor={Colors.textMuted}
          maxLength={5}
        />
        <Text style={sliderStyles.currency}>$</Text>
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 4,
  },
  trackWrap: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: Colors.surface,
    marginLeft: -12,
    top: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  rangeLabel: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  inputLabel: {
    color: Colors.textMuted,
    fontSize: 13,
    flex: 1,
  },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
    minWidth: 72,
    textAlign: 'center',
  },
  currency: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});

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

const TIME_PRESETS: Array<{ label: string; from: string; to: string }> = [
  { label: 'Утро 06-12', from: '06:00', to: '12:00' },
  { label: 'День 12-18', from: '12:00', to: '18:00' },
  { label: 'Вечер 18-23', from: '18:00', to: '23:00' },
  { label: 'Любое', from: '', to: '' },
];

// ── HH:MM masked input ────────────────────────────────────────────────────────

interface TimeInputProps {
  value: string;
  placeholder: string;
  onChange: (val: string) => void;
}

function TimeInput({ value, placeholder, onChange }: TimeInputProps) {
  function applyMask(text: string): string {
    // Strip everything except digits
    const digits = text.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  }

  function validate(masked: string): boolean {
    if (masked.length < 5) return false;
    const [hStr, mStr] = masked.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
  }

  function handleChange(text: string) {
    const masked = applyMask(text);
    onChange(masked);
  }

  const isValid = value === '' || validate(value);

  return (
    <TextInput
      style={[timeStyles.input, !isValid && timeStyles.inputError]}
      value={value}
      onChangeText={handleChange}
      placeholder={placeholder}
      placeholderTextColor={Colors.textMuted}
      keyboardType="number-pad"
      maxLength={5}
      returnKeyType="done"
    />
  );
}

const timeStyles = StyleSheet.create({
  input: {
    flex: 1,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputError: {
    borderColor: Colors.error ?? '#EF4444',
  },
});

// ── Main component ────────────────────────────────────────────────────────────

interface FlightFiltersSheetProps {
  filters: FlightFilters;
  onApply: (filters: FlightFilters) => void;
  visible: boolean;
  onClose: () => void;
}

export function FlightFiltersSheet({
  filters,
  onApply,
  visible,
  onClose,
}: FlightFiltersSheetProps) {
  const [draft, setDraft] = useState<FlightFilters>(filters);

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

  const activePreset = TIME_PRESETS.find(
    (s) =>
      s.from === (draft.departureTimeFrom ?? '') &&
      s.to === (draft.departureTimeTo ?? ''),
  );

  function handlePresetPress(preset: typeof TIME_PRESETS[number]) {
    if (preset.from === '') {
      update('departureTimeFrom', undefined);
      update('departureTimeTo', undefined);
    } else {
      update('departureTimeFrom', preset.from);
      update('departureTimeTo', preset.to);
    }
  }

  const currentPrice = draft.maxPrice ?? PRICE_MAX;

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
              <Ionicons name="close" size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Max price — slider */}
            <Section title="Максимальная цена">
              <PriceSlider
                value={currentPrice}
                onChange={(v) => update('maxPrice', v === PRICE_MAX ? undefined : v)}
              />
            </Section>

            {/* Stops */}
            <Section title="Пересадки">
              <View style={styles.optRow}>
                {STOPS_OPTIONS.map((opt) => (
                  <OptionButton
                    key={opt.label}
                    label={opt.label}
                    selected={draft.maxStops === opt.value}
                    onPress={() => update('maxStops', opt.value)}
                  />
                ))}
              </View>
            </Section>

            {/* Cabin class */}
            <Section title="Класс обслуживания">
              <View style={styles.optRow}>
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
              </View>
            </Section>

            {/* Departure time */}
            <Section title="Время вылета">
              {/* Quick presets */}
              <View style={styles.optRow}>
                {TIME_PRESETS.map((preset) => (
                  <OptionButton
                    key={preset.label}
                    label={preset.label}
                    selected={
                      preset === activePreset ||
                      (preset.from === '' && activePreset == null)
                    }
                    onPress={() => handlePresetPress(preset)}
                  />
                ))}
              </View>

              {/* Manual HH:MM inputs */}
              <View style={styles.timeRow}>
                <TimeInput
                  value={draft.departureTimeFrom ?? ''}
                  placeholder="06:00"
                  onChange={(v) => update('departureTimeFrom', v || undefined)}
                />
                <Text style={styles.timeSeparator}>—</Text>
                <TimeInput
                  value={draft.departureTimeTo ?? ''}
                  placeholder="23:00"
                  onChange={(v) => update('departureTimeTo', v || undefined)}
                />
              </View>
            </Section>

            {/* Sort */}
            <Section title="Сортировка">
              <View style={styles.optRow}>
                {SORT_OPTIONS.map((opt) => (
                  <OptionButton
                    key={opt.label}
                    label={opt.label}
                    selected={draft.sortBy === opt.value}
                    onPress={() => {
                      if (draft.sortBy === opt.value) {
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
              </View>
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
  activeCount?: number;
}

// ── Quick filter chips shown inline ──────────────────────────────────────────

interface QuickChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}

function QuickChip({ label, active, onPress, icon }: QuickChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.chip, active && styles.chipActive]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={13}
          color={active ? Colors.textInverse : Colors.textMuted}
          style={{ marginRight: 4 }}
        />
      )}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function FlightFilterBar({ filters, onOpenFilters, activeCount: activeCountProp }: FlightFilterBarProps) {
  const activeCount = activeCountProp ?? Object.values(filters).filter((v) => v !== undefined).length;

  // Derive active states for quick chips
  const isDirectActive = filters.maxStops === 0;
  const isEconomActive = filters.cabinClass === 'economy';
  const isCheapActive = filters.maxPrice !== undefined && filters.maxPrice <= 200;

  return (
    <View style={styles.barContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.barScroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Main filters button */}
        <QuickChip
          icon="options-outline"
          label={`Фильтры${activeCount > 0 ? ` (${activeCount})` : ''}`}
          active={activeCount > 0}
          onPress={onOpenFilters}
        />

        {/* Quick chip: direct flights */}
        <QuickChip
          label="Прямые рейсы"
          active={isDirectActive}
          onPress={onOpenFilters}
        />

        {/* Quick chip: economy */}
        <QuickChip
          label="Эконом"
          active={isEconomActive}
          onPress={onOpenFilters}
        />

        {/* Quick chip: cheap */}
        <QuickChip
          label="Дешевле €200"
          active={isCheapActive}
          onPress={onOpenFilters}
        />

        {/* Reset button — visible only when filters active */}
        {activeCount > 0 && (
          <TouchableOpacity
            onPress={onOpenFilters}
            activeOpacity={0.75}
            style={styles.resetChip}
          >
            <Ionicons name="close-outline" size={14} color={Colors.error} style={{ marginRight: 2 }} />
            <Text style={styles.resetChipText}>Сбросить</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
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

  // Time picker row
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  timeSeparator: {
    color: Colors.textMuted,
    fontSize: 18,
    fontWeight: '300',
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
    textAlign: 'center',
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

  barContainer: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  barScroll: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Quick chip
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  chipText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: Colors.textInverse,
    fontWeight: '700',
  },

  // Reset chip
  resetChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.error,
    backgroundColor: `${Colors.error}18`,
    flexDirection: 'row',
    alignItems: 'center',
  },
  resetChipText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '600',
  },

  // Legacy aliases (kept so styles object stays valid)
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
