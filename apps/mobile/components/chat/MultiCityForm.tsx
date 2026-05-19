import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../src/theme/ThemeContext';

const MAX_SEGMENTS = 5;

interface Segment {
  from: string;
  to: string;
  date: string;
}

function createEmptySegment(): Segment {
  return { from: '', to: '', date: '' };
}

interface MultiCityFormProps {
  onSearch: (message: string) => void;
  disabled?: boolean;
}

export function MultiCityForm({ onSearch, disabled = false }: MultiCityFormProps) {
  const { colors } = useTheme();
  const [segments, setSegments] = useState<Segment[]>([
    createEmptySegment(),
    createEmptySegment(),
  ]);

  function updateSegment(index: number, field: keyof Segment, value: string) {
    setSegments((prev) =>
      prev.map((seg, i) => (i === index ? { ...seg, [field]: value } : seg)),
    );
  }

  function addSegment() {
    if (segments.length >= MAX_SEGMENTS) return;
    setSegments((prev) => [...prev, createEmptySegment()]);
  }

  function removeSegment(index: number) {
    if (segments.length <= 2) return;
    setSegments((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSearch() {
    const filledSegments = segments.filter(
      (s) => s.from.trim() && s.to.trim() && s.date.trim(),
    );
    if (filledSegments.length === 0) return;

    const parts = filledSegments
      .map((s) => `${s.from.trim()}→${s.to.trim()} ${s.date.trim()}`)
      .join(', ');
    const message = `Найди мультигород: ${parts}`;
    onSearch(message);
  }

  const filledCount = segments.filter(
    (s) => s.from.trim() && s.to.trim() && s.date.trim(),
  ).length;

  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    title: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: -8,
    },
    segmentScroll: {
      maxHeight: 320,
    },
    segment: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },
    segmentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    segmentNumWrap: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: `${colors.primary}33`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentNum: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '700',
    },
    segmentLabel: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
      flex: 1,
    },
    removeBtn: {
      padding: 2,
    },
    fieldsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    fieldWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    dateFieldWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    fieldIcon: {
      marginRight: 6,
    },
    input: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      padding: 0,
    },
    dateInput: {
      flex: 1,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.primary,
      borderStyle: 'dashed',
    },
    addBtnText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    searchBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 5,
    },
    searchBtnDisabled: {
      opacity: 0.5,
      shadowOpacity: 0,
      elevation: 0,
    },
    searchBtnText: {
      color: '#0A0A14',
      fontSize: 15,
      fontWeight: '700',
    },
  }), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Сложный маршрут</Text>
      <Text style={styles.subtitle}>До {MAX_SEGMENTS} перелётов</Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        style={styles.segmentScroll}
      >
        {segments.map((seg, index) => (
          <View key={index} style={styles.segment}>
            {/* Segment number */}
            <View style={styles.segmentHeader}>
              <View style={styles.segmentNumWrap}>
                <Text style={styles.segmentNum}>{index + 1}</Text>
              </View>
              <Text style={styles.segmentLabel}>Перелёт {index + 1}</Text>
              {segments.length > 2 && (
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removeSegment(index)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={{ fontSize: 18, color: {colors.error}, lineHeight: 22 }}>{'•'}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Fields row */}
            <View style={styles.fieldsRow}>
              <View style={styles.fieldWrap}>
                <Text style={{ fontSize: 14, color: {colors.textMuted}, lineHeight: 18, styles.fieldIcon }}>{'✈'}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Откуда"
                  placeholderTextColor={colors.textMuted}
                  value={seg.from}
                  onChangeText={(v) => updateSegment(index, 'from', v)}
                  editable={!disabled}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>

              <Text style={{ fontSize: 14, color: {colors.textMuted}, lineHeight: 18 }}>{'→'}</Text>

              <View style={styles.fieldWrap}>
                <Text style={{ fontSize: 14, color: {colors.textMuted}, lineHeight: 18, styles.fieldIcon }}>{'📍'}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Куда"
                  placeholderTextColor={colors.textMuted}
                  value={seg.to}
                  onChangeText={(v) => updateSegment(index, 'to', v)}
                  editable={!disabled}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.dateFieldWrap}>
              <Text style={{ fontSize: 14, color: {colors.textMuted}, lineHeight: 18, styles.fieldIcon }}>{'📅'}</Text>
              <TextInput
                style={[styles.input, styles.dateInput]}
                placeholder="Дата (напр. 1 июня)"
                placeholderTextColor={colors.textMuted}
                value={seg.date}
                onChangeText={(v) => updateSegment(index, 'date', v)}
                editable={!disabled}
                returnKeyType="done"
              />
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Add segment button */}
      {segments.length < MAX_SEGMENTS && (
        <TouchableOpacity
          style={styles.addBtn}
          onPress={addSegment}
          disabled={disabled}
          activeOpacity={0.75}
        >
          <Text style={{ fontSize: 18, color: {colors.primary}, lineHeight: 22 }}>{'•'}</Text>
          <Text style={styles.addBtnText}>Добавить перелёт</Text>
        </TouchableOpacity>
      )}

      {/* Search button */}
      <TouchableOpacity
        style={[styles.searchBtn, (filledCount === 0 || disabled) && styles.searchBtnDisabled]}
        onPress={handleSearch}
        disabled={filledCount === 0 || disabled}
        activeOpacity={0.85}
      >
        <Text style={{ fontSize: 16, color: "#0A0A14", lineHeight: 20 }}>{'⌕'}</Text>
        <Text style={styles.searchBtnText}>
          Найти{filledCount > 0 ? ` (${filledCount} перелётов)` : ''}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
