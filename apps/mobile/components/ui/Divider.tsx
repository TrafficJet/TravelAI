import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, TextPresets } from '../../constants';

interface DividerProps {
  label?: string;
  color?: string;
}

export function Divider({ label, color = Colors.divider }: DividerProps) {
  if (!label) {
    return <View style={[styles.line, { backgroundColor: color }]} />;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.flex, { backgroundColor: color }]} />
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.flex, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
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
    color: Colors.textMuted,
    flexShrink: 0,
  },
});
