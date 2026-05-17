import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Ionicons } from '@expo/vector-icons';

export interface ChatInputHandle {
  /** Programmatically set input text without sending */
  setValue: (text: string) => void;
  /** Programmatically send the current text (or a given string) */
  send: (text?: string) => void;
}

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  /** When provided, pre-fills the input on mount */
  initialMessage?: string;
}

export const ChatInput = forwardRef<ChatInputHandle, Props>(function ChatInput(
  { onSend, disabled = false, initialMessage },
  ref,
) {
  const [text, setText] = useState(initialMessage ?? '');

  // Sync if initialMessage changes (e.g. navigation params update)
  useEffect(() => {
    if (initialMessage) {
      setText(initialMessage);
    }
  }, [initialMessage]);

  useImperativeHandle(ref, () => ({
    setValue: (value: string) => setText(value),
    send: (value?: string) => {
      const trimmed = (value ?? text).trim();
      if (!trimmed) return;
      onSend(trimmed);
      setText('');
    },
  }));

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(trimmed);
    setText('');
  }

  return (
    <View style={styles.container}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Найдите рейс или отель..."
        placeholderTextColor={Colors.textMuted}
        style={styles.input}
        multiline
        maxLength={2000}
        editable={!disabled}
        returnKeyType="default"
        blurOnSubmit={false}
      />
      <TouchableOpacity
        onPress={handleSend}
        disabled={disabled || !text.trim()}
        style={[
          styles.sendButton,
          (disabled || !text.trim()) && styles.sendButtonDisabled,
        ]}
        activeOpacity={0.8}
      >
        <Ionicons name="send" size={20} color={Colors.textInverse} />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Platform.select({
      ios: {
        paddingBottom: 24,
      },
    }),
  },
  input: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 10,
    color: Colors.text,
    fontSize: Typography.sizes.base,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
