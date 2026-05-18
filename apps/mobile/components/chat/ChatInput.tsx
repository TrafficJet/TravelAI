import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useRef,
} from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Animated,
  Text,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Ionicons } from '@expo/vector-icons';
import { ChatSuggestions } from './ChatSuggestions';
import { VoiceCallButton } from './VoiceCallButton';
import { useAuthStore } from '../../stores/authStore';

export interface ChatInputHandle {
  /** Programmatically set input text without sending */
  setValue: (text: string) => void;
  /** Alias for setValue — fills the input field with the given text */
  setText: (text: string) => void;
  /** Programmatically send the current text (or a given string) */
  send: (text?: string) => void;
}

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  /** When provided, pre-fills the input on mount */
  initialMessage?: string;
  /** Contextual suggestions shown above the input */
  suggestions?: string[];
  /** Called when user taps a suggestion chip */
  onSuggestionSelect?: (suggestion: string) => void;
}

// Quick-hint chips shown below the input when it is empty
const QUICK_HINTS = [
  { label: '✈️ Рейс', key: 'flight' },
  { label: '🏨 Отель', key: 'hotel' },
] as const;

export const ChatInput = forwardRef<ChatInputHandle, Props>(function ChatInput(
  { onSend, disabled = false, initialMessage, suggestions = [], onSuggestionSelect },
  ref,
) {
  const [text, setText] = useState(initialMessage ?? '');

  const user = useAuthStore((s) => s.user);
  const isPremium = user?.subscription?.plan === 'PREMIUM';

  // Scale animation for send button
  const sendScale = useRef(new Animated.Value(1)).current;

  // Sync if initialMessage changes (e.g. navigation params update)
  useEffect(() => {
    if (initialMessage) {
      setText(initialMessage);
    }
  }, [initialMessage]);

  useImperativeHandle(ref, () => ({
    setValue: (value: string) => setText(value),
    setText: (value: string) => setText(value),
    send: (value?: string) => {
      const trimmed = (value ?? text).trim();
      if (!trimmed) return;
      onSend(trimmed);
      setText('');
    },
  }));

  function animateSend(onComplete: () => void) {
    Animated.sequence([
      Animated.timing(sendScale, {
        toValue: 0.9,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(sendScale, {
        toValue: 1.0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => onComplete());
  }

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateSend(() => {
      onSend(trimmed);
      setText('');
    });
  }

  function handleVoice() {
    Alert.alert('Голосовой ввод', 'Скоро будет доступен');
  }

  function handleAttachment() {
    Alert.alert('Вложение', 'Выберите тип', [
      {
        text: 'Фото маршрута',
        onPress: () => Alert.alert('Фото маршрута', 'Скоро будет доступно'),
      },
      {
        text: 'Документ',
        onPress: () => Alert.alert('Документ', 'Скоро будет доступно'),
      },
      {
        text: 'Локация',
        onPress: () => Alert.alert('Локация', 'Скоро будет доступно'),
      },
      { text: 'Отмена', style: 'cancel' },
    ]);
  }

  function handleSuggestionSelect(suggestion: string) {
    setText(suggestion);
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion);
    }
  }

  function handleQuickHint(key: string) {
    Alert.alert('В разработке', `Быстрый поиск "${key}" скоро будет доступен`);
  }

  const hasText = text.trim().length > 0;
  const sendDisabled = disabled || !hasText;

  return (
    <View>
      {/* Contextual suggestions */}
      {suggestions.length > 0 && (
        <ChatSuggestions
          suggestions={suggestions}
          onSelect={handleSuggestionSelect}
        />
      )}

      {/* Input row */}
      <View style={styles.container}>
        {/* Mic button — visible only when no text */}
        {!hasText && (
          <TouchableOpacity
            onPress={handleVoice}
            style={styles.iconButton}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="mic-outline" size={22} color={Colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* AI Voice Call — premium only, visible when no text */}
        {!hasText && isPremium && (
          <VoiceCallButton size={40} />
        )}

        {/* Text input — pill shape */}
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Куда хотите полететь?..."
          placeholderTextColor={Colors.textMuted}
          style={[styles.input, !hasText && styles.inputWithVoice]}
          multiline
          maxLength={2000}
          editable={!disabled}
          returnKeyType="default"
          blurOnSubmit={false}
        />

        {/* Attachment button */}
        <TouchableOpacity
          onPress={handleAttachment}
          style={styles.iconButton}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="add-outline" size={22} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Send button — amber arrow when has text, spinner when streaming, muted when empty */}
        <Animated.View style={{ transform: [{ scale: sendScale }] }}>
          <TouchableOpacity
            onPress={hasText ? handleSend : handleVoice}
            disabled={disabled}
            style={[
              styles.sendButton,
              !hasText && styles.sendButtonEmpty,
              disabled && hasText && styles.sendButtonDisabled,
            ]}
            activeOpacity={0.8}
          >
            {disabled && hasText ? (
              <ActivityIndicator size="small" color={Colors.textInverse} />
            ) : (
              <Ionicons
                name={hasText ? 'arrow-up' : 'mic'}
                size={18}
                color={hasText ? Colors.textInverse : Colors.textMuted}
              />
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Quick hint chips — shown only when input is empty */}
      {!hasText && (
        <View style={styles.hintsRow}>
          {QUICK_HINTS.map((hint) => (
            <TouchableOpacity
              key={hint.key}
              style={styles.hintChip}
              onPress={() => handleQuickHint(hint.key)}
              activeOpacity={0.75}
            >
              <Text style={styles.hintChipText}>{hint.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingTop: 10,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
    ...Platform.select({
      ios: {
        paddingBottom: 10,
      },
    }),
  },
  iconButton: {
    width: 36,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 10,
    color: Colors.text,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputWithVoice: {
    // no additional style needed, just a semantic alias
  },
  sendButton: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  sendButtonEmpty: {
    backgroundColor: Colors.card,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonDisabled: {
    // Use primaryDark so the button stays visually amber but clearly dimmed
    backgroundColor: Colors.primaryDark,
    opacity: 0.65,
    shadowOpacity: 0,
    elevation: 0,
  },
  // Quick hint chips
  hintsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: Colors.surface,
    ...Platform.select({
      ios: {
        paddingBottom: 20,
      },
    }),
  },
  hintChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  hintChipText: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    fontWeight: '500',
  },
});
