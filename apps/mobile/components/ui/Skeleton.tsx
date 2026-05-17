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
import { Colors } from '../../constants';

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
        styles.base,
        { height, borderRadius },
        width !== undefined ? { width } : styles.fullWidth,
        animatedStyle,
        style,
      ]}
    />
  );
}

// ── Preset skeletons for screens ───────────────────────────────────────────────

/** Skeleton for a flight card in bookings/explore lists */
export function SkeletonFlightCard() {
  return (
    <View style={presets.flightCard}>
      {/* Top row: badge + route */}
      <View style={presets.row}>
        <Skeleton width={60} height={22} borderRadius={11} />
        <View style={[presets.rowRight, { gap: 6 }]}>
          <Skeleton width={36} height={14} borderRadius={7} />
          <Skeleton width={16} height={12} borderRadius={6} />
          <Skeleton width={36} height={14} borderRadius={7} />
        </View>
      </View>
      {/* Airline + date */}
      <Skeleton width="55%" height={12} borderRadius={6} style={presets.mt10} />
      <Skeleton width="35%" height={12} borderRadius={6} style={presets.mt6} />
      {/* Price */}
      <View style={[presets.row, presets.mt10]}>
        <Skeleton width={90} height={18} borderRadius={9} />
        <Skeleton width={100} height={36} borderRadius={10} />
      </View>
    </View>
  );
}

/** Skeleton for a hotel card with image placeholder */
export function SkeletonHotelCard() {
  return (
    <View style={presets.hotelCard}>
      {/* Image placeholder */}
      <Skeleton width="100%" height={120} borderRadius={12} />
      {/* Content */}
      <View style={presets.hotelContent}>
        <Skeleton width="70%" height={15} borderRadius={7} />
        <Skeleton width="45%" height={12} borderRadius={6} style={presets.mt6} />
        <View style={[presets.row, presets.mt8]}>
          <Skeleton width={50} height={12} borderRadius={6} />
          <Skeleton width={80} height={18} borderRadius={9} />
        </View>
      </View>
    </View>
  );
}

/** Skeleton for a chat message bubble */
export function SkeletonChatMessage() {
  return (
    <View style={presets.chatMessage}>
      <Skeleton width={36} height={36} borderRadius={18} />
      <View style={presets.chatBubble}>
        <Skeleton width="80%" height={13} borderRadius={6} />
        <Skeleton width="60%" height={13} borderRadius={6} style={presets.mt6} />
        <Skeleton width="40%" height={10} borderRadius={5} style={presets.mt6} />
      </View>
    </View>
  );
}

/** Skeleton for a booking list item */
export function SkeletonBookingItem() {
  return (
    <View style={presets.bookingItem}>
      <View style={presets.bookingItemLeft}>
        <Skeleton width={40} height={40} borderRadius={12} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={presets.row}>
          <Skeleton width="50%" height={14} borderRadius={7} />
          <Skeleton width={60} height={20} borderRadius={10} />
        </View>
        <Skeleton width="75%" height={12} borderRadius={6} style={presets.mt8} />
        <Skeleton width="40%" height={11} borderRadius={5} style={presets.mt6} />
      </View>
    </View>
  );
}

/** Skeleton for a notification list item */
export function SkeletonNotificationItem() {
  return (
    <View style={presets.notifItem}>
      <Skeleton width={44} height={44} borderRadius={22} />
      <View style={{ flex: 1 }}>
        <View style={presets.row}>
          <Skeleton width="50%" height={13} borderRadius={6} />
          <Skeleton width={8} height={8} borderRadius={4} />
        </View>
        <Skeleton width="85%" height={12} borderRadius={6} style={presets.mt6} />
        <Skeleton width="30%" height={10} borderRadius={5} style={presets.mt6} />
      </View>
    </View>
  );
}

// ── Legacy presets kept for backward compatibility ─────────────────────────────

export function SkeletonChatRow() {
  return (
    <View style={presets.chatRow}>
      <Skeleton width={44} height={44} borderRadius={22} />
      <View style={presets.chatRowContent}>
        <Skeleton width="60%" height={14} borderRadius={7} />
        <Skeleton width="85%" height={12} borderRadius={6} style={presets.mt6} />
      </View>
    </View>
  );
}

export function SkeletonBookingCard() {
  return (
    <View style={presets.bookingCard}>
      <View style={presets.bookingHeader}>
        <Skeleton width={80} height={12} borderRadius={6} />
        <Skeleton width={60} height={20} borderRadius={10} />
      </View>
      <Skeleton width="100%" height={14} borderRadius={7} style={presets.mt10} />
      <Skeleton width="70%" height={14} borderRadius={7} style={presets.mt6} />
    </View>
  );
}

export function SkeletonWalletCard() {
  return (
    <View style={presets.walletCard}>
      <Skeleton width={120} height={14} borderRadius={7} />
      <Skeleton width={180} height={52} borderRadius={10} style={presets.mt12} />
    </View>
  );
}

export function SkeletonNotificationRow() {
  return (
    <View style={presets.notifRow}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={presets.notifRowContent}>
        <Skeleton width="50%" height={13} borderRadius={6} />
        <Skeleton width="85%" height={12} borderRadius={6} style={presets.mt6} />
        <Skeleton width="30%" height={10} borderRadius={5} style={presets.mt6} />
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.elevated,
  },
  fullWidth: {
    width: '100%',
  },
});

const presets = StyleSheet.create({
  // SkeletonFlightCard
  flightCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
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
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
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
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 12,
  },
  // SkeletonBookingItem
  bookingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
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
    borderBottomColor: Colors.border,
    gap: 12,
  },
  // Legacy
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  chatRowContent: {
    flex: 1,
    marginLeft: 12,
  },
  bookingCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
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
    borderBottomColor: Colors.border,
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
