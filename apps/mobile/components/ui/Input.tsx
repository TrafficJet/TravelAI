import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Spacing, Radius, TextPresets } from '../../constants';
import { useTheme } from '../../src/theme/ThemeContext';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, secureTextEntry, style, onFocus, onBlur, ...rest }: InputProps) {
  const { colors } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isPassword = secureTextEntry === true;

  function handleFocus(e: Parameters<NonNullable<TextInputProps['onFocus']>>[0]) {
    setIsFocused(true);
    onFocus?.(e);
  }

  function handleBlur(e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) {
    setIsFocused(false);
    onBlur?.(e);
  }

  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    label: {
      color: colors.text,
      ...TextPresets.bodyMedium,
      marginBottom: 6,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: Radius.input,
      borderWidth: 1.5,
      borderColor: colors.border,
      minHeight: Spacing.inputHeight,
    },
    inputFocused: {
      borderColor: colors.primary,
      borderWidth: 1.5,
    },
    inputError: {
      borderColor: colors.error,
    },
    input: {
      flex: 1,
      color: colors.text,
      ...TextPresets.body,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    inputWithIcon: {
      paddingRight: 0,
    },
    eyeButton: {
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    eyeText: {
      color: colors.textMuted,
      fontFamily: 'Inter',
      fontSize: 13,
    },
    errorText: {
      color: colors.error,
      fontFamily: 'Inter',
      fontSize: 12,
      marginTop: 4,
    },
  }), [colors]);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputFocused,
          error ? styles.inputError : null,
        ]}
      >
        <TextInput
          {...rest}
          secureTextEntry={isPassword && !isVisible}
          style={[styles.input, isPassword && styles.inputWithIcon, style]}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setIsVisible((v) => !v)}
            style={styles.eyeButton}
          >
            <Text style={styles.eyeText}>{isVisible ? 'Скрыть' : 'Показать'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}
