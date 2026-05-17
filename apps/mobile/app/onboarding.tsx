import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ListRenderItemInfo,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, TextPresets, Radius, Spacing } from '../constants';

export const ONBOARDING_KEY = 'onboarding_done';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Slide {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    icon: 'airplane-outline',
    title: 'Планируй путешествия голосом',
    description:
      'Просто скажи, куда хочешь поехать, и AI-помощник возьмёт всё на себя — маршрут, рейсы, отели.',
  },
  {
    id: '2',
    icon: 'search-outline',
    title: 'AI найдёт лучшие рейсы',
    description:
      'Искусственный интеллект анализирует тысячи вариантов, чтобы выбрать оптимальное предложение именно для вас.',
  },
  {
    id: '3',
    icon: 'lock-closed-outline',
    title: 'Безопасная оплата',
    description:
      'Все платежи защищены шифрованием. Ваши данные в безопасности — мы следим за этим.',
  },
];

function SlideItem({ item }: { item: Slide }) {
  return (
    <View style={[slideStyles.container, { width: SCREEN_WIDTH }]}>
      <View style={slideStyles.iconWrap}>
        <Ionicons name={item.icon} size={72} color={Colors.primary} />
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
    paddingHorizontal: 36,
  },
  iconWrap: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: `${Colors.primary}1A`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  title: {
    ...TextPresets.displayHero,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    ...TextPresets.body,
    color: Colors.textMuted,
    textAlign: 'center',
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
    <View style={styles.root}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flatList: {
    flex: 1,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 22,
    backgroundColor: Colors.primary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPaddingH,
    paddingBottom: 48,
  },
  skipText: {
    ...TextPresets.bodyMedium,
    color: Colors.textMuted,
  },
  nextBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: Radius.button,
    alignItems: 'center',
    minHeight: Spacing.buttonHeight,
    justifyContent: 'center',
  },
  nextBtnFull: {
    flex: 1,
    marginLeft: 0,
  },
  nextBtnText: {
    ...TextPresets.button,
    color: Colors.textInverse,
  },
});
