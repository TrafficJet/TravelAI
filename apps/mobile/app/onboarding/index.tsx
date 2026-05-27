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
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { safeStorage } from '../../utils/safeStorage';
import { analyticsService } from '../../src/services/analytics.service';
import { AnalyticsEvents } from '../../src/constants/analytics-events';
import { SvitLogo } from '../../components/SvitLogo';

// ─── Public constant (consumed by _layout.tsx) ────────────────────────────────

export const ONBOARDING_KEY = 'onboarding_done';

// ─── Brand tokens (design screen 07) ─────────────────────────────────────────
// Values match constants/colors.ts and src/theme/colors.ts exactly.
// useTheme() is not available at module level in static StyleSheet.create,
// so token values are replicated here as named constants with clear references.

const COLORS = {
  background: '#0E0C1C',   // Colors.background
  primary: '#E8A020',      // Colors.primary
  secondary: '#7C5CFC',    // Colors.secondary
  white: '#F4F2FF',        // Colors.text
  subtitle: '#8888A8',     // Colors.textMuted
  dotInactive: '#2E2B42',  // Colors.border
  textInverse: '#0E0C1C',  // Colors.textInverse
  textDisabled: '#4E4E68', // Colors.textDisabled
} as const;

// ─── Slide data ───────────────────────────────────────────────────────────────

interface Slide {
  id: string;
  headline: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    headline: 'Твой мир.\nТвой маршрут.',
    body: 'Напиши куда хочешь — SVIT найдёт рейс, отель и маршрут. Без форм, без вкладок.',
  },
  {
    id: '2',
    headline: 'Бронируй\nпрямо в чате',
    body: 'Без редиректов. Оплачивай картой или крипто — как удобно.',
  },
  {
    id: '3',
    headline: 'Маршрут\nна каждый день',
    body: 'AI составит план поездки: куда идти, что смотреть, где есть — локальные инсайды.',
  },
];

const TOTAL = SLIDES.length;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// SvitLogo imported from components/SvitLogo.tsx

// ─── Single slide (middle content area) ──────────────────────────────────────

function SlideItem({ item }: { item: Slide }) {
  return (
    <View style={[slideStyles.container, { width: SCREEN_WIDTH }]}>
      <Text style={slideStyles.headline}>{item.headline}</Text>
      <Text style={slideStyles.body}>{item.body}</Text>
    </View>
  );
}

const slideStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  headline: {
    fontFamily: 'Sora',
    fontSize: 23,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 10,
  },
  body: {
    fontSize: 12,
    color: COLORS.subtitle,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<Slide>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const isLast = currentIndex === TOTAL - 1;

  useEffect(() => {
    analyticsService.track(AnalyticsEvents.ONBOARDING.STARTED);
  }, []);

  const finish = useCallback(async (skipped = false) => {
    if (skipped) {
      analyticsService.track(AnalyticsEvents.ONBOARDING.SKIPPED, { slide_index: currentIndex });
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

  const goNext = useCallback(() => {
    if (currentIndex < TOTAL - 1) {
      const next = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setCurrentIndex(next);
    } else {
      void finish();
    }
  }, [currentIndex, finish]);

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

      {/* Radial gradient background (teal top, amber bottom) */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* teal radial top */}
        <View style={styles.bgTeal} />
        {/* amber radial bottom */}
        <View style={styles.bgAmber} />
      </View>

      {/* Logo area — fixed at top */}
      <View style={[styles.logoArea, { paddingTop: Math.max(insets.top + 28, 76) }]}>
        <SvitLogo />
        {/* "SVIT" with gradient text effect (approximated via shadow tint) */}
        <Text style={styles.brandText}>SVIT</Text>
        <Text style={styles.brandTag}>AI Travel</Text>
      </View>

      {/* Slides — swipeable headline + body area */}
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

      {/* Bottom zone */}
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
        {/* Pagination dots: active = wide 20px gradient, inactive = 6px circle */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => {
            const isActive = i === currentIndex;
            if (isActive) {
              return (
                <LinearGradient
                  key={i}
                  colors={[COLORS.secondary, COLORS.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.dotActive}
                />
              );
            }
            return <View key={i} style={styles.dotInactive} />;
          })}
        </View>

        {/* CTA: gradient amber→teal, border-radius 28px */}
        <TouchableOpacity
          onPress={goNext}
          activeOpacity={0.85}
          style={[
            styles.ctaWrapper,
            Platform.select({
              ios: {
                shadowColor: COLORS.primary,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.4,
                shadowRadius: 14,
              },
              android: { elevation: 6 },
            }),
          ]}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaText}>
              {isLast ? 'Начать путешествие' : 'Далее'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Secondary action */}
        <TouchableOpacity
          onPress={() => void finish(true)}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
        >
          <Text style={styles.secondaryText}>
            Уже есть аккаунт?{' '}
            <Text style={{ color: COLORS.secondary, fontWeight: '500' }}>Войти</Text>
          </Text>
        </TouchableOpacity>

        {/* Powered by */}
        <Text style={styles.poweredBy}>Powered by Claude AI</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },

  // Radial gradient background layers
  bgTeal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    // Approximated: elliptical teal glow at top
    borderBottomLeftRadius: 500,
    borderBottomRightRadius: 500,
    opacity: 0.08,
    backgroundColor: COLORS.secondary,
  },
  bgAmber: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    borderTopLeftRadius: 500,
    borderTopRightRadius: 500,
    opacity: 0.07,
    backgroundColor: COLORS.primary,
  },

  // Logo area
  logoArea: {
    alignItems: 'center',
    paddingBottom: 16,
    width: '100%',
  },
  brandText: {
    fontFamily: 'Sora',
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 7,
    color: COLORS.secondary, // teal tint; gradient-clip not available in RN without SVG
    marginTop: 14,
    marginBottom: 4,
  },
  brandTag: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 3.5,
    textTransform: 'uppercase',
    color: COLORS.subtitle,
  },

  flatList: {
    flex: 1,
    width: '100%',
  },

  // Bottom area
  bottom: {
    width: '100%',
    paddingHorizontal: 24,
    gap: 10,
    alignItems: 'center',
  },

  // Pagination dots
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  dotActive: {
    width: 20,
    height: 6,
    borderRadius: 3,
  },
  dotInactive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.dotInactive,
  },

  // CTA button
  ctaWrapper: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
  },
  ctaGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 28,
  },
  ctaText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textInverse,
    letterSpacing: 0.2,
  },

  // Secondary link
  secondaryText: {
    fontSize: 11,
    color: COLORS.subtitle,
    textAlign: 'center',
  },
  poweredBy: {
    fontSize: 8.5,
    color: COLORS.textDisabled,
    letterSpacing: 1,
    textAlign: 'center',
    paddingBottom: 2,
  },
});
