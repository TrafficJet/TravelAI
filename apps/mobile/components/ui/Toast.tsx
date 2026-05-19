import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/ThemeContext';
import { toast, ToastConfig, ToastType } from '../../lib/toast';

const TOAST_DURATION = 3000;
const ANIMATION_DURATION = 350;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ToastItemProps {
  config: ToastConfig;
  onHide: (id: string) => void;
  bottomOffset: number;
}

function ToastItem({ config, onHide, bottomOffset }: ToastItemProps) {
  const { colors } = useTheme();

  const TYPE_CONFIG: Record<
    ToastType,
    {
      bg: string;
      borderColor: string;
      iconColor: string;
      textColor: string;
      icon: React.ComponentProps<typeof Ionicons>['name'];
    }
  > = {
    success: {
      bg: 'rgba(16,185,129,0.15)',
      borderColor: colors.success,
      iconColor: colors.success,
      textColor: colors.text,
      icon: 'checkmark-circle',
    },
    error: {
      bg: 'rgba(244,63,94,0.15)',
      borderColor: colors.error,
      iconColor: colors.error,
      textColor: colors.text,
      icon: 'close-circle',
    },
    info: {
      bg: `${colors.primary}26`,
      borderColor: colors.primary,
      iconColor: colors.primary,
      textColor: colors.text,
      icon: 'information-circle',
    },
    warning: {
      bg: 'rgba(245,158,11,0.15)',
      borderColor: colors.warning,
      iconColor: colors.warning,
      textColor: colors.text,
      icon: 'warning',
    },
  };

  const translateY = useRef(new Animated.Value(120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 120,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => onHide(config.id));
  }, [translateY, opacity, onHide, config.id]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 15,
        stiffness: 180,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    timeoutRef.current = setTimeout(hide, TOAST_DURATION);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [hide, translateY, opacity]);

  const { bg, borderColor, icon, iconColor, textColor } = TYPE_CONFIG[config.type];

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: bg,
          borderColor,
          bottom: bottomOffset,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <Ionicons name={icon} size={20} color={iconColor} style={styles.icon} />
      <Text style={[styles.message, { color: textColor }]} numberOfLines={3}>
        {config.message}
      </Text>
    </Animated.View>
  );
}

export function ToastContainer() {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastConfig[]>([]);

  useEffect(() => {
    const unsubscribe = toast.subscribe((config: ToastConfig) => {
      setToasts((prev) => [...prev.slice(-2), config]);
    });
    return unsubscribe;
  }, []);

  const handleHide = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const TAB_BAR_HEIGHT = 80;
  const bottomOffset = TAB_BAR_HEIGHT + insets.bottom + 12;

  return (
    <>
      {toasts.map((t) => (
        <ToastItem
          key={t.id}
          config={t}
          onHide={handleHide}
          bottomOffset={bottomOffset}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    maxWidth: SCREEN_WIDTH - 32,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  icon: {
    marginRight: 10,
    flexShrink: 0,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    flex: 1,
  },
});
