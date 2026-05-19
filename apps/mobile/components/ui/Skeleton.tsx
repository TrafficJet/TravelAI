import React, { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useTheme } from '../../src/theme/ThemeContext';

// ── Base Skeleton with shimmer ─────────────────────────────────────────────────

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width,
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const { colors } = useTheme();
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1200 }),
      -1,
      true,
    );
  }, [shimmer]);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      shimmer.value,
      [0, 0.5, 1],
      [0.4, 0.8, 0.4],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  return (
    <Animated.View
      style={[
        { backgroundColor: colors.card, height, borderRadius },
        width !== undefined ? { width } : { width: '100%' },
        animatedStyle,
        style,
      ]}
    />
  );
}

// ── Preset skeletons for screens ───────────────────────────────────────────────

/** Skeleton for a flight card in bookings/explore lists */
export function SkeletonFlightCard() {
  const { colors } = useTheme();
  return (
    <View style={[presetStyles.flightCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Top row: badge + route */}
      <View style={presetStyles.row}>
        <Skeleton width={60} height={22} borderRadius={11} />
        <View style={[presetStyles.rowRight, { gap: 6 }]}>
          <Skeleton width={36} height={14} borderRadius={7} />
          <Skeleton width={16} height={12} borderRadius={6} />
          <Skeleton width={36} height={14} borderRadius={7} />
        </View>
      </View>
      {/* Airline + date */}
      <Skeleton width="55%" height={12} borderRadius={6} style={presetStyles.mt10} />
      <Skeleton width="35%" height={12} borderRadius={6} style={presetStyles.mt6} />
      {/* Price */}
      <View style={[presetStyles.row, presetStyles.mt10]}>
        <Skeleton width={90} height={18} borderRadius={9} />
        <Skeleton width={100} height={36} borderRadius={10} />
      </View>
    </View>
  );
}

/** Skeleton for a hotel card with image placeholder */
export function SkeletonHotelCard() {
  const { colors } = useTheme();
  return (
    <View style={[presetStyles.hotelCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Image placeholder */}
      <Skeleton width="100%" height={120} borderRadius={12} />
      {/* Content */}
      <View style={presetStyles.hotelContent}>
        <Skeleton width="70%" height={15} borderRadius={7} />
        <Skeleton width="45%" height={12} borderRadius={6} style={presetStyles.mt6} />
        <View style={[presetStyles.row, presetStyles.mt8]}>
          <Skeleton width={50} height={12} borderRadius={6} />
          <Skeleton width={80} height={18} borderRadius={9} />
        </View>
      </View>
    </View>
  );
}

/** Skeleton for a chat message bubble */
export function SkeletonChatMessage() {
  const { colors } = useTheme();
  return (
    <View style={presetStyles.chatMessage}>
      <Skeleton width={36} height={36} borderRadius={18} />
      <View style={[presetStyles.chatBubble, { backgroundColor: colors.surface }]}>
        <Skeleton width="80%" height={13} borderRadius={6} />
        <Skeleton width="60%" height={13} borderRadius={6} style={presetStyles.mt6} />
        <Skeleton width="40%" height={10} borderRadius={5} style={presetStyles.mt6} />
      </View>
    </View>
  );
}

/** Skeleton for a booking list item */
export function SkeletonBookingItem() {
  const { colors } = useTheme();
  return (
    <View style={[presetStyles.bookingItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={presetStyles.bookingItemLeft}>
        <Skeleton width={40} height={40} borderRadius={12} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={presetStyles.row}>
          <Skeleton width="50%" height={14} borderRadius={7} />
          <Skeleton width={60} height={20} borderRadius={10} />
        </View>
        <Skeleton width="75%" height={12} borderRadius={6} style={presetStyles.mt8} />
        <Skeleton width="40%" height={11} borderRadius={5} style={presetStyles.mt6} />
      </View>
    </View>
  );
}

/** Skeleton for a notification list item */
export function SkeletonNotificationItem() {
  const { colors } = useTheme();
  return (
    <View style={[presetStyles.notifItem, { borderBottomColor: colors.border }]}>
      <Skeleton width={44} height={44} borderRadius={22} />
      <View style={{ flex: 1 }}>
        <View style={presetStyles.row}>
          <Skeleton width="50%" height={13} borderRadius={6} />
          <Skeleton width={8} height={8} borderRadius={4} />
        </View>
        <Skeleton width="85%" height={12} borderRadius={6} style={presetStyles.mt6} />
        <Skeleton width="30%" height={10} borderRadius={5} style={presetStyles.mt6} />
      </View>
    </View>
  );
}

// ── Legacy presets kept for backward compatibility ─────────────────────────────

export function SkeletonChatRow() {
  const { colors } = useTheme();
  return (
    <View style={[presetStyles.chatRow, { borderBottomColor: colors.border }]}>
      <Skeleton width={44} height={44} borderRadius={22} />
      <View style={presetStyles.chatRowContent}>
        <Skeleton width="60%" height={14} borderRadius={7} />
        <Skeleton width="85%" height={12} borderRadius={6} style={presetStyles.mt6} />
      </View>
    </View>
  );
}

export function SkeletonBookingCard() {
  const { colors } = useTheme();
  return (
    <View style={[presetStyles.bookingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={presetStyles.bookingHeader}>
        <Skeleton width={80} height={12} borderRadius={6} />
        <Skeleton width={60} height={20} borderRadius={10} />
      </View>
      <Skeleton width="100%" height={14} borderRadius={7} style={presetStyles.mt10} />
      <Skeleton width="70%" height={14} borderRadius={7} style={presetStyles.mt6} />
    </View>
  );
}

export function SkeletonWalletCard() {
  return (
    <View style={presetStyles.walletCard}>
      <Skeleton width={120} height={14} borderRadius={7} />
      <Skeleton width={180} height={52} borderRadius={10} style={presetStyles.mt12} />
    </View>
  );
}

export function SkeletonNotificationRow() {
  const { colors } = useTheme();
  return (
    <View style={[presetStyles.notifRow, { borderBottomColor: colors.border }]}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={presetStyles.notifRowContent}>
        <Skeleton width="50%" height={13} borderRadius={6} />
        <Skeleton width="85%" height={12} borderRadius={6} style={presetStyles.mt6} />
        <Skeleton width="30%" height={10} borderRadius={5} style={presetStyles.mt6} />
      </View>
    </View>
  );
}

// ── Static layout styles (no color tokens) ─────────────────────────────────────

const presetStyles = StyleSheet.create({
  // SkeletonFlightCard
  flightCard: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // SkeletonHotelCard
  hotelCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  hotelContent: {
    padding: 12,
  },
  // SkeletonChatMessage
  chatMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  chatBubble: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
  },
  // SkeletonBookingItem
  bookingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
  },
  bookingItemLeft: {
    flexShrink: 0,
  },
  // SkeletonNotificationItem
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  // Legacy
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  chatRowContent: {
    flex: 1,
    marginLeft: 12,
  },
  bookingCard: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletCard: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  notifRowContent: {
    flex: 1,
    marginLeft: 12,
  },
  mt6: { marginTop: 6 },
  mt8: { marginTop: 8 },
  mt10: { marginTop: 10 },
  mt12: { marginTop: 12 },
});
