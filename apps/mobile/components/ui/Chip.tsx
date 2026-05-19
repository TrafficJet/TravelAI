import React from 'react';
import { TouchableOpacity, Text, StyleSheet, type ViewStyle } from 'react-native';
import { Radius, Spacing, TextPresets } from '../../constants';
import { useTheme } from '../../src/theme/ThemeContext';

type ChipVariant = 'outline' | 'filled' | 'ghost';

interface ChipProps {
  label: string;
  icon?: string;
  selected?: boolean;
  onPress?: () => void;
  variant?: ChipVariant;
}

export function Chip({
  label,
  icon,
  selected = false,
  onPress,
  variant = 'outline',
}: ChipProps) {
  const { colors } = useTheme();

  const styles = React.useMemo(() => StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 14,
      height: Spacing.chipHeight,
      borderRadius: Radius.chip,
      borderWidth: 1,
    },
    outlineContainer: {
      backgroundColor: 'transparent',
      borderColor: colors.border,
    },
    filledContainer: {
      backgroundColor: colors.card,
      borderColor: colors.border,
    },
    ghostContainer: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
    },
    selectedContainer: {
      backgroundColor: `${colors.primary}26`,
      borderColor: colors.primary,
    },
    label: {
      ...TextPresets.buttonSm,
    },
    defaultText: {
      color: colors.textMuted,
    },
    selectedText: {
      color: colors.primary,
    },
    icon: {
      fontSize: 14,
    },
  }), [colors]);

  const containerStyle: ViewStyle[] = [styles.base];

  if (selected) {
    containerStyle.push(styles.selectedContainer);
  } else if (variant === 'outline') {
    containerStyle.push(styles.outlineContainer);
  } else if (variant === 'filled') {
    containerStyle.push(styles.filledContainer);
  } else {
    containerStyle.push(styles.ghostContainer);
  }

  const textStyle = selected ? styles.selectedText : styles.defaultText;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={containerStyle}
    >
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={[styles.label, textStyle]}>{label}</Text>
    </TouchableOpacity>
  );
}
