import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { Typography } from '../../constants/typography';
import { useTheme } from '../../src/theme/ThemeContext';

interface Props {
  message?: string;
}

export function FullScreenLoading({ message = 'Загрузка...' }: Props) {
  const { colors } = useTheme();
  const planeOpacity = useRef(new Animated.Value(0.4)).current;
  const planeScale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(planeOpacity, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(planeScale, {
            toValue: 1.08,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(planeOpacity, {
            toValue: 0.4,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(planeScale, {
            toValue: 0.95,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    pulse.start();
    return () => pulse.stop();
  }, [planeOpacity, planeScale]);

  const styles = React.useMemo(() => StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
    },
    glowRing: {
      position: 'absolute',
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: 'rgba(232,160,32,0.07)',
      borderWidth: 1,
      borderColor: 'rgba(232,160,32,0.15)',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 30,
      elevation: 0,
    },
    plane: {
      fontSize: 52,
      lineHeight: 60,
    },
    message: {
      color: colors.textMuted,
      fontSize: Typography.sizes.sm,
      fontWeight: '400',
      letterSpacing: 0.3,
    },
  }), [colors]);

  return (
    <View style={styles.root}>
      {/* Amber glow ring behind the plane */}
      <View style={styles.glowRing} />

      <Animated.Text
        style={[
          styles.plane,
          {
            opacity: planeOpacity,
            transform: [{ scale: planeScale }],
          },
        ]}
      >
        ✈️
      </Animated.Text>

      <Text style={styles.message}>{message}</Text>
    </View>
  );
}
