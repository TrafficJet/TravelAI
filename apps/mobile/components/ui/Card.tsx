import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { Radius, Shadows } from '../../constants';
import { useTheme } from '../../src/theme/ThemeContext';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, style, ...rest }: CardProps) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: Radius.card,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      ...Shadows.md,
    },
  }), [colors]);

  return (
    <View {...rest} style={[styles.card, style]}>
      {children}
    </View>
  );
}
