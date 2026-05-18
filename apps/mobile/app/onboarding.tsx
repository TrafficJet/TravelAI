import React, { useRef, useState, useCallback, useEffect } from 'react';
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
import { Colors, TextPresets, Spacing, Radius } from '../constants';

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
    emoji: '💰',
    title: 'Всё в рамках вашего бюджета',
    description:
      'AI подбирает варианты по вашим предпочтениям и никогда не выходит за рамки бюджета',
    gradientEnd: '#001200',
  },
  {
    id: '4',
    emoji: '🤝',
    title: 'Всегда рядом в поездке',
    description:
      'Прилёт в 8:00, заселение в 14:00? AI предупредит и предложит хранение багажа или ранний заезд',
    gradientEnd: '#0D001A',
  },
];

const TOTAL = SLIDES.length;

// ─── Animated emoji illustration ─────────────────────────────────────────────

function AnimatedEmoji({ emoji, active }: { emoji: string; active: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0.5)).current;

  // Fade-in on mount
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  // Gentle float animation when slide is active
  useEffect(() => {
    if (!active) return;

    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.06,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]),
    );

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.9,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.4,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]),
    );

    float.start();
    glow.start();

    return () => {
      float.stop();
      glow.stop();
    };
  }, [active, scale, glowOpacity]);

  return (
    <Animated.View style={[slideStyles.iconOuter, { opacity }]}>
      {/* Glow ring */}
      <Animated.View style={[slideStyles.glowRing, { opacity: glowOpacity }]} />
      {/* Inner circle */}
      <Animated.View style={[slideStyles.iconWrap, { transform: [{ scale }] }]}>
        <Text style={slideStyles.emoji}>{emoji}</Text>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Single slide component ───────────────────────────────────────────────────

function SlideItem({ item, active }: { item: Slide; active: boolean }) {
  return (
    <View style={[slideStyles.container, { width: SCREEN_WIDTH }]}>
      <AnimatedEmoji emoji={item.emoji} active={active} />
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
  iconOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 44,
    width: 180,
    height: 180,
  },
  glowRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(245,158,11,0.18)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 32,
    elevation: 12,
  },
  iconWrap: {
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(245,158,11,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  emoji: {
    fontSize: 68,
    lineHeight: 76,
  },
  title: {
    fontFamily: 'Sora',
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

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Animated background gradient — reacts to current slide */}
      <LinearGradient
        colors={[Colors.background, SLIDES[currentIndex].gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Skip button — top right */}
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
        renderItem={({ item, index }: ListRenderItemInfo<Slide>) => (
          <SlideItem item={item} active={index === currentIndex} />
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

      {/* Dot indicators — amber, active = wide pill */}
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

      {/* Footer: Next / Start + account link on last slide */}
      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 20) + 32 },
        ]}
      >
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={goNext}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnText}>{isLast ? 'Начать' : 'Далее'}</Text>
        </TouchableOpacity>

        {isLast && (
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.replace('/(auth)/login')}
            activeOpacity={0.7}
          >
            <Text style={styles.loginBtnText}>У меня уже есть аккаунт</Text>
          </TouchableOpacity>
        )}
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
    width: 28,
    backgroundColor: Colors.primary,
  },
  footer: {
    paddingHorizontal: Spacing.screenPaddingH,
    zIndex: 1,
    gap: 12,
  },
  nextBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
  },
  nextBtnText: {
    fontFamily: 'Sora',
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textInverse,
    letterSpacing: 0.2,
  },
  loginBtn: {
    paddingVertical: 14,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  loginBtnText: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.1,
  },
});
