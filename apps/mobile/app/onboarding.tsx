import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  ListRenderItemInfo,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../stores/authStore';
import { Colors, TextPresets, Spacing } from '../constants';

export const ONBOARDING_KEY = 'onboarding_done';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Slide data ───────────────────────────────────────────────────────────────

interface Slide {
  id: string;
  emoji: string;
  title: string;
  description: string;
  gradientEnd: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    emoji: '🌍',
    title: 'Твой личный AI-помощник в путешествиях',
    description:
      'Просто скажи куда хочешь — TravelAI подберёт рейсы, отели и трансфер за секунды',
    gradientEnd: '#1A0D00',
  },
  {
    id: '2',
    emoji: '🗺️',
    title: 'Полный маршрут от двери до двери',
    description:
      'Такси в аэропорт, рейс, отель, трансфер по прилёту — всё в одном чате',
    gradientEnd: '#001A1A',
  },
  {
    id: '3',
    emoji: '🤖',
    title: 'AI замечает то, о чём вы забываете',
    description:
      'Прилёт в 8:00, заселение в 14:00? AI предупредит и предложит хранение багажа или ранний заезд',
    gradientEnd: '#0D001A',
  },
  {
    id: '4',
    emoji: '⚡',
    title: 'Бронируй в 2 касания',
    description:
      'Рейсы, отели, рестораны, аренда авто — подтверди одним нажатием',
    gradientEnd: '#1A1100',
  },
];

const TOTAL = SLIDES.length;

// ─── Single slide component ───────────────────────────────────────────────────

function SlideItem({ item }: { item: Slide }) {
  return (
    <View style={[slideStyles.container, { width: SCREEN_WIDTH }]}>
      <View style={slideStyles.iconWrap}>
        <Text style={slideStyles.emoji}>{item.emoji}</Text>
      </View>
      <Text style={slideStyles.title}>{item.title}</Text>
      <Text style={slideStyles.description}>{item.description}</Text>
    </View>
  );
}

const slideStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconWrap: {
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: 'rgba(245,158,11,0.10)',
    borderWidth: 1.5,
    borderColor: 'rgba(245,158,11,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 44,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 8,
  },
  emoji: {
    fontSize: 72,
    lineHeight: 80,
  },
  title: {
    fontFamily: 'Sora_Bold',
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 34,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 18,
    letterSpacing: -0.3,
  },
  description: {
    ...TextPresets.body,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 26,
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuthStore();

  const flatListRef = useRef<FlatList<Slide>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Animated value tracking scroll position (0 → TOTAL-1)
  const scrollX = useRef(new Animated.Value(0)).current;

  // ── Finish onboarding ──────────────────────────────────────────────────────
  const finish = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      // non-fatal
    }
    if (isAuthenticated) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated]);

  // ── Next slide / finish ────────────────────────────────────────────────────
  const goNext = useCallback(() => {
    if (currentIndex < TOTAL - 1) {
      const next = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setCurrentIndex(next);
    } else {
      void finish();
    }
  }, [currentIndex, finish]);

  // ── Track FlatList scroll to update dots & index ───────────────────────────
  const onMomentumScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      setCurrentIndex(idx);
    },
    [],
  );

  const isLast = currentIndex === TOTAL - 1;

  // ── Gradient interpolation ─────────────────────────────────────────────────
  // Each slide occupies SCREEN_WIDTH of scroll. We interpolate gradientEnd
  // color across the slide boundaries.
  const gradientEndColor = scrollX.interpolate({
    inputRange: SLIDES.map((_, i) => i * SCREEN_WIDTH),
    outputRange: SLIDES.map((s) => s.gradientEnd),
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Animated background gradient — reacts to scroll position */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { zIndex: 0 }]}
        // AnimatedView does not accept string-interpolated colors directly
        // We render a static fallback gradient and overlay a tinted layer.
      >
        <LinearGradient
          colors={[Colors.background, SLIDES[currentIndex].gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Skip button */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        {!isLast ? (
          <TouchableOpacity
            onPress={() => void finish()}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
            style={styles.skipBtn}
          >
            <Text style={styles.skipText}>Пропустить</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipBtn} />
        )}
      </View>

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
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        style={styles.flatList}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      {/* Dot indicators */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => {
          const isActive = i === currentIndex;
          return (
            <View
              key={i}
              style={[
                styles.dot,
                isActive ? styles.dotActive : styles.dotInactive,
              ]}
            />
          );
        })}
      </View>

      {/* Footer: Next / Start button */}
      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 20) + 32 },
        ]}
      >
        <TouchableOpacity
          style={[styles.nextBtn, isLast && styles.nextBtnFull]}
          onPress={goNext}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnText}>{isLast ? 'Начать' : 'Далее'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.screenPaddingH,
    zIndex: 10,
  },
  skipBtn: {
    minWidth: 80,
    alignItems: 'flex-end',
  },
  skipText: {
    ...TextPresets.bodyMedium,
    color: Colors.textMuted,
  },
  flatList: {
    flex: 1,
    zIndex: 1,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
    zIndex: 1,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotInactive: {
    width: 8,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.primary,
  },
  footer: {
    paddingHorizontal: Spacing.screenPaddingH,
    zIndex: 1,
  },
  nextBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
  },
  nextBtnFull: {
    // already full-width by default since footer fills horizontal padding
  },
  nextBtnText: {
    fontFamily: 'Sora_Bold',
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textInverse,
    letterSpacing: 0.2,
  },
});
