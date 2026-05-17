import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Radius } from '../../constants/radius';
import { Spacing } from '../../constants/spacing';
import { useAuthStore } from '../../stores/authStore';

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
  return (
    <View style={featureStyles.row}>
      <Text style={included ? featureStyles.iconYes : featureStyles.iconNo}>
        {included ? '✅' : '❌'}
      </Text>
      <Text style={[featureStyles.text, !included && featureStyles.textMuted]}>
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
  iconYes: {
    fontSize: 14,
    width: 20,
    textAlign: 'center',
  },
  iconNo: {
    fontSize: 14,
    width: 20,
    textAlign: 'center',
    opacity: 0.45,
  },
  text: {
    color: Colors.text,
    fontSize: Typography.sizes.base,
    flex: 1,
  },
  textMuted: {
    color: Colors.textMuted,
  },
});

// ── FREE card ─────────────────────────────────────────────────────────────────

function FreeCard({ isActive }: { isActive: boolean }) {
  return (
    <Animated.View entering={FadeInDown.delay(120).duration(400)} style={cardStyles.wrapper}>
      <View style={[cardStyles.card, cardStyles.cardFree]}>
        {/* Plan header row */}
        <View style={cardStyles.headerRow}>
          <View>
            <Text style={cardStyles.planNameFree}>FREE</Text>
            <View style={cardStyles.divider} />
          </View>
          {isActive && (
            <View style={cardStyles.currentBadge}>
              <Text style={cardStyles.currentBadgeText}>Текущий план</Text>
            </View>
          )}
        </View>

        {/* Features */}
        <View style={cardStyles.features}>
          {FREE_FEATURES.map((f) => (
            <FeatureRow key={f.text} text={f.text} included={f.included} />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

// ── PREMIUM card ──────────────────────────────────────────────────────────────

function PremiumCard({ isActive }: { isActive: boolean }) {
  return (
    <Animated.View entering={FadeInDown.delay(220).duration(400)} style={cardStyles.wrapper}>
      <View style={[cardStyles.card, cardStyles.cardPremium]}>
        {/* Recommended badge */}
        <View style={cardStyles.recommendedBadge}>
          <Text style={cardStyles.recommendedBadgeText}>РЕКОМЕНДУЕМ</Text>
        </View>

        {/* Plan header row */}
        <View style={cardStyles.headerRow}>
          <View>
            <Text style={cardStyles.planNamePremium}>PREMIUM </Text>
            <View style={[cardStyles.divider, cardStyles.dividerAmber]} />
          </View>
          <View style={cardStyles.priceBlock}>
            <Text style={cardStyles.priceAmount}>$19.99</Text>
            <Text style={cardStyles.pricePeriod}>/месяц</Text>
          </View>
        </View>

        {/* Features */}
        <View style={cardStyles.features}>
          {PREMIUM_FEATURES.map((f) => (
            <FeatureRow key={f.text} text={f.text} included={f.included} />
          ))}
        </View>

        {isActive && (
          <View style={cardStyles.activePill}>
            <Text style={cardStyles.activePillText}>Текущий план</Text>
          </View>
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
  cardFree: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
  },
  cardPremium: {
    backgroundColor: '#1A1628',
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  planNameFree: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.extrabold,
    letterSpacing: 1,
    marginBottom: 8,
  },
  planNamePremium: {
    color: Colors.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.extrabold,
    letterSpacing: 1,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    width: 40,
    backgroundColor: Colors.border,
    marginBottom: 4,
  },
  dividerAmber: {
    backgroundColor: Colors.primary,
  },
  priceBlock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  priceAmount: {
    color: Colors.primary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.extrabold,
  },
  pricePeriod: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    paddingBottom: 3,
  },
  features: {
    marginTop: 4,
  },
  recommendedBadge: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderRadius: Radius.tag,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  recommendedBadgeText: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.8,
  },
  currentBadge: {
    backgroundColor: `${Colors.textMuted}20`,
    borderRadius: Radius.chip,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  currentBadgeText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  activePill: {
    marginTop: 14,
    backgroundColor: `${Colors.primary}20`,
    borderRadius: Radius.button,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${Colors.primary}50`,
  },
  activePillText: {
    color: Colors.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SubscriptionPlansScreen() {
  const { user } = useAuthStore();
  const currentPlan = user?.subscription?.plan ?? 'FREE';
  const isPremium = currentPlan === 'PREMIUM';

  function handleSubscribe() {
    Alert.alert(
      'Скоро',
      'Оформление подписки будет доступно в следующем обновлении.',
      [{ text: 'Понятно' }],
    );
  }

  return (
    <ScrollView
      style={screenStyles.container}
      contentContainerStyle={screenStyles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(0).duration(400)}>
        <Text style={screenStyles.title}>Выбери план</Text>
        <Text style={screenStyles.subtitle}>Путешествуй умнее с Premium</Text>
      </Animated.View>

      {/* Separator */}
      <Animated.View
        entering={FadeInDown.delay(60).duration(400)}
        style={screenStyles.separator}
      />

      {/* Plan cards */}
      <FreeCard isActive={!isPremium} />
      <PremiumCard isActive={isPremium} />

      {/* CTA button */}
      {!isPremium && (
        <Animated.View entering={FadeInDown.delay(320).duration(400)}>
          <TouchableOpacity
            style={screenStyles.ctaBtn}
            onPress={handleSubscribe}
            activeOpacity={0.85}
          >
            <Text style={screenStyles.ctaBtnText}>
              Оформить Premium — $19.99/мес
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.delay(400).duration(400)}>
        <Text style={screenStyles.disclaimer}>
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
    backgroundColor: Colors.background,
  },
  content: {
    padding: 24,
    paddingBottom: 60,
  },
  title: {
    color: Colors.text,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.extrabold,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.base,
    textAlign: 'center',
    marginBottom: 20,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 24,
  },
  ctaBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.button,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  ctaBtnText: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  disclaimer: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
});
