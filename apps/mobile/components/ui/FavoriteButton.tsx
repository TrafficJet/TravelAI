import React from 'react';
import { TouchableOpacity, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../src/theme/ThemeContext';
import { useFavoritesStore } from '../../stores/favoritesStore';
import type { Hotel, FlightOffer } from '../../types';

type FavoriteButtonProps =
  | { type: 'hotel'; item: Hotel; size?: number }
  | { type: 'flight'; item: FlightOffer; size?: number };

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function FavoriteButton({ type, item, size = 22 }: FavoriteButtonProps) {
  const { colors } = useTheme();
  const { addHotel, removeHotel, addFlight, removeFlight, isFavoriteHotel, isFavoriteFlight } =
    useFavoritesStore();

  const isFav = type === 'hotel' ? isFavoriteHotel(item.id) : isFavoriteFlight(item.id);

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePress() {
    // Pulse animation: 1 -> 1.3 -> 1
    scale.value = withSpring(1.3, { damping: 8, stiffness: 300 }, () => {
      scale.value = withSpring(1, { damping: 10, stiffness: 200 });
    });

    if (type === 'hotel') {
      if (isFav) {
        removeHotel(item.id);
      } else {
        addHotel(item as Hotel);
      }
    } else {
      if (isFav) {
        removeFlight(item.id);
      } else {
        addFlight(item as FlightOffer);
      }
    }
  }

  return (
    <AnimatedTouchable
      style={[styles.btn, animatedStyle]}
      onPress={handlePress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      activeOpacity={0.7}
    >
      <Text style={{ fontSize: size, color: isFav ? colors.error : colors.textMuted, lineHeight: size + 4 }}>
        {isFav ? '♥' : '♡'}
      </Text>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  btn: {
    padding: 4,
  },
});
