import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, TextPresets } from '../../constants';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; color: string }> = {
  default: { bg: Colors.elevated, color: Colors.textMuted },
  success: { bg: Colors.successLight, color: Colors.success },
  warning: { bg: Colors.warningLight, color: Colors.warning },
  error:   { bg: Colors.errorLight,   color: Colors.error },
  info:    { bg: Colors.infoLight,     color: Colors.info },
  primary: { bg: Colors.primaryMuted,  color: Colors.primary },
};

export function Badge({ label, variant = 'default', size = 'md' }: BadgeProps) {
  const { bg, color } = VARIANT_STYLES[variant];
  const isSm = size === 'sm';

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
