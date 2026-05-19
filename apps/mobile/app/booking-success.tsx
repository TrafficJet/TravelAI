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
import { useTheme } from '../src/theme/ThemeContext';
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

function AnimatedCheckmark({ successColor }: { successColor: string }) {
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
      <Animated.View style={[checkStyles.ring, { borderColor: successColor }, ringStyle]} />
      <Animated.View style={[
        checkStyles.circle,
        { backgroundColor: `${successColor}22`, borderColor: successColor, shadowColor: successColor },
        circleStyle,
      ]}>
        <Text style={{ fontSize: 48, color: {successColor}, lineHeight: 52 }}>{'✓'}</Text>
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
    backgroundColor: 'transparent',
  },
  circle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
});

// ── Detail row ──────────────────────────────────────────────────────────────

interface DetailRowProps {
  label: string;
  value: string;
  valueColor?: string;
  labelColor: string;
  textColor: string;
}

function DetailRow({ label, value, valueColor, labelColor, textColor }: DetailRowProps) {
  return (
    <View style={detailStyles.row}>
      <Text style={[detailStyles.label, { color: labelColor }]}>{label}</Text>
      <Text style={[detailStyles.value, { color: valueColor ?? textColor }]}>
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
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  value: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    maxWidth: '60%',
    textAlign: 'right',
  },
});

// ── Screen ──────────────────────────────────────────────────────────────────

export default function BookingSuccessScreen() {
  const { colors } = useTheme();
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

  const origin      = str(raw.origin);
  const destination = str(raw.destination);
  const departureDate = str(raw.departureDate);
  const flightNumber  = str(raw.flightNumber);
  const airline       = str(raw.airline);
  const cabin         = str(raw.cabin);

  const hotelName  = str(raw.hotelName);
  const checkIn    = str(raw.checkIn);
  const checkOut   = str(raw.checkOut);

  const totalPrice = parseFloat(totalPriceStr) || 0;
  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency;
  const formattedTotal = totalPrice > 0
    ? `${totalPrice.toLocaleString('ru-RU')} ${currencySymbol}`
    : '—';

  const shortRef = bookingId
    ? `TRV-${bookingId.toUpperCase().slice(0, 4)}-${bookingId.toUpperCase().slice(4, 7)}`
    : 'TRV-2024-001';

  const isHotel = type === 'HOTEL';

  const routeLabel = isHotel
    ? hotelName || 'Отель'
    : (origin && destination ? `${origin.toUpperCase()} → ${destination.toUpperCase()}` : 'Маршрут');

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
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.confettiLayer, styles.confettiAbsolute]} pointerEvents="none">
        {CONFETTI_PIECES.map((p, i) => (
          <ConfettiPiece key={i} {...p} />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.delay(0).duration(400)} style={styles.planeEmoji}>
          <Text style={{ fontSize: 64, color: {colors.primary}, lineHeight: 68 }}>{'•'}</Text>
        </Animated.View>

        <AnimatedCheckmark successColor={colors.success} />

        <Animated.Text entering={FadeIn.delay(250).duration(400)} style={[styles.title, { color: colors.success }]}>
          Бронь подтверждена!
        </Animated.Text>
        <Animated.Text entering={FadeIn.delay(350).duration(400)} style={[styles.subtitle, { color: colors.textMuted }]}>
          {isHotel
            ? 'Ваш отель забронирован и оплачен'
            : 'Ваш рейс забронирован и оплачен'}
        </Animated.Text>

        <Animated.View entering={FadeInUp.delay(450).springify()} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.routeLabel, { color: colors.text }]}>{routeLabel}</Text>
            {buildSubtitle().length > 0 && (
              <Text style={[styles.routeSub, { color: colors.textMuted }]}>{buildSubtitle()}</Text>
            )}
          </View>

          <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

          <DetailRow label="Номер брони" value={shortRef} valueColor={colors.primary} labelColor={colors.textMuted} textColor={colors.text} />
          <DetailRow label="Тип" value={isHotel ? 'Отель' : 'Авиарейс'} labelColor={colors.textMuted} textColor={colors.text} />

          {!isHotel && airline ? (
            <DetailRow label="Авиакомпания" value={airline} labelColor={colors.textMuted} textColor={colors.text} />
          ) : null}

          <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.textMuted }]}>Итого оплачено</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>{formattedTotal}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(580).springify()} style={styles.actions}>
          <Button
            title="Посмотреть бронь"
            variant="primary"
            fullWidth
            onPress={() => {
              if (bookingId) {
                router.push(`/bookings/${bookingId}` as Parameters<typeof router.push>[0]);
              } else {
                router.replace('/(tabs)/bookings' as Parameters<typeof router.replace>[0]);
              }
            }}
          />
          <Button
            title="В мои брони"
            variant="secondary"
            fullWidth
            onPress={() => router.replace('/(tabs)/bookings' as Parameters<typeof router.replace>[0])}
          />
          <Button
            title="Вернуться в чат"
            variant="ghost"
            fullWidth
            onPress={() => router.replace('/(tabs)' as Parameters<typeof router.replace>[0])}
          />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  confettiLayer: {
    height: SCREEN_HEIGHT * 0.55,
    overflow: 'hidden',
  },
  confettiAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    pointerEvents: 'none',
  },
  body: {
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPaddingH,
    paddingTop: 32,
    gap: Spacing.md,
  },
  planeEmoji: {
    marginBottom: 4,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Sora',
    fontSize: Typography.sizes['3xl'],
    fontWeight: Typography.weights.extrabold,
    letterSpacing: 0.3,
    textAlign: 'center',
    marginTop: 8,
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.md,
    textAlign: 'center',
    lineHeight: 24,
  },
  card: {
    width: '100%',
    borderRadius: Radius.cardLg,
    padding: Spacing.cardPaddingLg,
    borderWidth: 1,
    marginTop: 8,
  },
  cardHeader: {
    alignItems: 'center',
    paddingBottom: Spacing.sm,
    gap: 4,
  },
  routeLabel: {
    fontFamily: 'Sora',
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.extrabold,
    letterSpacing: 1,
    textAlign: 'center',
  },
  routeSub: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  totalLabel: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  totalValue: {
    fontFamily: 'Sora',
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.extrabold,
  },
  actions: {
    width: '100%',
    gap: Spacing.sm,
    marginTop: 8,
  },
});
