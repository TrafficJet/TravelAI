import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Typography } from '../../constants/typography';
import { Radius } from '../../constants/radius';
import { Spacing } from '../../constants/spacing';
import { useAuthStore } from '../../stores/authStore';
import { useTheme } from '../../src/theme/ThemeContext';

// ── Subscription price constant ───────────────────────────────────────────────

const SUBSCRIPTION_PRICE = 19.99;

// ── Feature definitions ───────────────────────────────────────────────────────

interface Feature {
  text: string;
  included: boolean;
}

const FREE_FEATURES: Feature[] = [
  { text: '3 чата в день', included: true },
  { text: 'Поиск рейсов', included: true },
  { text: 'Поиск отелей', included: false },
  { text: 'AI голосовые звонки', included: false },
  { text: 'Приоритетная поддержка', included: false },
];

const PREMIUM_FEATURES: Feature[] = [
  { text: 'Безлимитные чаты', included: true },
  { text: 'Поиск рейсов + отелей', included: true },
  { text: 'AI голосовые звонки (скоро)', included: true },
  { text: 'Приоритетная поддержка', included: true },
  { text: 'Ранний доступ к функциям', included: true },
];

// ── Feature row ───────────────────────────────────────────────────────────────

function FeatureRow({ text, included }: Feature) {
  const { colors } = useTheme();
  return (
    <View style={featureStyles.row}>
      <View style={[featureStyles.iconBox, included ? featureStyles.iconBoxYes : featureStyles.iconBoxNo]}>
        <Text style={[featureStyles.iconText, included ? featureStyles.iconTextYes : { color: colors.textMuted }]}>
          {included ? '✓' : '✕'}
        </Text>
      </View>
      <Text style={[featureStyles.text, { color: included ? colors.text : colors.textMuted }]}>
        {text}
      </Text>
    </View>
  );
}

const featureStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  iconBox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxYes: {
    backgroundColor: '#2ECC7120',
  },
  iconBoxNo: {
    backgroundColor: 'transparent',
  },
  iconText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  iconTextYes: {
    color: '#2ECC71',
  },
  text: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    flex: 1,
  },
});

// ── Countdown hook ────────────────────────────────────────────────────────────

function useCountdown(expiresAt: Date | null) {
  const [timeLeft, setTimeLeft] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft('');
      return;
    }

    const tick = () => {
      const now = Date.now();
      const diff = expiresAt.getTime() - now;
      if (diff <= 0) {
        setTimeLeft('00:00:00:00');
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      const pad = (n: number) => String(n).padStart(2, '0');
      setTimeLeft(`${pad(days)}д ${pad(hours)}:${pad(mins)}:${pad(secs)}`);
    };

    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [expiresAt]);

  return timeLeft;
}

// ── FREE card ─────────────────────────────────────────────────────────────────

function FreeCard({ isActive, onSelect }: { isActive: boolean; onSelect: () => void }) {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(120).duration(400)} style={cardStyles.wrapper}>
      <View style={[cardStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Plan header row */}
        <View style={cardStyles.headerRow}>
          <View>
            <Text style={[cardStyles.planNameFree, { color: colors.textMuted }]}>FREE</Text>
            <View style={[cardStyles.divider, { backgroundColor: colors.border }]} />
          </View>
        </View>

        {/* Features */}
        <View style={cardStyles.features}>
          {FREE_FEATURES.map((f) => (
            <FeatureRow key={f.text} text={f.text} included={f.included} />
          ))}
        </View>

        {/* Action button */}
        {isActive ? (
          <View style={[cardStyles.currentPill, { backgroundColor: `${colors.textMuted}15`, borderColor: colors.border }]}>
            <Text style={[cardStyles.currentPillText, { color: colors.textMuted }]}>Текущий план</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={cardStyles.selectBtnWhite}
            onPress={onSelect}
            activeOpacity={0.8}
          >
            <Text style={cardStyles.selectBtnWhiteText}>Выбрать</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

// ── PREMIUM card ──────────────────────────────────────────────────────────────

function PremiumCard({
  isActive,
  cancelled,
  cancelExpiresAt,
  onSelect,
}: {
  isActive: boolean;
  cancelled: boolean;
  cancelExpiresAt: Date | null;
  onSelect: () => void;
}) {
  const { colors } = useTheme();
  const countdown = useCountdown(cancelExpiresAt);

  return (
    <Animated.View entering={FadeInDown.delay(220).duration(400)} style={cardStyles.wrapper}>
      <View style={[cardStyles.card, cardStyles.cardPremium, { borderColor: colors.primary, backgroundColor: colors.card }]}>
        {/* Recommended badge */}
        <View style={[cardStyles.recommendedBadge, { backgroundColor: colors.primary }]}>
          <Text style={cardStyles.recommendedBadgeText}>РЕКОМЕНДУЕМ</Text>
        </View>

        {/* Plan header row */}
        <View style={cardStyles.headerRow}>
          <View>
            <Text style={[cardStyles.planNamePremium, { color: colors.primary }]}>PREMIUM </Text>
            <View style={[cardStyles.divider, { backgroundColor: colors.primary }]} />
          </View>
          <View style={cardStyles.priceBlock}>
            <Text style={[cardStyles.priceAmount, { color: colors.primary }]}>${`${SUBSCRIPTION_PRICE}`}</Text>
            <Text style={[cardStyles.pricePeriod, { color: colors.textMuted }]}>/месяц</Text>
          </View>
        </View>

        {/* Features */}
        <View style={cardStyles.features}>
          {PREMIUM_FEATURES.map((f) => (
            <FeatureRow key={f.text} text={f.text} included={f.included} />
          ))}
        </View>

        {/* Action button */}
        {isActive && !cancelled ? (
          <View style={[cardStyles.activePill, { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}50` }]}>
            <Text style={[cardStyles.activePillText, { color: colors.primary }]}>Текущий план</Text>
          </View>
        ) : isActive && cancelled ? (
          // Cancelled but still active — show countdown
          <View style={cardStyles.countdownPill}>
            <Text style={cardStyles.countdownLabel}>Активен ещё</Text>
            <Text style={cardStyles.countdownTimer}>{countdown}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[cardStyles.selectBtnAmber, { backgroundColor: colors.primary }]}
            onPress={onSelect}
            activeOpacity={0.8}
          >
            <Text style={cardStyles.selectBtnAmberText}>Выбрать</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const cardStyles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  card: {
    borderRadius: Radius.cardLg,
    padding: 20,
    borderWidth: 1,
  },
  cardPremium: {
    borderWidth: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  planNameFree: {
    fontFamily: 'Sora',
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.extrabold,
    letterSpacing: 1,
    marginBottom: 8,
  },
  planNamePremium: {
    fontFamily: 'Sora',
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.extrabold,
    letterSpacing: 1,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    width: 40,
    marginBottom: 4,
  },
  priceBlock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  priceAmount: {
    fontFamily: 'Sora',
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.extrabold,
  },
  pricePeriod: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    paddingBottom: 3,
  },
  features: {
    marginTop: 4,
  },
  recommendedBadge: {
    alignSelf: 'flex-end',
    borderRadius: Radius.tag,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  recommendedBadgeText: {
    color: '#fff',
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.8,
  },
  // FREE plan — "Текущий план" pill (greyed out)
  currentPill: {
    marginTop: 14,
    borderRadius: Radius.button,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  currentPillText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  // FREE plan — "Выбрать" white button
  selectBtnWhite: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.button,
    paddingVertical: 12,
    alignItems: 'center',
  },
  selectBtnWhiteText: {
    color: '#000000',
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  // PREMIUM plan — "Текущий план" pill (amber tint)
  activePill: {
    marginTop: 14,
    borderRadius: Radius.button,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  activePillText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  // PREMIUM plan — "Выбрать" amber button
  selectBtnAmber: {
    marginTop: 14,
    borderRadius: Radius.button,
    paddingVertical: 12,
    alignItems: 'center',
  },
  selectBtnAmberText: {
    color: '#fff',
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  // PREMIUM — countdown pill after cancellation
  countdownPill: {
    marginTop: 14,
    backgroundColor: '#FF6B3520',
    borderRadius: Radius.button,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF6B3560',
    gap: 2,
  },
  countdownLabel: {
    color: '#FF9060',
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  countdownTimer: {
    color: '#FF6B35',
    fontFamily: 'Sora',
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.extrabold,
    letterSpacing: 1,
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SubscriptionPlansScreen() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const currentPlan = user?.subscription?.plan ?? 'FREE';
  const isPremium = currentPlan === 'PREMIUM';

  // Local cancellation state — tracks if user cancelled but period hasn't ended
  const [cancelled, setCancelled] = useState(false);
  const [cancelExpiresAt, setCancelExpiresAt] = useState<Date | null>(null);

  // After cancellation FREE becomes "active", PREMIUM shows countdown
  const freeIsActive = !isPremium || cancelled;

  function handleSelectFree() {
    Alert.alert(
      'Отменить подписку?',
      'После отмены Premium останется активным до конца оплаченного периода. Вы уверены?',
      [
        { text: 'Нет, оставить', style: 'cancel' },
        {
          text: 'Да, отменить',
          style: 'destructive',
          onPress: () => {
            // Set expiry to 30 days from now
            const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            setCancelled(true);
            setCancelExpiresAt(expiry);
          },
        },
      ],
    );
  }

  function handleSelectPremium() {
    console.log('[Subscription] Premium purchase attempted');
    Alert.alert(
      'Premium — в разработке',
      'Оплата подписки через App Store / Google Play будет доступна в следующем обновлении. Следите за обновлениями!',
      [{ text: 'Понятно', style: 'default' }],
    );
  }

  return (
    <ScrollView
      style={[screenStyles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={screenStyles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(0).duration(400)}>
        <Text style={[screenStyles.title, { color: colors.text }]}>Выбери план</Text>
      </Animated.View>

      {/* Separator */}
      <Animated.View
        entering={FadeInDown.delay(60).duration(400)}
        style={[screenStyles.separator, { backgroundColor: colors.border }]}
      />

      {/* Plan cards */}
      <FreeCard
        isActive={freeIsActive}
        onSelect={handleSelectFree}
      />
      <PremiumCard
        isActive={isPremium}
        cancelled={cancelled}
        cancelExpiresAt={cancelExpiresAt}
        onSelect={handleSelectPremium}
      />

      <Animated.View entering={FadeInDown.delay(320).duration(400)}>
        <Text style={[screenStyles.disclaimer, { color: colors.textMuted }]}>
          Отмена подписки в любое время. Списание выполняется в начале
          каждого расчётного периода.
        </Text>
      </Animated.View>
    </ScrollView>
  );
}

const screenStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 8,
    paddingBottom: 60,
  },
  title: {
    fontFamily: 'Sora',
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.extrabold,
    textAlign: 'center',
    marginBottom: 16,
  },
  separator: {
    height: 1,
    marginBottom: 24,
  },
  disclaimer: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },
});
