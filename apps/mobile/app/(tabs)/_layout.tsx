import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
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
    color: Colors.text,
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
    const scale = withSpring(focusedSV.value === 1 ? 1.15 : 1, {
      damping: 14,
      stiffness: 200,
    });
    const opacity = withTiming(focusedSV.value === 1 ? 1 : 0.75, { duration: 150 });
    const translateY = withSpring(focusedSV.value === 1 ? -1 : 0, {
      damping: 14,
      stiffness: 200,
    });
    return {
      transform: [{ scale }, { translateY }],
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

// ── Active indicator dot ──────────────────────────────────────────────────────

interface TabIndicatorProps {
  focused: boolean;
}

function TabIndicator({ focused }: TabIndicatorProps) {
  const focusedSV = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    focusedSV.value = focused ? 1 : 0;
  }, [focused, focusedSV]);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = withTiming(focusedSV.value === 1 ? 1 : 0, { duration: 200 });
    const scale = withSpring(focusedSV.value === 1 ? 1 : 0, { damping: 12, stiffness: 180 });
    const width = interpolate(scale, [0, 1], [0, 4]);
    return { opacity, transform: [{ scaleX: scale }], width };
  });

  return (
    <Animated.View
      style={[indicatorStyles.dot, animatedStyle]}
    />
  );
}

const indicatorStyles = StyleSheet.create({
  dot: {
    height: 3,
    width: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    marginTop: 3,
    alignSelf: 'center',
  },
});

// ── Combined icon + indicator ─────────────────────────────────────────────────

function TabIconWithIndicator(props: TabIconProps) {
  return (
    <View style={{ alignItems: 'center' }}>
      <TabIcon {...props} />
      <TabIndicator focused={props.focused} />
    </View>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function TabsLayout() {
  const { t } = useTranslation();
  const { unreadCount } = useNotificationsContext();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontWeight: Typography.weights.bold },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: Colors.background,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 16,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: Typography.sizes.xs,
          fontWeight: Typography.weights.medium,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.chat'),
          tabBarIcon: (props) => (
            <TabIconWithIndicator {...props} icon="chatbubble-outline" iconFocused="chatbubble" />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t('tabs.explore', { defaultValue: 'Поиск' }),
          tabBarIcon: (props) => (
            <TabIconWithIndicator {...props} icon="compass-outline" iconFocused="compass" />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t('tabs.bookings'),
          tabBarIcon: (props) => (
            <TabIconWithIndicator {...props} icon="briefcase-outline" iconFocused="briefcase" />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: t('tabs.wallet'),
          tabBarIcon: (props) => (
            <TabIconWithIndicator {...props} icon="wallet-outline" iconFocused="wallet" />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t('tabs.notifications', { defaultValue: 'Уведомления' }),
          tabBarIcon: (props) => (
            <TabIconWithIndicator
              {...props}
              icon="notifications-outline"
              iconFocused="notifications"
              badge={unreadCount}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search-history"
        options={{
          title: t('tabs.history', { defaultValue: 'История' }),
          tabBarIcon: (props) => (
            <TabIconWithIndicator {...props} icon="time-outline" iconFocused="time" />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t('tabs.favorites', { defaultValue: 'Избранное' }),
          tabBarIcon: (props) => (
            <TabIconWithIndicator {...props} icon="heart-outline" iconFocused="heart" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: (props) => (
            <TabIconWithIndicator {...props} icon="person-outline" iconFocused="person" />
          ),
        }}
      />
    </Tabs>
  );
}
