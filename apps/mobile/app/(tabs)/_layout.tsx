import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../../constants';
import { Typography } from '../../constants/typography';
import { useTranslation } from 'react-i18next';
import { useNotificationsContext } from '../../context/NotificationsContext';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

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
    backgroundColor: Colors.error,
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
  icon: IoniconName;
  iconFocused: IoniconName;
  badge?: number;
}

function TabIcon({ focused, color, size, icon, iconFocused, badge }: TabIconProps) {
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
    <Animated.View style={[{ position: 'relative' }, animatedStyle]}>
      <Ionicons name={focused ? iconFocused : icon} size={size} color={color} />
      {badge !== undefined && <TabBadge count={badge} />}
    </Animated.View>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function TabsLayout() {
  const { t } = useTranslation();
  useNotificationsContext(); // keep context subscribed for background badge updates

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontWeight: Typography.weights.bold },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.divider,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: Typography.weights.medium,
          includeFontPadding: false,
          letterSpacing: 0,
        },
        tabBarItemStyle: {
          paddingHorizontal: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          headerShown: false,
          tabBarLabel: () => null,
          tabBarIcon: (props) => (
            <TabIcon {...props} icon="arrow-back-outline" iconFocused="arrow-back" />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t('tabs.bookings'),
          headerShown: false,
          tabBarIcon: (props) => (
            <TabIcon {...props} icon="calendar-outline" iconFocused="calendar" />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: t('tabs.wallet'),
          headerShown: false,
          tabBarIcon: (props) => (
            <TabIcon {...props} icon="wallet-outline" iconFocused="wallet" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          headerShown: false,
          tabBarIcon: (props) => (
            <TabIcon {...props} icon="person-outline" iconFocused="person" />
          ),
        }}
      />
      {/* Hidden tabs — kept for routing but not shown in tab bar */}
      <Tabs.Screen
        name="explore"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="search-history"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="favorites"
        options={{ href: null }}
      />
    </Tabs>
  );
}
