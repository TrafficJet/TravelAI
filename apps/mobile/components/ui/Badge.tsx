import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Radius, TextPresets } from '../../constants';
import { useTheme } from '../../src/theme/ThemeContext';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

export function Badge({ label, variant = 'default', size = 'md' }: BadgeProps) {
  const { colors } = useTheme();

  const VARIANT_STYLES: Record<BadgeVariant, { bg: string; color: string }> = {
    default: { bg: colors.card, color: colors.textMuted },
    success: { bg: colors.successLight, color: colors.success },
    warning: { bg: 'rgba(232,160,32,0.15)', color: colors.warning },
    error:   { bg: 'rgba(244,63,94,0.15)',  color: colors.error },
    info:    { bg: colors.primary + '26',   color: colors.primary },
    primary: { bg: `${colors.primary}26`,   color: colors.primary },
  };

  const { bg, color } = VARIANT_STYLES[variant];
  const isSm = size === 'sm';

  const styles = StyleSheet.create({
    base: {
      alignSelf: 'flex-start',
      alignItems: 'center',
      justifyContent: 'center',
    },
    md: {
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    sm: {
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    text: {
      ...TextPresets.label,
    },
    textSm: {
      fontSize: 10,
    },
  });

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: bg, borderRadius: Radius.badge },
        isSm ? styles.sm : styles.md,
      ]}
    >
      <Text style={[styles.text, { color }, isSm && styles.textSm]}>
        {label}
      </Text>
    </View>
  );
}
