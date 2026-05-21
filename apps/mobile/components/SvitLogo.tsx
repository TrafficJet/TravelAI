import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';

// ─── SVIT brand logo ──────────────────────────────────────────────────────────
// Dark circle (#1A1527) with a gold airplane (#E8A020) inside.
// Matches the SVIT brandbook: gold plane on dark background.

interface SvitLogoProps {
  /** Diameter of the outer circle in dp. Default: 80 */
  size?: number;
}

export function SvitLogo({ size = 80 }: SvitLogoProps) {
  // The SVG viewBox is 100x100 so all coordinates are relative to that.
  const radius = size / 2;

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: radius }]}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        accessibilityLabel="SVIT logo"
      >
        {/* Background circle */}
        <Circle cx="50" cy="50" r="50" fill="#1A1527" />

        {/* Subtle gold ring */}
        <Circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke="#E8A020"
          strokeWidth="1"
          opacity="0.35"
        />

        {/* Airplane body — pointing top-right (classic travel icon) */}
        <G fill="#E8A020">
          {/* Main fuselage */}
          <Path d="M50 22 C52 22 54 24 54 26 L54 44 L72 52 L72 56 L54 52 L54 62 L60 66 L60 70 L50 67 L40 70 L40 66 L46 62 L46 52 L28 56 L28 52 L46 44 L46 26 C46 24 48 22 50 22 Z" />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
});
