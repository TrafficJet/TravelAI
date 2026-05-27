import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs, router, usePathname } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
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

// ── Badge component ───────────────────────────────────────────────────────────

function TabBadge({ count }: { count: number }) {
  const { colors } = useTheme();
  if (count <= 0) return null;
  return (
    <View style={[badgeStyles.container, { backgroundColor: colors.error }]}>
      <Text style={[badgeStyles.text, { color: colors.text }]}>{count > 99 ? '99+' : String(count)}</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  text: {
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
    const opacity = withTiming(focusedSV.value === 1 ? 1 : 1, { duration: 150 });
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
  const pathname = usePathname();
  useNotificationsContext(); // keep context subscribed for background badge updates

  // Determine if we're inside a chat session (hidden route) → force "Чат" tab active
  const isInChatRoute = pathname.includes('/chat/');

  const tabBarHeight = 70 + (Platform.OS === 'ios' ? insets.bottom : 0);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: Typography.weights.bold, color: colors.text },
        headerShadowVisible: false,
        tabBarStyle: {
          // SVIT brand: bg surface, border-top border, height 70px
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#D0CEED',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: Typography.weights.semibold,
          includeFontPadding: false,
          letterSpacing: 0.3,
          marginTop: 3,
        },
        tabBarActiveBackgroundColor: 'transparent',
        tabBarInactiveBackgroundColor: 'transparent',
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
              // Force "focused" visual state when user is inside a chat session (hidden route)
              focused={props.focused || isInChatRoute}
              color={props.focused || isInChatRoute ? colors.primary : '#D0CEED'}
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
        options={{ href: null }}
      />
    </Tabs>
  );
}
