import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TextPresets } from '../../constants';
import { useTheme } from '../../src/theme/ThemeContext';

interface DividerProps {
  label?: string;
  color?: string;
}

export function Divider({ label, color }: DividerProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.border;

  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginVertical: 8,
    },
    flex: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
    },
    line: {
      height: StyleSheet.hairlineWidth,
      marginVertical: 8,
    },
    label: {
      ...TextPresets.caption,
      color: colors.textMuted,
      flexShrink: 0,
    },
  }), [colors]);

  if (!label) {
    return <View style={[styles.line, { backgroundColor: resolvedColor }]} />;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.flex, { backgroundColor: resolvedColor }]} />
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.flex, { backgroundColor: resolvedColor }]} />
    </View>
  );
}
