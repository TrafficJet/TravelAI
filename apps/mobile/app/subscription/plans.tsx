import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import Animated, { FadeInDown, type BaseAnimationBuilder } from 'react-native-reanimated';
import { useAuthStore } from '../../stores/authStore';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import type { SubscriptionPlan } from '../../types';

// ── Plan definitions ──────────────────────────────────────────────────────────

const PLANS: SubscriptionPlan[] = [
  {
    id: 'FREE',
    name: 'Free',
    price: 0,
    currency: 'USD',
    dailyLimit: 10,
    features: [
      '10 запросов в день',
      'Поиск рейсов и отелей',
      'Базовые фильтры',
      'История чатов (7 дней)',
    ],
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 3,
    currency: 'USD',
    dailyLimit: 100,
    features: [
      '100 запросов в день',
      'Расширенные фильтры',
      'История чатов (бессрочно)',
      'Уведомления об изменении цен',
    ],
  },
  {
    id: 'PREMIUM',
    name: 'Premium',
    price: 7,
    currency: 'USD',
    unlimited: true,
    priority: true,
    features: [
      'Безлимитные запросы',
      'Приоритетный AI',
      'История чатов (бессрочно)',
      'Эксклюзивные предложения',
      'Поддержка 24/7',
    ],
  },
];

// ── Plan gradient colours ─────────────────────────────────────────────────────

const PLAN_GRADIENTS: Record<string, { top: string; bottom: string }> = {
  FREE: { top: Colors.card, bottom: Colors.surface },
  PRO: { top: '#1e1a3a', bottom: '#16182e' },
  PREMIUM: { top: '#2a1a3e', bottom: '#1a1230' },
};

const PLAN_ACCENT: Record<string, string> = {
  FREE: Colors.textMuted,
  PRO: Colors.primary,
  PREMIUM: '#a78bfa',
};

// Pseudo-gradient via nested views (no expo-linear-gradient dependency)
function GradientCard({
  planId,
  children,
  style,
}: {
  planId: string;
  children: React.ReactNode;
  style?: object;
}) {
  const grad = PLAN_GRADIENTS[planId] ?? PLAN_GRADIENTS.FREE;
  return (
    <View style={[gradStyles.outer, { backgroundColor: grad.top }, style]}>
      <View style={[gradStyles.inner, { backgroundColor: grad.bottom }]} />
      <View style={gradStyles.content}>{children}</View>
    </View>
  );
}

const gradStyles = StyleSheet.create({
  outer: {
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  inner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    borderRadius: 20,
  },
  content: {
    padding: 20,
  },
});

// ── Progress bar ──────────────────────────────────────────────────────────────

function UsageProgressBar({
  used,
  limit,
  unlimited,
}: {
  used: number;
  limit?: number;
  unlimited?: boolean;
}) {
  const fraction = unlimited || !limit ? 0 : Math.min(used / limit, 1);
  const pct = Math.round(fraction * 100);

  return (
    <View style={progressStyles.container}>
      <View style={progressStyles.header}>
        <Text style={progressStyles.label}>Использовано сегодня</Text>
        <Text style={progressStyles.value}>
          {unlimited ? 'Безлимит' : `${used} / ${limit ?? '?'}`}
        </Text>
      </View>
      {!unlimited && (
        <View style={progressStyles.track}>
          <View style={[progressStyles.fill, { width: `${pct}%` }]} />
        </View>
      )}
    </View>
  );
}

const progressStyles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  value: {
    color: Colors.text,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
});

// ── Feature row ───────────────────────────────────────────────────────────────

function FeatureRow({ text, included }: { text: string; included: boolean }) {
  return (
    <View style={featureStyles.row}>
      <Text style={[featureStyles.icon, included ? featureStyles.yes : featureStyles.no]}>
        {included ? '✓' : '✗'}
      </Text>
      <Text style={[featureStyles.text, !included && featureStyles.textMuted]}>{text}</Text>
    </View>
  );
}

const featureStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  icon: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.extrabold,
    width: 16,
    textAlign: 'center',
  },
  yes: { color: Colors.success },
  no: { color: Colors.error },
  text: {
    color: Colors.text,
    fontSize: Typography.sizes.sm,
    flex: 1,
  },
  textMuted: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
});

// ── Plan card ─────────────────────────────────────────────────────────────────

interface PlanCardProps {
  plan: SubscriptionPlan;
  isActive: boolean;
  entering: BaseAnimationBuilder;
}

function PlanCard({ plan, isActive, entering }: PlanCardProps) {
  const accent = PLAN_ACCENT[plan.id] ?? Colors.primary;
  const isPremium = plan.id === 'PREMIUM';
  const isPro = plan.id === 'PRO';
  const isHighlighted = isPremium || isPro;

  function handleSelect() {
    if (isActive) return;
    Alert.alert(
      'Оплата временно недоступна',
      'Скоро будет доступно через ЮKassa',
      [{ text: 'Понятно' }],
    );
  }

  return (
    <Animated.View entering={entering} style={cardStyles.wrapper}>
      <GradientCard
        planId={plan.id}
        style={[
          cardStyles.card,
          isActive && { borderColor: accent, borderWidth: 2 },
          !isActive && { borderColor: Colors.border, borderWidth: 1.5 },
        ]}
      >
        {/* Popular badge */}
        {isPremium && (
          <View style={[cardStyles.badge, { backgroundColor: accent }]}>
            <Text style={cardStyles.badgeText}>Популярный</Text>
          </View>
        )}
        {isPro && (
          <View style={[cardStyles.badge, { backgroundColor: Colors.primary }]}>
            <Text style={cardStyles.badgeText}>Выгодно</Text>
          </View>
        )}

        {/* Icon + Name */}
        <Text style={cardStyles.icon}>
          {plan.id === 'FREE' ? '○' : plan.id === 'PRO' ? '★' : '◆'}
        </Text>
        <Text style={[cardStyles.planName, { color: isHighlighted ? accent : Colors.text }]}>
          {plan.name}
        </Text>

        {/* Price */}
        <View style={cardStyles.priceRow}>
          {plan.price === 0 ? (
            <Text style={cardStyles.priceText}>Бесплатно</Text>
          ) : (
            <>
              <Text style={[cardStyles.priceText, { color: accent }]}>
                ${plan.price.toLocaleString('ru-RU')}
              </Text>
              <Text style={cardStyles.pricePeriod}>/мес</Text>
            </>
          )}
        </View>

        {/* Features */}
        <View style={cardStyles.features}>
          {plan.features.map((f) => (
            <FeatureRow key={f} text={f} included />
          ))}
        </View>

        {/* Action */}
        {isActive ? (
          <View style={[cardStyles.activeChip, { backgroundColor: `${accent}25` }]}>
            <Text style={[cardStyles.activeChipText, { color: accent }]}>Текущий план</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              cardStyles.selectBtn,
              {
                backgroundColor: isHighlighted ? accent : 'transparent',
                borderColor: accent,
                borderWidth: isHighlighted ? 0 : 1.5,
              },
            ]}
            onPress={handleSelect}
            activeOpacity={0.8}
          >
            <Text
              style={[
                cardStyles.selectBtnText,
                { color: isHighlighted ? Colors.textInverse : accent },
              ]}
            >
              Выбрать план
            </Text>
          </TouchableOpacity>
        )}
      </GradientCard>
    </Animated.View>
  );
}

const cardStyles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomLeftRadius: 14,
  },
  badgeText: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.5,
  },
  icon: {
    fontSize: Typography.sizes['3xl'],
    marginBottom: 8,
  },
  planName: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.extrabold,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    marginBottom: 18,
  },
  priceText: {
    color: Colors.text,
    fontSize: Typography.sizes['3xl'],
    fontWeight: Typography.weights.extrabold,
  },
  pricePeriod: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.md,
    paddingBottom: 5,
  },
  features: {
    marginBottom: 16,
  },
  activeChip: {
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  activeChipText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  selectBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  selectBtnText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SubscriptionPlansScreen() {
  const { user } = useAuthStore();

  const currentPlan = user?.subscription?.plan ?? 'FREE';
  const dailyUsed = user?.subscription?.dailyUsed ?? 0;
  const activePlanDef = PLANS.find((p) => p.id === currentPlan) ?? PLANS[0];

  return (
    <ScrollView
      style={screenStyles.container}
      contentContainerStyle={screenStyles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(0).duration(400)}>
        <Text style={screenStyles.title}>Выберите план</Text>
        <Text style={screenStyles.subtitle}>
          Разблокируйте все возможности Travel AI
        </Text>
      </Animated.View>

      {/* Usage progress for current plan */}
      <Animated.View
        entering={FadeInDown.delay(80).duration(400)}
        style={screenStyles.usageCard}
      >
        <Text style={screenStyles.usageTitle}>
          Ваш план: <Text style={{ color: PLAN_ACCENT[currentPlan] }}>{activePlanDef?.name}</Text>
        </Text>
        <UsageProgressBar
          used={dailyUsed}
          limit={activePlanDef?.dailyLimit}
          unlimited={activePlanDef?.unlimited}
        />
      </Animated.View>

      {/* Plan cards */}
      {PLANS.map((plan, index) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          isActive={plan.id === currentPlan}
          entering={FadeInDown.delay(160 + index * 80).duration(400)}
        />
      ))}

      <Animated.View entering={FadeInDown.delay(480).duration(400)}>
        <Text style={screenStyles.disclaimer}>
          Оплата через ЮKassa. Отмена подписки в любое время.
          Списание выполняется в начале каждого расчётного периода.
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
    marginBottom: 28,
  },
  usageCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  usageTitle: {
    color: Colors.text,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    marginBottom: 8,
  },
  disclaimer: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },
});
