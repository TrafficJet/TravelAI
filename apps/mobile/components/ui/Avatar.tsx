import React from 'react';
import { Image, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius, Typography } from '../../constants';

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
  const borderRadius = Radius.avatar;
  const fontSize = Math.round(size * 0.36);

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
      colors={[Colors.primary, Colors.secondary]}
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

const styles = StyleSheet.create({
  image: {
    overflow: 'hidden',
    backgroundColor: Colors.elevated,
  },
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    color: Colors.textInverse,
    fontWeight: '700',
  },
});
