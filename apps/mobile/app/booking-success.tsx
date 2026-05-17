import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Button } from '../components/ui/Button';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  FadeInUp,
  FadeIn,
} from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { Typography } from '../constants/typography';
import { Spacing } from '../constants/spacing';
import { Radius } from '../constants/radius';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── Confetti piece ──────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
  '#6366F1', '#22C55E', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899',
  '#10B981', '#F97316', '#8B5CF6', '#14B8A6',
];

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
    translateY.value = withDelay(delay, withTiming(SCREEN_HEIGHT * 0.65, { duration: 2200 }));
    opacity.value = withDelay(delay + 1400, withTiming(0, { duration: 800 }));
    rotate.value = withDelay(delay, withTiming(540, { duration: 2200 }));
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
        { backgroundColor: color, width: size, height: size * 0.45, left: startX },
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
  { color: CONFETTI_COLORS[0], startX: SCREEN_WIDTH * 0.05, delay: 0,   size: 10 },
  { color: CONFETTI_COLORS[1], startX: SCREEN_WIDTH * 0.15, delay: 140, size: 8  },
  { color: CONFETTI_COLORS[2], startX: SCREEN_WIDTH * 0.28, delay: 60,  size: 12 },
  { color: CONFETTI_COLORS[3], startX: SCREEN_WIDTH * 0.40, delay: 200, size: 9  },
  { color: CONFETTI_COLORS[4], startX: SCREEN_WIDTH * 0.52, delay: 80,  size: 11 },
  { color: CONFETTI_COLORS[5], startX: SCREEN_WIDTH * 0.64, delay: 160, size: 8  },
  { color: CONFETTI_COLORS[6], startX: SCREEN_WIDTH * 0.75, delay: 40,  size: 10 },
  { color: CONFETTI_COLORS[7], startX: SCREEN_WIDTH * 0.85, delay: 120, size: 9  },
  { color: CONFETTI_COLORS[8], startX: SCREEN_WIDTH * 0.92, delay: 180, size: 7  },
];

// ── Animated checkmark ──────────────────────────────────────────────────────

function AnimatedCheckmark() {
  const scale = useSharedValue(0);
  const ringScale = useSharedValue(0.6);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 8, stiffness: 140, mass: 0.8 });
    ringScale.value = withDelay(200, withSpring(1.5, { damping: 6, stiffness: 80 }));
    ringOpacity.value = withDelay(200, withTiming(0, { duration: 900 }));
  }, [scale, ringScale, ringOpacity]);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return (
    <View style={checkStyles.wrapper}>
      {/* Expanding ring pulse */}
      <Animated.View style={[checkStyles.ring, ringStyle]} />
      {/* Main circle */}
      <Animated.View style={[checkStyles.circle, circleStyle]}>
        <Text style={checkStyles.icon}>✓</Text>
      </Animated.View>
    </View>
  );
}

const checkStyles = StyleSheet.create({
  wrapper: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: Colors.success,
    backgroundColor: 'transparent',
  },
  circle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${Colors.success}22`,
    borderWidth: 3,
    borderColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
  icon: {
    color: Colors.success,
    fontSize: 44,
    fontWeight: Typography.weights.bold,
    lineHeight: 52,
  },
});

// ── Detail row ──────────────────────────────────────────────────────────────

interface DetailRowProps {
  label: string;
  value: string;
  valueColor?: string;
}

function DetailRow({ label, value, valueColor }: DetailRowProps) {
  return (
    <View style={detailStyles.row}>
      <Text style={detailStyles.label}>{label}</Text>
      <Text style={[detailStyles.value, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  label: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  value: {
    color: Colors.text,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    maxWidth: '60%',
    textAlign: 'right',
  },
});

// ── Screen ──────────────────────────────────────────────────────────────────

export default function BookingSuccessScreen() {
  const insets = useSafeAreaInsets();
  const raw = useLocalSearchParams();

  function str(v: string | string[] | undefined, fallback = ''): string {
    if (Array.isArray(v)) return v[0] ?? fallback;
    return v ?? fallback;
  }

  const bookingId   = str(raw.bookingId);
  const type        = str(raw.type, 'FLIGHT') as 'FLIGHT' | 'HOTEL';
  const totalPriceStr = str(raw.totalPrice, '0');
  const currency    = str(raw.currency, 'USD');

  // Flight-specific
  const origin      = str(raw.origin);
  const destination = str(raw.destination);
  const departureDate = str(raw.departureDate);
  const flightNumber  = str(raw.flightNumber);
  const airline       = str(raw.airline);
  const cabin         = str(raw.cabin);

  // Hotel-specific
  const hotelName  = str(raw.hotelName);
  const checkIn    = str(raw.checkIn);
  const checkOut   = str(raw.checkOut);

  const totalPrice = parseFloat(totalPriceStr) || 0;
  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency;
  const formattedTotal = totalPrice > 0
    ? `${totalPrice.toLocaleString('ru-RU')} ${currencySymbol}`
    : '—';

  // Short booking reference: TRV-XXXX-XXX
  const shortRef = bookingId
    ? `TRV-${bookingId.toUpperCase().slice(0, 4)}-${bookingId.toUpperCase().slice(4, 7)}`
    : 'TRV-2024-001';

  const isHotel = type === 'HOTEL';

  // Route label e.g. "WAW → BCN"
  const routeLabel = isHotel
    ? hotelName || 'Отель'
    : (origin && destination ? `${origin.toUpperCase()} → ${destination.toUpperCase()}` : 'Маршрут');

  // Subtitle line e.g. "31 мая 2026 · LO 100 Эконом"
  function buildSubtitle(): string {
    if (isHotel) {
      if (checkIn && checkOut) return `${formatRuDate(checkIn)} — ${formatRuDate(checkOut)}`;
      return '';
    }
    const parts: string[] = [];
    if (departureDate) parts.push(formatRuDate(departureDate));
    const flightPart = [airline, flightNumber, cabin].filter(Boolean).join(' ');
    if (flightPart) parts.push(flightPart);
    return parts.join(' · ');
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Confetti layer */}
      <View style={styles.confettiLayer} pointerEvents="none">
        {CONFETTI_PIECES.map((p, i) => (
          <ConfettiPiece key={i} {...p} />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Airplane emoji */}
        <Animated.Text entering={FadeIn.delay(0).duration(400)} style={styles.planeEmoji}>
          {isHotel ? '🏨' : '✈️'}
        </Animated.Text>

        {/* Animated checkmark */}
        <AnimatedCheckmark />

        {/* Title */}
        <Animated.Text entering={FadeIn.delay(250).duration(400)} style={styles.title}>
          Бронь подтверждена!
        </Animated.Text>
        <Animated.Text entering={FadeIn.delay(350).duration(400)} style={styles.subtitle}>
          {isHotel
            ? 'Ваш отель забронирован и оплачен'
            : 'Ваш рейс забронирован и оплачен'}
        </Animated.Text>

        {/* Booking details card */}
        <Animated.View entering={FadeInUp.delay(450).springify()} style={styles.card}>
          {/* Route / hotel name */}
          <View style={styles.cardHeader}>
            <Text style={styles.routeLabel}>{routeLabel}</Text>
            {buildSubtitle().length > 0 && (
              <Text style={styles.routeSub}>{buildSubtitle()}</Text>
            )}
          </View>

          <View style={styles.cardDivider} />

          {/* Booking reference */}
          <DetailRow label="Номер брони" value={shortRef} valueColor={Colors.primary} />

          {/* Type */}
          <DetailRow label="Тип" value={isHotel ? 'Отель' : 'Авиарейс'} />

          {/* Extra details for flights */}
          {!isHotel && airline ? (
            <DetailRow label="Авиакомпания" value={airline} />
          ) : null}

          {/* Total */}
          <View style={styles.cardDivider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Итого оплачено</Text>
            <Text style={styles.totalValue}>{formattedTotal}</Text>
          </View>
        </Animated.View>

        {/* Actions */}
        <Animated.View entering={FadeInUp.delay(580).springify()} style={styles.actions}>
          <Button
            title="Посмотреть бронь"
            variant="primary"
            fullWidth
            onPress={() => {
              if (bookingId) {
                router.push(`/bookings/${bookingId}` as Parameters<typeof router.push>[0]);
              } else {
                router.push('/(tabs)/bookings' as Parameters<typeof router.push>[0]);
              }
            }}
          />
          <Button
            title="Вернуться в чат"
            variant="secondary"
            fullWidth
            onPress={() => router.replace('/(tabs)')}
          />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatRuDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ── Styles ───────────────────────────────────────────────────────────────────

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
    height: SCREEN_HEIGHT * 0.55,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  body: {
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPaddingH,
    paddingTop: 32,
    gap: Spacing.md,
  },
  planeEmoji: {
    fontSize: 48,
    marginBottom: 4,
  },
  title: {
    color: Colors.success,
    fontSize: Typography.sizes['3xl'],
    fontWeight: Typography.weights.extrabold,
    letterSpacing: 0.3,
    textAlign: 'center',
    marginTop: 8,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.md,
    textAlign: 'center',
    lineHeight: 24,
  },
  // Card
  card: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: Radius.cardLg,
    padding: Spacing.cardPaddingLg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 8,
  },
  cardHeader: {
    alignItems: 'center',
    paddingBottom: Spacing.sm,
    gap: 4,
  },
  routeLabel: {
    color: Colors.text,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.extrabold,
    letterSpacing: 1,
    textAlign: 'center',
  },
  routeSub: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  totalLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  totalValue: {
    color: Colors.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.extrabold,
  },
  // Actions
  actions: {
    width: '100%',
    gap: Spacing.sm,
    marginTop: 8,
  },
});
