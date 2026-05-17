import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Button } from '../components/ui/Button';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  FadeInUp,
  FadeIn,
} from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { Typography } from '../constants/typography';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── Confetti piece ─────────────────────────────────────────────────────────────

const CONFETTI_COLORS = ['#6366F1', '#22C55E', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'];

interface ConfettiPieceProps {
  color: string;
  startX: number;
  delay: number;
  size: number;
}

function ConfettiPiece({ color, startX, delay, size }: ConfettiPieceProps) {
  const translateY = useSharedValue(-20);
  const opacity = useSharedValue(1);
  const rotate = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withTiming(SCREEN_HEIGHT * 0.6, { duration: 2000 }),
    );
    opacity.value = withDelay(
      delay,
      withTiming(0, { duration: 2000 }),
    );
    rotate.value = withDelay(
      delay,
      withTiming(720, { duration: 2000 }),
    );
  }, [delay, translateY, opacity, rotate]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        confettiStyles.piece,
        {
          backgroundColor: color,
          width: size,
          height: size * 0.5,
          left: startX,
        },
        animatedStyle,
      ]}
    />
  );
}

const confettiStyles = StyleSheet.create({
  piece: {
    position: 'absolute',
    top: 0,
    borderRadius: 2,
  },
});

const CONFETTI_PIECES: ConfettiPieceProps[] = [
  { color: CONFETTI_COLORS[0], startX: SCREEN_WIDTH * 0.1, delay: 0, size: 10 },
  { color: CONFETTI_COLORS[1], startX: SCREEN_WIDTH * 0.25, delay: 120, size: 8 },
  { color: CONFETTI_COLORS[2], startX: SCREEN_WIDTH * 0.4, delay: 60, size: 12 },
  { color: CONFETTI_COLORS[3], startX: SCREEN_WIDTH * 0.6, delay: 200, size: 9 },
  { color: CONFETTI_COLORS[4], startX: SCREEN_WIDTH * 0.75, delay: 80, size: 11 },
  { color: CONFETTI_COLORS[5], startX: SCREEN_WIDTH * 0.88, delay: 150, size: 8 },
];

// ── Animated checkmark ─────────────────────────────────────────────────────────

function AnimatedCheckmark() {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 120 });
    opacity.value = withTiming(1, { duration: 300 });
  }, [scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[checkStyles.circle, animatedStyle]}>
      <Text style={checkStyles.icon}>✓</Text>
    </Animated.View>
  );
}

const checkStyles = StyleSheet.create({
  circle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${Colors.success}22`,
    borderWidth: 3,
    borderColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    color: Colors.success,
    fontSize: Typography.sizes['4xl'],
    fontWeight: Typography.weights.bold,
    lineHeight: 60,
  },
});

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function BookingSuccessScreen() {
  const insets = useSafeAreaInsets();
  const raw = useLocalSearchParams();

  function str(v: string | string[] | undefined, fallback = ''): string {
    if (Array.isArray(v)) return v[0] ?? fallback;
    return v ?? fallback;
  }

  const bookingId = str(raw.bookingId);
  const type = str(raw.type, 'FLIGHT') as 'FLIGHT' | 'HOTEL';
  const totalPriceStr = str(raw.totalPrice, '0');
  const currency = str(raw.currency, 'USD');

  const totalPrice = parseFloat(totalPriceStr) || 0;
  const currencySymbol = currency === 'USD' ? '$' : currency;
  const shortId = bookingId.toUpperCase().slice(0, 8);
  const typeLabel = type === 'HOTEL' ? 'Отель' : 'Рейс';

  const formattedTotal = totalPrice > 0
    ? `${totalPrice.toLocaleString('ru-RU')} ${currencySymbol}`
    : '—';

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      {/* Confetti */}
      <View style={styles.confettiLayer} pointerEvents="none">
        {CONFETTI_PIECES.map((p, i) => (
          <ConfettiPiece key={i} {...p} />
        ))}
      </View>

      <View style={styles.body}>
        {/* Checkmark */}
        <AnimatedCheckmark />

        {/* Title */}
        <Animated.Text entering={FadeIn.delay(200).duration(400)} style={styles.title}>
          Готово!
        </Animated.Text>
        <Animated.Text entering={FadeIn.delay(300).duration(400)} style={styles.subtitle}>
          Ваше бронирование подтверждено
        </Animated.Text>

        {/* Booking card */}
        <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.card}>
          <Text style={styles.cardLabel}>Номер бронирования</Text>
          <Text style={styles.cardId}>{shortId}</Text>
          <View style={styles.cardDivider} />
          <View style={styles.cardRow}>
            <Text style={styles.cardMeta}>Тип</Text>
            <Text style={styles.cardMetaValue}>{typeLabel}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardMeta}>Итого</Text>
            <Text style={styles.cardTotalValue}>{formattedTotal}</Text>
          </View>
        </Animated.View>

        {/* Actions */}
        <Animated.View entering={FadeInUp.delay(520).springify()} style={styles.actions}>
          <Button
            title="Посмотреть бронирование"
            variant="primary"
            fullWidth
            onPress={() => { if (bookingId) router.push(`/bookings/${bookingId}`); }}
          />

          <Button
            title="Вернуться к чатам"
            variant="secondary"
            fullWidth
            onPress={() => router.replace('/(tabs)')}
          />
        </Animated.View>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  confettiLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.5,
    overflow: 'hidden',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 20,
  },
  title: {
    color: Colors.text,
    fontSize: Typography.sizes['3xl'],
    fontWeight: Typography.weights.extrabold,
    letterSpacing: 0.5,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Booking card
  card: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
    alignItems: 'center',
  },
  cardLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardId: {
    color: Colors.text,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.extrabold,
    letterSpacing: 4,
  },
  cardDivider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  cardRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardMeta: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
  },
  cardMetaValue: {
    color: Colors.text,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  cardTotalValue: {
    color: Colors.text,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  // Buttons
  actions: {
    width: '100%',
    gap: 12,
  },
});
