import React from 'react';
import {
  Text,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors, Spacing, Radius, TextPresets } from '../../constants';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

interface ButtonProps extends PressableProps {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  title,
  variant = 'primary',
  loading = false,
  fullWidth = false,
  disabled,
  style,
  onPress,
  onPressIn,
  onPressOut,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    if (isDisabled) return;
    scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
    onPressIn?.({} as Parameters<NonNullable<typeof onPressIn>>[0]);
  }

  function handlePressOut() {
    scale.value = withSpring(1, { damping: 12, stiffness: 300 });
    onPressOut?.({} as Parameters<NonNullable<typeof onPressOut>>[0]);
  }

  const activityIndicatorColor =
    variant === 'primary' || variant === 'destructive' ? Colors.textInverse : Colors.primary;

  return (
    <AnimatedPressable
      {...rest}
      disabled={isDisabled}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        animatedStyle,
        styles.base,
        fullWidth && styles.fullWidth,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        variant === 'destructive' && styles.destructive,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={activityIndicatorColor} size="small" />
      ) : (
        <Text
          style={[
            styles.text,
            variant === 'primary' && styles.textPrimary,
            variant === 'secondary' && styles.textSecondary,
            variant === 'ghost' && styles.textGhost,
            variant === 'destructive' && styles.textDestructive,
          ]}
        >
          {title}
        </Text>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Spacing.buttonHeight,
  },
  fullWidth: {
    width: '100%',
  },
  primary: {
    backgroundColor: Colors.primary,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 16,
    shadowOpacity: 0.25,
    elevation: 8,
  },
  secondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  destructive: {
    backgroundColor: Colors.error,
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    ...TextPresets.button,
    color: Colors.textInverse,
  },
  textPrimary: {
    color: Colors.textInverse,
  },
  textSecondary: {
    color: Colors.primary,
  },
  textGhost: {
    color: Colors.primary,
  },
  textDestructive: {
    color: Colors.textInverse,
  },
});
