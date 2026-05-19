import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ListRenderItemInfo,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { safeStorage } from '../../utils/safeStorage';
import { analyticsService } from '../../src/services/analytics.service';
import { AnalyticsEvents } from '../../src/constants/analytics-events';

// ─── Public constant (consumed by _layout.tsx) ────────────────────────────────

export const ONBOARDING_KEY = 'onboarding_done';

// ─── Brand tokens ─────────────────────────────────────────────────────────────

const COLORS = {
  background: '#060B18',
  gold: '#E8A020',
  aiPurple: '#7C5CFC',
  white: '#F5F5FA',
  subtitle: '#A0A0B0',
  dotInactive: '#333333',
} as const;

// ─── Slide data ───────────────────────────────────────────────────────────────

interface Slide {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    emoji: '\u{1F4AC}',
    title: 'Просто напиши куда хочешь',
    subtitle:
      'SVIT сам найдёт рейсы, отели и составит маршрут — как умный друг-трэвел-агент',
  },
  {
    id: '2',
    emoji: '✈️',
    title: 'Бронируй прямо в чате',
    subtitle:
      'Без редиректов и вкладок. Оплачивай картой, Mir или крипто — как удобно',
  },
  {
    id: '3',
    emoji: '\u{1F5FA}️',
    title: 'Маршрут по дням — в подарок',
    subtitle:
      'AI составит план поездки: куда идти, что смотреть, где есть — локальные инсайды',
  },
];

const TOTAL = SLIDES.length;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Single slide ─────────────────────────────────────────────────────────────

function SlideItem({ item }: { item: Slide }) {
  return (
    <View style={[slideStyles.container, { width: SCREEN_WIDTH }]}>
      <View style={slideStyles.iconCircle}>
        <Text style={slideStyles.emoji}>{item.emoji}</Text>
      </View>
      <Text style={slideStyles.title}>{item.title}</Text>
      <Text style={slideStyles.subtitle}>{item.subtitle}</Text>
    </View>
  );
}

const slideStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  emoji: {
    fontSize: 64,
    lineHeight: 76,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 18,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.subtitle,
    textAlign: 'center',
    lineHeight: 24,
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<Slide>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const isLast = currentIndex === TOTAL - 1;

  // Трекинг: onboarding_started при первом показе экрана
  useEffect(() => {
    analyticsService.track(AnalyticsEvents.ONBOARDING.STARTED);
  }, []);

  // Save flag and navigate away
  const finish = useCallback(async (skipped = false) => {
    if (skipped) {
      analyticsService.track(AnalyticsEvents.ONBOARDING.SKIPPED, {
        slide_index: currentIndex,
      });
    } else {
      analyticsService.track(AnalyticsEvents.ONBOARDING.COMPLETED);
    }
    try {
      await safeStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      // non-fatal
    }
    router.replace('/(auth)/login');
  }, [currentIndex]);

  // Advance to next slide or finish
  const goNext = useCallback(() => {
    if (currentIndex < TOTAL - 1) {
      const next = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setCurrentIndex(next);
    } else {
      void finish();
    }
  }, [currentIndex, finish]);

  // Sync index with manual swipe
  const onMomentumScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      setCurrentIndex(idx);
    },
    [],
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Slides */}
      <FlatList<Slide>
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: ListRenderItemInfo<Slide>) => (
          <SlideItem item={item} />
        )}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        style={styles.flatList}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      {/* Bottom zone — shared across all slides */}
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}>
        {/* Paginator dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* CTA button */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={goNext}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>{isLast ? 'Начать' : 'Далее'}</Text>
        </TouchableOpacity>

        {/* Skip link — only on slides 1 and 2 */}
        {!isLast ? (
          <TouchableOpacity
            onPress={() => void finish(true)}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
          >
            <Text style={styles.skipText}>Пропустить</Text>
          </TouchableOpacity>
        ) : (
          // Reserve the same vertical space so the layout does not shift
          <View style={styles.skipPlaceholder} />
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flatList: {
    flex: 1,
  },
  bottom: {
    paddingHorizontal: 24,
    gap: 16,
    alignItems: 'center',
  },
  // Paginator
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 28,
    backgroundColor: COLORS.gold,
  },
  dotInactive: {
    width: 8,
    backgroundColor: COLORS.dotInactive,
  },
  // CTA button
  ctaButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    // Shadow
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gold,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 14,
      },
      android: { elevation: 6 },
    }),
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.2,
  },
  // Skip
  skipText: {
    fontSize: 15,
    color: COLORS.subtitle,
    fontWeight: '500',
  },
  skipPlaceholder: {
    height: 22, // approx line height of skip text
  },
});
