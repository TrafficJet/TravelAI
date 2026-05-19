import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { TextPresets, Radius } from '../../constants';
import { useTheme } from '../../src/theme/ThemeContext';


interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle: string;
  onAction?: () => void;
  actionLabel?: string;
}

export function EmptyState({ icon, title, subtitle, onAction, actionLabel }: EmptyStateProps) {
  const { colors } = useTheme();

  const styles = React.useMemo(() => StyleSheet.create({
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
      color: colors.text,
      textAlign: 'center',
    },
    subtitle: {
      ...TextPresets.body,
      color: colors.textMuted,
      textAlign: 'center',
    },
    actionBtn: {
      marginTop: 8,
      paddingHorizontal: 24,
      paddingVertical: 11,
      borderRadius: Radius.chip,
      backgroundColor: colors.primary,
    },
    actionBtnText: {
      ...TextPresets.button,
      color: '#0A0A14',
    },
  }), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Text style={{ fontSize: 56, color: {colors.textMuted}, lineHeight: 60 }}>{'•'}</Text>
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
