import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ListRenderItemInfo,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Colors, TextPresets, Radius, Spacing } from '../constants';

export const ONBOARDING_KEY = 'onboarding_done';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Slide {
  id: string;
  emoji: string;
  title: string;
  description: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    emoji: '✈️',
    title: 'Путешествуй умнее',
    description:
      'AI-ассистент найдёт лучшие рейсы и отели за секунды — просто опиши, куда хочешь',
  },
  {
    id: '2',
    emoji: '🤖',
    title: 'Просто напиши запрос',
    description:
      '«Хочу в Дубай на неделю в июне» — получи подборку вариантов с ценами прямо в чате',
  },
  {
    id: '3',
    emoji: '💳',
    title: 'Бронируй в пару касаний',
    description:
      'Кошелёк, история бронирований, уведомления о рейсах — всё в одном месте',
  },
];

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
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: '#F59E0B1A',
    borderWidth: 1.5,
    borderColor: '#F59E0B33',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  emoji: {
    fontSize: 64,
    lineHeight: 72,
  },
  title: {
    ...TextPresets.h2,
    fontFamily: 'Sora',
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    ...TextPresets.body,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default function OnboardingScreen() {
  const flatListRef = useRef<FlatList<Slide>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  async function finish() {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      // non-fatal
    }
    router.replace('/(auth)/login');
  }

  function goNext() {
    if (currentIndex < SLIDES.length - 1) {
      const next = currentIndex + 1;
      setCurrentIndex(next);
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
    } else {
      finish();
    }
  }

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <LinearGradient
      colors={['#0A0A14', '#2D1A0A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.root}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0A0A14" />
      <FlatList<Slide>
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: ListRenderItemInfo<Slide>) => <SlideItem item={item} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentIndex(idx);
        }}
        style={styles.flatList}
      />

      {/* Dot indicators */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === currentIndex && styles.dotActive]}
          />
        ))}
      </View>

      {/* Navigation buttons */}
      <View style={styles.footer}>
        {!isLast && (
          <TouchableOpacity onPress={finish} activeOpacity={0.7}>
            <Text style={styles.skipText}>Пропустить</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, isLast && styles.nextBtnFull]}
          onPress={goNext}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnText}>
            {isLast ? 'Начать' : 'Далее'}
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flatList: {
    flex: 1,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 28,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2A2A42',
  },
  dotActive: {
    width: 24,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPaddingH,
    paddingBottom: 52,
    gap: 12,
  },
  skipText: {
    ...TextPresets.bodyMedium,
    color: Colors.textMuted,
  },
  nextBtn: {
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: Radius.button,
    alignItems: 'center',
    minHeight: Spacing.buttonHeight,
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  nextBtnFull: {
    flex: 1,
    marginLeft: 0,
  },
  nextBtnText: {
    ...TextPresets.button,
    color: '#0A0A14',
  },
});
