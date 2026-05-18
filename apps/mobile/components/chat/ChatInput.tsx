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
  /** Reply-to message preview */
  replyTo?: { id: string; role: string; content: string } | null;
  /** Called when user cancels the reply */
  onCancelReply?: () => void;
}

export const ChatInput = forwardRef<ChatInputHandle, Props>(function ChatInput(
  { onSend, disabled = false, initialMessage, suggestions = [], onSuggestionSelect, replyTo, onCancelReply },
  ref,
) {
  const [text, setText] = useState(initialMessage ?? '');

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

  function handleSuggestionSelect(suggestion: string) {
    setText(suggestion);
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion);
    }
  }

  const hasText = text.trim().length > 0;

  return (
    <View>
      {/* Reply-to preview */}
      {replyTo && (
        <View style={replyStyles.container}>
          <View style={replyStyles.bar} />
          <View style={{ flex: 1 }}>
            <Text style={replyStyles.label}>{replyTo.role === 'user' ? 'Вы' : 'TravelAI'}</Text>
            <Text style={replyStyles.text} numberOfLines={2}>{replyTo.content}</Text>
          </View>
          <TouchableOpacity onPress={onCancelReply} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Contextual suggestions */}
      {suggestions.length > 0 && (
        <ChatSuggestions
          suggestions={suggestions}
          onSelect={handleSuggestionSelect}
        />
      )}

      {/* Input row */}
      <View style={styles.container}>
        {/* Text input — pill shape */}
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Куда хотите полететь?..."
          placeholderTextColor={Colors.textMuted}
          style={styles.input}
          multiline
          maxLength={2000}
          editable={!disabled}
          returnKeyType="default"
          blurOnSubmit={false}
        />

        {/* Send button — always amber circle */}
        <Animated.View style={{ transform: [{ scale: sendScale }] }}>
          <TouchableOpacity
            onPress={hasText ? handleSend : handleVoice}
            disabled={disabled && hasText}
            style={[
              styles.sendButton,
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
                color={Colors.textInverse}
              />
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

    </View>
  );
});

const replyStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 10,
  },
  bar: {
    width: 3,
    height: 36,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  label: {
    color: Colors.primary,
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  text: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: 12,
    lineHeight: 16,
  },
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 10,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 10,
    ...Platform.select({
      ios: {
        paddingBottom: 10,
      },
    }),
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
  sendButtonDisabled: {
    backgroundColor: Colors.primaryDark,
    opacity: 0.65,
    shadowOpacity: 0,
    elevation: 0,
  },
});
