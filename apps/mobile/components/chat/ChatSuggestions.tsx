import React from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
} from 'react-native';
import { Typography } from '../../constants/typography';
import { useTheme } from '../../src/theme/ThemeContext';

interface Props {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

export function ChatSuggestions({ suggestions, onSelect }: Props) {
  const { colors } = useTheme();

  const styles = React.useMemo(() => StyleSheet.create({
    wrapper: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    content: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
      flexDirection: 'row',
    },
    chip: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: `${colors.primary}50`,
      borderRadius: 9999,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    chipText: {
      color: colors.text,
      fontSize: Typography.sizes.sm,
      fontWeight: Typography.weights.medium,
    },
  }), [colors]);

  if (suggestions.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {suggestions.map((s) => (
          <TouchableOpacity
            key={s}
            style={styles.chip}
            onPress={() => onSelect(s)}
            activeOpacity={0.7}
          >
            <Text style={styles.chipText}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
