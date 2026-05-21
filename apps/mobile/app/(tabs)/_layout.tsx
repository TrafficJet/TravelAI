import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs, router } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Typography } from '../../constants/typography';
import { useTranslation } from 'react-i18next';
import { useNotificationsContext } from '../../context/NotificationsContext';
import { useTheme } from '../../src/theme/ThemeContext';
import {
  IconChat,
  IconAirplane,
  IconWallet,
  IconPerson,
} from '../../components/icons';

// ── Custom tab bar — hides dynamic chat route from tab strip ──────────────────

const HIDDEN_ROUTE_PATTERN = /^chat\//;

function FilteredTabBar(props: BottomTabBarProps) {
  const filteredState = {
    ...props.state,
    routes: props.state.routes.filter((r) => !HIDDEN_ROUTE_PATTERN.test(r.name)),
  };
  const visibleIndex = filteredState.routes.findIndex(
    (r) => r.key === props.state.routes[props.state.index]?.key,
  );
  const safeIndex = visibleIndex >= 0 ? visibleIndex : 0;
  return (
    <BottomTabBar
      {...props}
      state={{ ...filteredState, index: safeIndex }}
    />
  );
}

// ── Badge component ───────────────────────────────────────────────────────────

function TabBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={badgeStyles.container}>
      <Text style={badgeStyles.text}>{count > 99 ? '99+' : String(count)}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F43F5E',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: Typography.weights.bold,
    lineHeight: 11,
  },
});

// ── Animated tab icon ─────────────────────────────────────────────────────────

interface TabIconProps {
  focused: boolean;
  color: string;
  size: number;
  renderIcon: (color: string, size: number) => React.ReactNode;
  badge?: number;
}

function TabIcon({ focused, color, size, renderIcon, badge }: TabIconProps) {
  const focusedSV = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    focusedSV.value = focused ? 1 : 0;
  }, [focused, focusedSV]);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = withSpring(focusedSV.value === 1 ? 1.08 : 1, {
      damping: 14,
      stiffness: 200,
    });
    const opacity = withTiming(focusedSV.value === 1 ? 1 : 0.75, { duration: 150 });
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[{ position: 'relative' }, animatedStyle]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {renderIcon(color, size)}
      {badge !== undefined && <TabBadge count={badge} />}
    </Animated.View>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function TabsLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  useNotificationsContext(); // keep context subscribed for background badge updates

  const tabBarHeight = 70 + (Platform.OS === 'ios' ? insets.bottom : 0);

  return (
    <Tabs
      tabBar={(props) => <FilteredTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: '#0E0C1C' },
        headerTintColor: '#F4F2FF',
        headerTitleStyle: { fontWeight: Typography.weights.bold, color: '#F4F2FF' },
        headerShadowVisible: false,
        tabBarStyle: {
          // SVIT brand: bg #0E0C1C, border-top #2E2B42, height 70px
          backgroundColor: '#0E0C1C',
          borderTopColor: '#2E2B42',
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#E8A020',
        tabBarInactiveTintColor: '#4A4A62',
        tabBarLabelStyle: {
          fontSize: 8.5,
          fontWeight: Typography.weights.medium,
          includeFontPadding: false,
          letterSpacing: 0.2,
          marginTop: 3,
        },
        tabBarItemStyle: {
          paddingHorizontal: 0,
        },
      }}
    >
      {/* 1 — Чат */}
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.chat', { defaultValue: 'Чат' }),
          headerShown: false,
          tabBarLabel: 'Чат',
          tabBarIcon: (props) => (
            <TabIcon
              {...props}
              renderIcon={(color, size) => <IconChat color={color} size={size} />}
            />
          ),
        }}
      />
      {/* 2 — Поездки */}
      <Tabs.Screen
        name="bookings"
        options={{
          title: t('tabs.trips', { defaultValue: 'Поездки' }),
          headerShown: false,
          tabBarLabel: 'Поездки',
          tabBarIcon: (props) => (
            <TabIcon
              {...props}
              renderIcon={(color, size) => <IconAirplane color={color} size={size} />}
            />
          ),
        }}
      />
      {/* 3 — Кошелёк */}
      <Tabs.Screen
        name="wallet"
        options={{
          title: t('tabs.wallet', { defaultValue: 'Кошелёк' }),
          headerShown: false,
          tabBarLabel: 'Кошелёк',
          tabBarIcon: (props) => (
            <TabIcon
              {...props}
              renderIcon={(color, size) => <IconWallet color={color} size={size} />}
            />
          ),
        }}
      />
      {/* 4 — Профиль */}
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile', { defaultValue: 'Профиль' }),
          headerShown: false,
          tabBarLabel: 'Профиль',
          tabBarIcon: (props) => (
            <TabIcon
              {...props}
              renderIcon={(color, size) => <IconPerson color={color} size={size} />}
            />
          ),
        }}
      />
      {/* Hidden tabs — kept for routing but not shown in tab bar */}
      <Tabs.Screen
        name="favorites"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="explore"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
          title: t('tabs.notifications', { defaultValue: 'Уведомления' }),
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 8, padding: 6 }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 22, color: colors.text }}>{'←'}</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="search-history"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="chat/[sessionId]"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
