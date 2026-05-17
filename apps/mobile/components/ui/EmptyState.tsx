import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, TextPresets, Radius } from '../../constants';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface EmptyStateProps {
  icon: IoniconName;
  title: string;
  subtitle: string;
  onAction?: () => void;
  actionLabel?: string;
}

export function EmptyState({ icon, title, subtitle, onAction, actionLabel }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={56} color={Colors.textMuted} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {onAction != null && actionLabel != null && (
        <TouchableOpacity style={styles.actionBtn} onPress={onAction} activeOpacity={0.8}>
          <Text style={styles.actionBtnText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 60,
    gap: 12,
  },
  iconWrap: {
    marginBottom: 4,
  },
  title: {
    ...TextPresets.h3,
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    ...TextPresets.body,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  actionBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: Radius.chip,
    backgroundColor: Colors.primary,
  },
  actionBtnText: {
    ...TextPresets.button,
    color: Colors.textInverse,
  },
});
