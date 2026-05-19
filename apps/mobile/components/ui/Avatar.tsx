import React from 'react';
import { Image, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Radius, Typography } from '../../constants';
import { useTheme } from '../../src/theme/ThemeContext';

interface AvatarProps {
  name?: string;
  imageUri?: string;
  size?: number;
}

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function Avatar({ name, imageUri, size = 44 }: AvatarProps) {
  const { colors } = useTheme();
  const borderRadius = Radius.avatar;
  const fontSize = Math.round(size * 0.36);

  const styles = React.useMemo(() => StyleSheet.create({
    image: {
      overflow: 'hidden',
      backgroundColor: colors.card,
    },
    gradient: {
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    initials: {
      color: '#0A0A14',
      fontWeight: '700',
    },
  }), [colors]);

  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={[styles.image, { width: size, height: size, borderRadius }]}
      />
    );
  }

  return (
    <LinearGradient
      colors={[colors.primary, '#14B8A6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, { width: size, height: size, borderRadius }]}
    >
      <Text
        style={[
          styles.initials,
          { fontSize, fontFamily: Typography.fonts.heading },
        ]}
      >
        {getInitials(name)}
      </Text>
    </LinearGradient>
  );
}
