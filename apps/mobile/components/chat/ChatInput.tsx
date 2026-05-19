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
import { LinearGradient } from 'expo-linear-gradient';
import { Typography } from '../../constants/typography';
import { Ionicons } from '@expo/vector-icons';
import { ChatSuggestions } from './ChatSuggestions';
import { useTheme } from '../../src/theme/ThemeContext';

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
  const { colors } = useTheme();
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

  function handleAttach() {
    Alert.alert(
      'Прикрепить',
      'Выберите тип вложения',
      [
        { text: '📷 Сфотографировать', onPress: () => handlePickMedia('camera') },
        { text: '🖼️ Из галереи', onPress: () => handlePickMedia('gallery') },
        { text: '📄 Документ', onPress: () => Alert.alert('Документы', 'Скоро будет доступно') },
        { text: 'Отмена', style: 'cancel' },
      ],
    );
  }

  async function handlePickMedia(source: 'camera' | 'gallery') {
    try {
      const ImagePicker = await import('expo-image-picker');
      let result;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (perm.status !== 'granted') {
          Alert.alert('Нет доступа', 'Разрешите доступ к камере в настройках');
          return;
        }
        result = await ImagePicker.launchCameraAsync({ base64: false, quality: 0.8 });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (perm.status !== 'granted') {
          Alert.alert('Нет доступа', 'Разрешите доступ к фото в настройках');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({ base64: false, quality: 0.8 });
      }
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        onSend(`[Изображение: ${uri}]`);
      }
    } catch {
      Alert.alert('Ошибка', 'Не удалось открыть галерею. Попробуйте ещё раз.');
    }
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
        <View style={[replyStyles.container, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={[replyStyles.bar, { backgroundColor: colors.primary }]} />
          <View style={{ flex: 1 }}>
            <Text style={[replyStyles.label, { color: colors.primary }]}>{replyTo.role === 'user' ? 'Вы' : 'TravelAI'}</Text>
            <Text style={[replyStyles.text, { color: colors.textMuted }]} numberOfLines={2}>{replyTo.content}</Text>
          </View>
          <TouchableOpacity onPress={onCancelReply} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={18} color={colors.textMuted} />
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
      <View style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {/* Attach button */}
        <TouchableOpacity
          style={[styles.attachBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleAttach}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={22} color={colors.primary} />
        </TouchableOpacity>

        {/* Text input — pill shape */}
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Куда хотите полететь?..."
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          multiline
          maxLength={2000}
          editable={!disabled}
          returnKeyType="default"
          blurOnSubmit={false}
        />

        {/* Send button — gradient circle */}
        <Animated.View style={[styles.sendButtonWrap, { transform: [{ scale: sendScale }] }]}>
          <TouchableOpacity
            onPress={hasText ? handleSend : handleVoice}
            disabled={disabled && hasText}
            activeOpacity={0.8}
            style={disabled && hasText ? styles.sendButtonDisabledWrap : undefined}
          >
            <LinearGradient
              colors={['#F59E0B', '#14B8A6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sendButton}
            >
              {disabled && hasText ? (
                <ActivityIndicator size="small" color="#0A0A14" />
              ) : (
                <Ionicons
                  name={hasText ? 'arrow-up' : 'mic'}
                  size={18}
                  color="#0A0A14"
                />
              )}
            </LinearGradient>
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
    borderTopWidth: 1,
    gap: 10,
  },
  bar: {
    width: 3,
    height: 36,
    borderRadius: 2,
  },
  label: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  text: {
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
    borderTopWidth: 1,
    gap: 10,
    ...Platform.select({
      ios: {
        paddingBottom: 10,
      },
    }),
  },
  input: {
    flex: 1,
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 10,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    maxHeight: 120,
    borderWidth: 1,
  },
  sendButtonWrap: {
    flexShrink: 0,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabledWrap: {
    opacity: 0.65,
  },
  attachBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
